import "dotenv/config";
import OpenAI from "openai";
import { ChatCompletionMessageParam } from "openai/resources/chat";
import { runSchemaDiscoveryAgent, systemMessage } from "./app/agents/schemaAgent";
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

// Global state
let currentMessages: ChatCompletionMessageParam[] = [
  { role: "system", content: systemMessage },
];

// Interactive console interface
async function startInteraction() {
  try {
    while (true) {
      const userInput = await getUserInput("> ");
      if (userInput.toLowerCase() === "exit") break;

      while (true) {
        const questionToAsk = await runSchemaDiscoveryAgent(
          userInput,
          openai,
          currentMessages,
          (stepInfo) => console.log(stepInfo) // Callback to log each step
        );
        if (!questionToAsk) break;

        const response = await getUserInput(questionToAsk);
        if (response.toLowerCase() === "exit") return;

        // Find the last tool call that was ask_human
        const lastToolCall = currentMessages.findLast(
          (msg) =>
            msg.role === "tool" &&
            typeof msg.content === "string" &&
            JSON.parse(msg.content).response === "pending"
        );

        if (lastToolCall && "tool_call_id" in lastToolCall) {
          // Update the pending tool response
          currentMessages = currentMessages.map((msg) =>
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
