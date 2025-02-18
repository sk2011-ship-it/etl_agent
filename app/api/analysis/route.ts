import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

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
    const { message }: Prompt = await req.json(); // Assuming req.json() will parse the body
    console.log(message,"message")
    // Send request to OpenAI's chat completion endpoint
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: message,
        },
      ],
    });

    // Get the first message from the choices array
    const result = completion.choices[0]?.message?.content || "No response from AI.";

    // Log the response message from OpenAI
    // console.log("message :::: ", result);

    // Send the OpenAI response back to the client using NextResponse
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