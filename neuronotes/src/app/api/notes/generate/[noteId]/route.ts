import { NextRequest, NextResponse } from 'next/server';
import { AzureOpenAI } from "openai";
import { Notes } from '../../../../../lib/db/model';
import { connectToDatabase } from '../../../../../lib/db/mongoose';

export async function POST(request: NextRequest, { params }: { params: Promise<{ noteId: string }>}) {
  try {
    await connectToDatabase();
    
    const {noteId} = await params;
    const { title, description } = await request.json();

    if (!title) {
      return NextResponse.json(
        { error: "Invalid input: title is required" },
        { status: 400 }
      );
    }

    // Find the note first to make sure it exists
    const note = await Notes.findById(noteId);
    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    // Required Azure OpenAI credentials and configuration
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const apiVersion = process.env.OPENAI_API_VERSION || "2024-12-01-preview";
    const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "o4-mini";

    if (!endpoint || !apiKey) {
      return NextResponse.json(
        { error: "Azure OpenAI credentials not configured" },
        { status: 500 }
      );
    }

    // Initialize Azure OpenAI client
    const client = new AzureOpenAI({
      apiKey,
      endpoint,
      deployment: deploymentName,
      apiVersion,
    });

    const completion = await client.chat.completions.create({
      model: deploymentName,
      messages: [
        { 
          role: "system", 
          content: `You are a specialized AI for creating comprehensive educational notes.
          Your task is to generate clear, well-structured notes on a given topic for study purposes.
          Create notes suitable for students that include key concepts, definitions, explanations, examples, 
          and important points to remember. Format the notes with markdown.
          
          IMPORTANT: Return ONLY the notes content with markdown formatting. Do not include any additional text, explanations about your process, or comments outside the notes themselves.`
        },
        {
          role: "user",
          content: `Please generate comprehensive educational notes for the topic: "${title}"
          
          Additional context for note generation: "${description || ''}"
          
          The notes should:
          1. Start with a clear heading (# Topic Title)
          2. Include an introduction section
          3. Organize content with appropriate section headings (## Section Title)
          4. Use subsections where appropriate (### Subsection Title)
          5. Utilize bullet points and numbered lists for clarity
          6. Include code examples if relevant (in code blocks)
          7. Highlight important concepts or definitions with bold or italics
          8. Provide a summary or key takeaways at the end
          
          Only use Markdown formatting for structure.
          Do not include any other text outside the notes content itself.`
        },
      ],
      max_completion_tokens: 3000,
    });

    const notesContent = completion.choices[0].message.content;
    if (!notesContent) {
      return NextResponse.json(
        { error: "Failed to generate notes content" },
        { status: 500 }
      );
    }

    // Update the note with the generated content
    const updatedNote = await Notes.findByIdAndUpdate(
      noteId,
      { content: notesContent },
      { new: true }
    );

    return NextResponse.json(updatedNote.toObject(), { status: 200 });
    
  } catch (error) {
    console.error("Error generating and updating notes:", error);
    return NextResponse.json(
      { error: "Failed to generate and update notes" },
      { status: 500 }
    );
  }
}