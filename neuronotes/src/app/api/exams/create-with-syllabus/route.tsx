import { NextRequest, NextResponse } from 'next/server';
import { AzureOpenAI } from "openai";
import { Exam, Chapter } from '../../../../lib/db/model';
import { connectToDatabase } from '../../../../lib/db/mongoose';
import mongoose from 'mongoose';

export async function POST(request: NextRequest) {
  let savedExam = null;
  
  try {
    // Connect to database
    await connectToDatabase();
    
    // Parse FormData instead of JSON
    const formData = await request.formData();
    
    const userId = formData.get('userId') as string;
    const subjectName = formData.get('subjectName') as string;
    const description = formData.get('description') as string;
    const examDate = formData.get('examDate') as string;
    const syllabusFile = formData.get('syllabusFile') as File;

    // Validate required fields
    if (!userId || !subjectName || !examDate || !syllabusFile) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate userId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { error: "Invalid userId" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!syllabusFile.type.startsWith('image/')) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload an image file." },
        { status: 400 }
      );
    }

    console.log("Starting exam creation process for user:", userId);

    // STEP 1: Check if exam already exists
    const existingExam = await Exam.findOne({ userId, subjectName: subjectName.trim() });
    if (existingExam) {
      return NextResponse.json(
        { error: 'Exam already exists' },
        { status: 400 }
      );
    }

    // STEP 2: Convert file to base64 and validate syllabus FIRST
    let analysisResult = null;
    try {
      const imageDataUrl = await fileToDataUrl(syllabusFile);
      console.log("File converted to data URL, size:", imageDataUrl.length);
      
      // STEP 3: Analyze if the image contains a syllabus
      analysisResult = await extractChaptersFromImage(imageDataUrl);
      
      // If it's not a syllabus, return error immediately without saving exam
      if (!analysisResult.isSyllabus) {
        return NextResponse.json({
          success: false,
          isSyllabus: false,
          error: "The uploaded image does not appear to contain a syllabus. Please upload a valid syllabus document."
        }, { status: 400 });
      }
      
    } catch (syllabusError) {
      console.error("Error analyzing syllabus:", syllabusError);
      return NextResponse.json({
        success: false,
        error: "Failed to analyze the uploaded image. Please try again with a clear syllabus image."
      }, { status: 400 });
    }

    // STEP 4: ONLY NOW Save the exam to database (after validating it's a syllabus)
    const examData = {
      userId,
      subjectName: subjectName.trim(),
      description: description?.trim() || "",
      examDate: new Date(examDate)
    };

    // Create and save the exam - let MongoDB generate the _id
    const newExam = new Exam(examData);
    savedExam = await newExam.save();

    console.log("Exam saved to database with ID:", savedExam._id);

    // STEP 5: Save chapters to database
    const chapters = analysisResult.chapters || [];
    try {
      if (chapters && chapters.length > 0) {
        await saveChaptersToDatabase(chapters, savedExam._id);
        console.log("Chapters extracted and saved for exam:", savedExam._id);
      } else {
        console.log("No chapters found in syllabus for exam:", savedExam._id);
      }
    } catch (chapterError) {
      console.error("Error saving chapters for exam:", savedExam._id, chapterError);
    }

    // Return success response with exam data
    return NextResponse.json({
      success: true,
      isSyllabus: true,
      exam: savedExam.toObject(),
      chapters: chapters || [],
      message: "Exam created and syllabus processed successfully"
    });

  } catch (error) {
    console.error("Error in exam creation:", error);
    
    return NextResponse.json(
      { error: "Failed to create exam" },
      { status: 500 }
    );
  }
}

// Helper function to convert File to data URL (moved to backend)
async function fileToDataUrl(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    const mimeType = file.type;
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error("Error converting file to data URL:", error);
    throw new Error("Failed to process the uploaded file");
  }
}

// Function to extract chapters from image using Azure OpenAI
async function extractChaptersFromImage(imageDataUrl: string) {
  try {
    console.log("Starting chapter extraction from syllabus image");
    
    // Azure OpenAI credentials and configuration
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const apiVersion = process.env.OPENAI_API_VERSION || "2024-12-01-preview";
    const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "o4-mini";

    if (!endpoint || !apiKey) {
      throw new Error("Azure OpenAI credentials not configured");
    }

    // Initialize Azure OpenAI client
    const client = new AzureOpenAI({
      apiKey,
      endpoint,
      deployment: deploymentName,
      apiVersion,
      dangerouslyAllowBrowser: true
    });

    // Create the message payload with the system prompt and the image
    const completion = await client.chat.completions.create({
      model: deploymentName,
      messages: [
        { 
          role: "system", 
          content: "You are a specialized AI for analyzing educational content. First, determine if the image contains a syllabus (educational curriculum content with chapters, topics, or course outline). Then extract chapters and subtopics if it is a syllabus. Always include an 'isSyllabus' boolean field in your response."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this image and determine if it contains a syllabus or educational curriculum. If it is a syllabus, extract all chapters and subtopics. Return the data in JSON format with the following structure: { isSyllabus: boolean, chapters: [{ title: string, content: string[] }] }. If it's not a syllabus, set isSyllabus to false and chapters to an empty array.",
            },
            {
              type: "image_url",
              image_url: {
                url: imageDataUrl,
              },
            },
          ],
        },
      ],
      max_completion_tokens: 100000,
    });

    // Process the response
    const responseContent = completion.choices[0].message.content;
    console.log("Response from Azure OpenAI received");
    
    if (!responseContent) {
      throw new Error("Failed to analyze the uploaded image");
    }

    // Extract JSON from the response
    const jsonMatch = responseContent.match(/```json\s*([\s\S]*?)\s*```/) || 
                      responseContent.match(/\{[\s\S]*\}/);
    
    const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : responseContent;
    const analysisData = JSON.parse(jsonString);
    
    // Ensure the response has the expected structure
    if (typeof analysisData.isSyllabus === 'undefined') {
      analysisData.isSyllabus = false;
    }
    
    if (!analysisData.chapters) {
      analysisData.chapters = [];
    }
    
    console.log("Analysis complete - Is Syllabus:", analysisData.isSyllabus, "Chapters found:", analysisData.chapters?.length || 0);
    return analysisData;
  } catch (error) {
    console.error("Error analyzing image:", error);
    throw error;
  }
}

// Function to save chapters to database
async function saveChaptersToDatabase(chapters: Array<{title: string, content: string[]}>, examId: string) {
  try {
    console.log("Saving", chapters.length, "chapters to database for exam:", examId);
    
    // Prepare chapters data according to the schema
    const chaptersToSave = chapters.map((chapter, index) => ({
      examId: examId,
      title: chapter.title,
      content: chapter.content,
      order: index // Add order field to maintain sequence
    }));

    // Save all chapters using insertMany for better performance
    const savedChapters = await Chapter.insertMany(chaptersToSave);
    
    console.log('All chapters saved successfully for exam:', examId);
    return savedChapters;
  } catch (error) {
    console.error('Error saving chapters:', error);
    throw error;
  }
}