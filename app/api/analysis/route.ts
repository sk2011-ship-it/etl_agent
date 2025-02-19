import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { ChatCompletionTool } from "openai/resources/chat/completions";
import { ChatCompletionMessageParam } from "openai/resources/chat";

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_KEY,
});

interface Prompt {
    message: string;
}

export async function POST(req: NextRequest) {
    try {
        if (!req.body) {
            return NextResponse.json({ error: 'No body in the request' }, { status: 400 });
        }

        // Parse the request body as JSON
        const { message }: Prompt = await req.json();
        console.log(message, "message")

        const tools: ChatCompletionTool[] = [{
            type: "function",
            function: {
                name: "get_weather",
                description: "Get current temperature for a given location.",
                parameters: {
                    type: "object",
                    properties: {
                        location: {
                            type: "string",
                            description: "City and country e.g. Bogotá, Colombia"
                        }
                    },
                    required: ["location"]
                }
            }
        }];

        let messages: ChatCompletionMessageParam[] = [
            {
                role: "user",
                content: message
            }
        ];

        // Send request to OpenAI's chat completion endpoint
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages,
            tools,
            store: true

        });
        console.log(completion.choices[0].message.tool_calls);

        if (completion.choices[0].message.tool_calls) {
            const tool_call = completion.choices[0].message.tool_calls[0];
            if (tool_call.function.name === "get_weather") {
                const args = JSON.parse(tool_call.function.arguments);
                const weather = await get_weather(args.location);
                // console.log(weather, "weather");
                // console.log(completion.choices[0].message)
                messages.push(completion.choices[0].message); // append model's function call message
                messages.push({ // append result message
                    role: "tool",
                    tool_call_id: tool_call.id,
                    content: weather.current.temperature.toString()
                });

                const completion2 = await openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages,
                    tools,
                    store: true,
                });
                const result = completion2.choices[0]?.message?.content || "No response from AI.";
                // console.log(completion2.choices[0].message.content);
                return NextResponse.json({ message: result });
            }
        }

        // Get the first message from the choices array
        const result = completion.choices[0]?.message?.content || "No response from AI.";

        // Send the OpenAI response if tool_calls is not present
        return NextResponse.json({ message: result });
    } catch (error) {
        console.error("Error with OpenAI API:", error);

        // Return an error response using NextResponse
        return NextResponse.json(
            { error: "Failed to process the request" },
            { status: 500 }
        );
    }
}

async function get_weather(current_location: string) {
    const url = `https://api.weatherstack.com/current?access_key=c5a2e07c7c51f2ea12bc4924afd73af6&query=${current_location}`;
    const options = {
        method: 'GET'
    };
    try {
        const response = await fetch(url, options);
        const result = await response.json();
        return result;
    } catch (error) {
        console.error(error);
    }
}