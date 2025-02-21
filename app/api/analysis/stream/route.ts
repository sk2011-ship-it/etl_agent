import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { ChatCompletionMessageParam } from "openai/resources/chat";
import { runSchemaDiscoveryAgent, systemMessage } from "@/app/agents/schemaAgent";

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_KEY,
});

export async function POST(req: NextRequest) {
    const { currentMessage, messageHistory } = await req.json();

    if (!currentMessage) {
        return NextResponse.json({ error: 'No current message provided' }, { status: 400 });
    }

    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
        async start(controller) {
            try {
                const sendStep = (stepInfo: string) => {
                    const data = encoder.encode(`data: ${JSON.stringify({ step: stepInfo })}\n\n`);
                    controller.enqueue(data);
                };

                const questionToAsk = await runSchemaDiscoveryAgent(
                    currentMessage,
                    openai,
                    messageHistory,
                    sendStep
                );

                // Make sure we always send a message response
                const messageToSend = questionToAsk || "I've processed your request.";
                const data = encoder.encode(`data: ${JSON.stringify({ message: messageToSend })}\n\n`);
                controller.enqueue(data);
            } catch (error) {
                console.error("Error with OpenAI API:", error);
                const errorData = encoder.encode(`data: ${JSON.stringify({ 
                    message: "Sorry, there was an error processing your request." 
                })}\n\n`);
                controller.enqueue(errorData);
            } finally {
                controller.close();
            }
        }
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
        }
    });
} 