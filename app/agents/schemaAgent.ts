import OpenAI from "openai";
import { ChatCompletionMessageParam, ChatCompletionContentPart } from "openai/resources/chat";
import { APIError } from "openai";
import { tools } from "./tools";
import {
  get_files_list,
  get_file_content_low_level,
  get_file_size,
  understand_schema,
} from "./execute";

export const systemMessage = `You are a Schema Discovery Agent that helps users understand file structures.

Process:
1. First, list all available files in the directory
2. Ask the user which file they want to analyze
3. For the selected file:
   - Check the file size first
   - Read the file in small chunks (prefer byte-based reading for large files)
   - Analyze each chunk to build understanding of the schema
   - Continue reading until you have a complete schema understanding
   - Present the discovered schema to the user

You have these tools:
- get_files_list: Lists all files in the directory
- get_file_size: Gets the size of a specific file
- get_file_content_low_level: Reads file content in chunks (by bytes or lines)
- understand_schema: Analyzes content to determine schema
- ask_human: Ask a question to the human user and get their response

When analyzing:
- Start with small chunks
- Build schema understanding incrementally
- Request more content if needed
- Consider file size when deciding chunk sizes
- Adapt reading strategy based on file type and size
- Present the final schema to user in json with explanation
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
      callback(stepInfo);

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