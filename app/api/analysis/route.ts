import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { ChatCompletionMessageParam } from "openai/resources/chat";
import { runSchemaDiscoveryAgent, systemMessage } from "../../agents/schemaAgent";

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_KEY,
});

export async function POST(req: NextRequest) {
    if (!req.body) {
        return NextResponse.json({ error: 'No body in the request' }, { status: 400 });
    }

    const { currentMessage, messageHistory }: { currentMessage: ChatCompletionMessageParam, messageHistory: ChatCompletionMessageParam[] } = await req.json();

    const validMessages = messageHistory.filter(msg => {
        if (typeof msg.content === 'string') {
            return msg.content.trim() !== "";
        } else if (Array.isArray(msg.content)) {
            return msg.content.some(part => part.type === 'text' && part.text.trim() !== "");
        }
        return false;
    });

    if (!validMessages.some(msg => msg.role === "system") || validMessages.length === 0) {
        validMessages.unshift({ role: "system", content: systemMessage });
    }

    validMessages.push(currentMessage);

    const currentContent = typeof currentMessage.content === 'string'
        ? currentMessage.content
        : Array.isArray(currentMessage.content)
        ? currentMessage.content.map(part => part.type === 'text' ? part.text : '').join(' ')
        : '';

    const stream = new ReadableStream({
        async start(controller) {
            try {
                const questionToAsk = await runSchemaDiscoveryAgent(
                    currentContent,
                    openai,
                    validMessages,
                    (stepInfo) => {
                        controller.enqueue(`data: ${JSON.stringify({ step: stepInfo })}\n\n`);
                    }
                );

                if (questionToAsk) {
                    controller.enqueue(`data: ${JSON.stringify({ message: questionToAsk })}\n\n`);
                } else {
                    const finalResponse = validMessages.findLast(msg => msg.role === "assistant")?.content || "No response from AI.";
                    controller.enqueue(`data: ${JSON.stringify({ message: finalResponse })}\n\n`);
                }
            } catch (error) {
                console.error("Error with OpenAI API:", error);
                controller.enqueue(`data: ${JSON.stringify({ error: "Failed to process the request" })}\n\n`);
            } finally {
                controller.close();
            }
        }
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive"
        }
    });
}