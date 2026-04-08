import { NextRequest, NextResponse } from 'next/server';
import { AzureOpenAI } from "openai";

export async function POST(request: NextRequest) {
  try {
    const { messages, context, sourceType, contentTitle } = await request.json();

    if (!messages || !context) {
      return NextResponse.json(
        { error: "Missing required data" },
        { status: 400 }
      );
    }

    // Required Azure OpenAI credentials and configuration
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const apiVersion = process.env.OPENAI_API_VERSION || "2024-02-15-preview";
    const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "o4-mini";

    if (!endpoint || !apiKey) {
      return NextResponse.json(
        { error: "Azure OpenAI credentials not configured" },
        { status: 500 }
      );
    }

    console.log("Using Azure OpenAI with:", {
      endpoint: endpoint.substring(0, 20) + "...",
      deploymentName,
      apiVersion
    });

    // Initialize Azure OpenAI client
    const client = new AzureOpenAI({
      apiKey,
      endpoint,
      apiVersion,
    });

    // Create a source description based on type and title
    let sourceDescription = "the provided content";
    if (contentTitle) {
      sourceDescription = sourceType === 'youtube' 
        ? `the YouTube video titled "${contentTitle}"` 
        : `the notes titled "${contentTitle}"`;
    }

    // Create the system message based on source type with conciseness instruction
    const systemMessage = sourceType === 'youtube'
      ? `You are an AI assistant helping with educational content. The following is a transcript from ${sourceDescription}. Answer the user's question based on this transcript content only. Give concise and accurate answers - don't make them unnecessarily long. If the information isn't in the transcript, briefly acknowledge that and suggest what might be relevant.`
      : `You are an AI assistant helping with educational content. The following are notes from ${sourceDescription}. Answer the user's question based on these notes only. Give concise and accurate answers - don't make them unnecessarily long. If the information isn't in the notes, briefly acknowledge that and suggest what might be relevant.`;

    // Get the latest user message
    const userMessage = messages[messages.length - 1]?.message || "";

    console.log("Sending request to Azure OpenAI with:", {
      model: deploymentName,
      systemMessageLength: systemMessage.length,
      contextLength: context.length,
      userMessageLength: userMessage.length
    });

    // Create the message payload with system prompt, context, and user question
    const completion = await client.chat.completions.create({
      model: deploymentName, 
      messages: [
        {
          role: "system",
          content: systemMessage
        },
        {
          role: "user",
          content: `Here's the content:\n\n${context}\n\nPlease answer my question about this content concisely and accurately. Do not make your response unnecessarily long: ${userMessage}`
        }
      ],
      max_completion_tokens: 4000,
    });

    // Process the response
    const reply = completion.choices[0].message.content || "Sorry, I couldn't generate a response.";
    
    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Error in chat API:", error);
    return NextResponse.json(
      { error: "Failed to process your request", details: (error as Error).message },
      { status: 500 }
    );
  }
}