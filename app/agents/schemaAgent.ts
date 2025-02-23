import OpenAI from "openai";
import { ChatCompletionMessageParam, ChatCompletionContentPart } from "openai/resources/chat";
import { tools } from "./tools";
import {
  get_files_list,
  get_file_content_low_level,
  get_file_size,
  understand_schema,
  display_file_content,
  analyze_file_content,
  merge_data,
} from "./execute";

export const systemMessage = `You are a Schema Discovery Agent that helps users understand file structures.

Process:
1. Introduce yourself to the user and tell them you are a Schema Discovery Agent your purpose is to help them understand the file structure of the files in the directory.
2. Ask user what he wants to do and tell him the options.
3. If user wants to analyze a file, list all available files in the directory
4. Ask the user which file they want to analyze
5. For the selected file:
   - Check the file size first
   - Read the file in small chunks (prefer byte-based reading for large files)
   - Use understand_schema to determine the file's schema
   - Once you have the schema, use analyze_file_content to:
     * Pass both the filename and discovered schema
     * Get detailed analysis of how the content matches the schema
     * Understand any deviations or anomalies
   - Present both the schema and analysis results to the user
   - Optionally display specific content sections if needed

You have these tools:
- get_files_list: Lists all files in the directory
- get_file_size: Gets the size of a specific file
- get_file_content_low_level: Reads file content in chunks (by bytes or lines)
- understand_schema: Analyzes content to determine schema
- analyze_file_content: Takes a filename and schema, provides detailed analysis of how the content matches the schema
- display_file_content: Displays file content with key data points
- merge_data: Intelligently merges two data files by:
  1. First analyzing and understanding both files' schemas
  2. Identifying potential matching fields between the schemas
  3. Using GPT-4 to intelligently merge the data based on:
     - Schema compatibility
     - Content format and structure
     - Common fields or relationships
     - Data types and formats
  4. Returns either merged data or explanation why merge isn't possible
- ask_human: Ask a question to the human user and get their response

When using merge_data:
1. First use understand_schema on both files to get their schemas
2. Then use get_file_content_low_level to get the content
3. Pass both schemas and contents to merge_data
4. Review the merge results or error message

When analyzing:
- First discover the schema using understand_schema
- Then use analyze_file_content with the discovered schema to get deeper insights
- Consider file size when deciding chunk sizes
- Present both schema and analysis results in a clear format
- Use markdown to send messages to a user
`;

export async function runSchemaDiscoveryAgent(
  initialMessage: string,
  openai: OpenAI,
  currentMessages: ChatCompletionMessageParam[],
  callback: (stepInfo: string) => void
): Promise<string | null> {
  console.log("\n🤖 Starting Schema Discovery Agent...\n");

  try {
    // Add user message to conversation
    currentMessages.push({ role: "user", content: initialMessage });

    let step = 0;
    while (step < 5) {
      const stepInfo = `\n📍 Step ${step + 1}: Sending messages to OpenAI:\n${JSON.stringify(currentMessages, null, 2)}\n`;
      console.log(stepInfo);
      // callback(stepInfo);

      // Get completion from OpenAI
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: currentMessages,
        tools,
        tool_choice: "auto",
      });

      const assistantMessage = completion.choices[0].message;
      const assistantInfo = `🤖 Assistant Response:\n${JSON.stringify(assistantMessage, null, 2)}\n`;
      console.log(assistantInfo);
      callback(assistantInfo);
      currentMessages.push(assistantMessage);

      // Process tool calls if present
      if (assistantMessage.tool_calls) {
        for (const toolCall of assistantMessage.tool_calls) {
          try {
            const toolInfo = `🔧 Executing Tool: ${toolCall.function.name}\nArguments: ${toolCall.function.arguments}\n`;
            console.log(toolInfo);
            callback(toolInfo);

            const args = JSON.parse(toolCall.function.arguments);
            let result;

            switch (toolCall.function.name) {
              case "get_files_list":
                result = await get_files_list(args.folder);
                break;
              case "get_file_size":
                result = await get_file_size(args.filename);
                break;
              case "get_file_content_low_level":
                result = await get_file_content_low_level(args.filename, {
                  byte_start: args.byte_start,
                  byte_length: args.byte_length,
                  start_line: args.start_line,
                  num_lines: args.num_lines,
                });
                break;
              case "understand_schema":
                result = await understand_schema(args.content, args.file_type);
                break;
              case "display_file_content":
                result = await display_file_content(args.filename, args.data_points);
                break;
              case "analyze_file_content":
                result = await analyze_file_content(args.filename, args.schema);
                break;
              case "merge_data":
                result = await merge_data(
                  args.file1,
                  args.file2,
                  args.schema1,
                  args.schema2,
                  args.content1,
                  args.content2
                );
                break;
              case "ask_human":
                currentMessages.push({
                  role: "tool",
                  tool_call_id: toolCall.id,
                  content: JSON.stringify({ response: "pending" }),
                });
                return args.message;
            }

            const resultInfo = `✅ Tool ${toolCall.function.name} executed successfully\nResponse: ${JSON.stringify(result, null, 2)}\n`;
            console.log(resultInfo);
            callback(resultInfo);
            currentMessages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify(result),
            });
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
            const errorInfo = `❌ Error executing tool ${toolCall.function.name}: ${errorMessage}\n`;
            console.error(errorInfo);
            callback(errorInfo);
            currentMessages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify({
                error: errorMessage,
                details: error instanceof Error ? error.stack : undefined,
              }),
            });
          }
        }
      } else if (step > 1 && assistantMessage.content) {
        const content =
          typeof assistantMessage.content === "string"
            ? assistantMessage.content
            : (assistantMessage.content as ChatCompletionContentPart[])[0]
              .type === "text"
              ? (
                assistantMessage.content as ChatCompletionContentPart & {
                  text: string;
                }
              ).text
              : JSON.stringify(assistantMessage.content[0]);
        return content;
      }
      step++;
    }
    return null;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    const errorInfo = `❌ OpenAI Agent test failed: ${errorMessage}\n`;
    console.error(errorInfo);
    callback(errorInfo);
    return null;
  }
} 