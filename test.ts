import "dotenv/config";
import OpenAI from "openai";
import { ChatCompletionMessageParam, ChatCompletionContentPart } from "openai/resources/chat";
import { APIError } from "openai";
import { tools } from "./app/agents/tools";
import {
  get_files_list,
  get_file_content_low_level,
  get_file_size,
  understand_schema,
} from "./app/agents/execute";
import readline from "readline";

// Validate environment variables
if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_KEY environment variable is required");
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (prompt: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
};

async function getUserInput(prompt: string): Promise<string> {
  let input = "";
  while (!input.trim()) {
    // Keep asking until we get non-empty input
    input = await question(prompt);
    if (!input.trim()) {
      console.log("Please enter a valid message.");
    }
  }
  console.log("\n🎯 User Message:", input, "\n");
  return input;
}

const systemMessage = `You are a Schema Discovery Agent that helps users understand file structures.

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
// Global state
let currentMessages: ChatCompletionMessageParam[] = [
  { role: "system", content: systemMessage },
];

async function sendToHuman(message: string): Promise<boolean> {
    console.log("\n✨ Assistant:", message, "\n");
    const userResponse = await getUserInput("> ");
    if (userResponse.toLowerCase() === 'exit') {
        return true; // Return true to indicate exit
    }
    currentMessages.push({ role: "user", content: userResponse });
    return false;
}

// Standalone agent function that processes messages and returns when needs human input
async function runSchemaDiscoveryAgent(initialMessage: string): Promise<string | null> {
    console.log("\n🤖 Starting Schema Discovery Agent...\n");

    try {
        // Add user message to conversation
        currentMessages.push({ role: "user", content: initialMessage });

        let step = 0;
        while (step < 5) {
            console.log(`\n📍 Step ${step + 1}:`);
            console.log(
                "Sending messages to OpenAI:",
                JSON.stringify(currentMessages, null, 2),
                "\n"
            );

            // Get completion from OpenAI
            const completion = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: currentMessages,
                tools,
                tool_choice: "auto",
            });

            const assistantMessage = completion.choices[0].message;
            console.log(
                "🤖 Assistant Response:",
                JSON.stringify(assistantMessage, null, 2),
                "\n"
            );
            currentMessages.push(assistantMessage);

            // Process tool calls if present
            if (assistantMessage.tool_calls) {
                for (const toolCall of assistantMessage.tool_calls) {
                    try {
                        console.log(`🔧 Executing Tool: ${toolCall.function.name}`);
                        console.log("   Arguments:", toolCall.function.arguments, "\n");

                        const args = JSON.parse(toolCall.function.arguments);
                        let result;

                        switch (toolCall.function.name) {
                            case "get_files_list":
                                result = await get_files_list(args.folder);
                                console.log(
                                    "   Files List Response:",
                                    JSON.stringify(result, null, 2),
                                    "\n"
                                );
                                currentMessages.push({
                                    role: "tool",
                                    tool_call_id: toolCall.id,
                                    content: JSON.stringify(result),
                                });
                                break;

                            case "get_file_size":
                                result = await get_file_size(args.filename);
                                console.log(
                                    "   File Size Response:",
                                    JSON.stringify(result, null, 2),
                                    "\n"
                                );
                                currentMessages.push({
                                    role: "tool",
                                    tool_call_id: toolCall.id,
                                    content: JSON.stringify(result),
                                });
                                break;

                            case "get_file_content_low_level":
                                result = await get_file_content_low_level(args.filename, {
                                    byte_start: args.byte_start,
                                    byte_length: args.byte_length,
                                    start_line: args.start_line,
                                    num_lines: args.num_lines,
                                });
                                console.log(
                                    "   File Content Response:",
                                    JSON.stringify(result, null, 2),
                                    "\n"
                                );
                                currentMessages.push({
                                    role: "tool",
                                    tool_call_id: toolCall.id,
                                    content: JSON.stringify(result),
                                });
                                break;

                            case "understand_schema":
                                result = await understand_schema(args.content, args.file_type);
                                console.log(
                                    "   Schema Analysis Response:",
                                    JSON.stringify(result, null, 2),
                                    "\n"
                                );
                                currentMessages.push({
                                    role: "tool",
                                    tool_call_id: toolCall.id,
                                    content: JSON.stringify(result),
                                });
                                break;

                            case "ask_human":
                                currentMessages.push({
                                    role: "tool",
                                    tool_call_id: toolCall.id,
                                    content: JSON.stringify({ response: "pending" })
                                });
                                return args.message;
                        }

                        console.log(
                            `✅ Tool ${toolCall.function.name} executed successfully\n`
                        );
                    } catch (error) {
                        console.error(`❌ Error executing tool ${toolCall.function.name}:`, error);
                        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
                        console.error("Error details:", errorMessage);
                        currentMessages.push({
                            role: "tool",
                            tool_call_id: toolCall.id,
                            content: JSON.stringify({ 
                                error: errorMessage,
                                details: error instanceof Error ? error.stack : undefined
                            }),
                        });
                    }
                }
            } else if (step > 1 && assistantMessage.content) {
                const content = typeof assistantMessage.content === 'string' 
                    ? assistantMessage.content 
                    : (assistantMessage.content as ChatCompletionContentPart[])[0].type === 'text' 
                        ? (assistantMessage.content as ChatCompletionContentPart & { text: string }).text
                        : JSON.stringify(assistantMessage.content[0]);
                return content;
            }
            step++;
        }
        return null;
    } catch (error: unknown) {
        console.error("❌ OpenAI Agent test failed:", error);
        if (error instanceof APIError) {
            console.error("Error details:", {
                status: error.status,
                message: error.message,
                code: error.code,
                type: error.type,
            });
        } else if (error instanceof Error) {
            console.error("Error message:", error.message);
        } else {
            console.error("Unknown error:", error);
        }
        return null;
    }
}

// Interactive console interface
async function startInteraction() {
    try {
        while (true) {
            const userInput = await getUserInput("> ");
            if (userInput.toLowerCase() === "exit") break;

            while (true) {  // Inner loop for conversation
                const questionToAsk = await runSchemaDiscoveryAgent(userInput);
                if (!questionToAsk) break;  // No more questions to ask
                
                const response = await getUserInput(questionToAsk);
                if (response.toLowerCase() === "exit") return;
                
                // Find the last tool call that was ask_human
                const lastToolCall = currentMessages
                    .findLast(msg => msg.role === 'tool' && 
                        typeof msg.content === 'string' &&
                        JSON.parse(msg.content).response === 'pending');
                
                if (lastToolCall && 'tool_call_id' in lastToolCall) {
                    // Update the pending tool response
                    currentMessages = currentMessages.map(msg => 
                        msg === lastToolCall 
                            ? { ...msg, content: JSON.stringify({ response }) }
                            : msg
                    );
                }
                
                // Add the response as a user message
                currentMessages.push({ role: "user", content: response });
            }
        }
    } catch (error) {
        console.error("Error during interaction:", error);
    } finally {
        rl.close();
    }
}

// Run the program
console.log("🤖 Schema Discovery Agent started. Type 'exit' to quit.");
startInteraction();
