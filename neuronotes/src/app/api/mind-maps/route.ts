import { NextRequest, NextResponse } from 'next/server';
import { Innertube, UniversalCache } from 'youtubei.js';
import { AzureOpenAI } from "openai";
import { connectToDatabase } from '../../../../lib/db/mongoose';
import { Notes, MindMap, Chapter, User, UserGenerationStatus } from '../../../../lib/db/model';
import mongoose from 'mongoose';

interface YoutubeVideo {
  title: string;
  url: string;
  length: string;
  views: string;
  likes: string;
}

interface TopicWithVideo {
  title: string;
  youtubeVideos: YoutubeVideo[];
}

const MAX_RESULTS = 5;

export async function POST(request: NextRequest) {
  let userId: string | null = null;
  
  try {
    await connectToDatabase();
    
    const body = await request.json();
    const { topics, chapterId, chapterTitle, userId: requestUserId } = body;
    userId = requestUserId;
    
    // Input validation
    if (!Array.isArray(topics) || !chapterId || !chapterTitle || !userId) {
      return NextResponse.json(
        { error: "Invalid input: topics array, chapterId, chapterTitle and userId are required" },
        { status: 400 }
      );
    }

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check existing mind map for chapter BEFORE setting flag
    const existingMindMap = await MindMap.findOne({ chapterId });
    if (existingMindMap) {
      return NextResponse.json(
        { error: "Mind map already exists for this chapter" },
        { status: 409 }
      );
    }

    // Atomically set isGeneratingMindMap = true in status collection (upsert)
    const now = new Date();
    const updatedStatus = await UserGenerationStatus.findOneAndUpdate(
      { userId, isGeneratingMindMap: { $ne: true } },
      { $set: { isGeneratingMindMap: true, updatedAt: now }, $setOnInsert: { userId, isGeneratingQuiz: false, createdAt: now } },
      { new: true, upsert: true }
    );
    if (!updatedStatus || updatedStatus.isGeneratingMindMap !== true) {
      return NextResponse.json(
        { error: "Mind map generation already in progress for this user" },
        { status: 409 }
      );
    }
    console.log(`Set user ${userId} mind map generation status to true`);

    // Step 3: Fetch YouTube videos for each topic
    console.log(`Starting YouTube video fetch for ${topics.length} topics`);
    const topicsWithVideos: TopicWithVideo[] = await fetchYouTubeVideosForTopics(topics);
    console.log(`Successfully fetched videos for ${topics.length} topics`);
    
    // Step 4: Generate mind map structure with those videos
    console.log("Generating mind map structure");
    const mindMap = await generateMindMapStructure(topicsWithVideos, chapterTitle);
    
    if (!mindMap) {
      // Reset status before throwing error (update status collection)
      await UserGenerationStatus.findOneAndUpdate(
        { userId },
        { $set: { isGeneratingMindMap: false, updatedAt: new Date() } },
        { new: true, upsert: true }
      );
      throw new Error("Failed to generate mind map structure");
    }
    
    // Step 5: Process mind map - create notes directly using Mongoose models
    console.log("Processing mind map and creating notes");
    const processedMindMap = await processMindMapWithModels(mindMap);
    
    // Step 6: Save the mind map directly using the MindMap model
    console.log("Saving mind map to database");
    const newMindMap = new MindMap({
      chapterId: chapterId,
      content: processedMindMap,
      createdAt: new Date()
    });
    
    const savedMindMap = await newMindMap.save();
    const mindMapId = savedMindMap._id.toString();
    console.log("Mind map saved successfully with ID:", mindMapId);
    
    // Step 7: Update the chapter with the mind map ID using the Chapter model
    console.log("Updating chapter with mind map reference");
    
    // Convert string ID to ObjectId if needed
    const chapterObjectId = new mongoose.Types.ObjectId(chapterId);
    
    await Chapter.findByIdAndUpdate(
      chapterObjectId,
      { mindmapId: savedMindMap._id }
    );
    
    console.log("Chapter updated successfully");
    
    // Reset flag on success
    await UserGenerationStatus.findOneAndUpdate(
      { userId },
      { $set: { isGeneratingMindMap: false, updatedAt: new Date() } },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      mindMapId: mindMapId,
    });
    
  } catch (error) {
    console.error("Error in mind map generation process:", error);
    
    if (userId) {
      try {
        await UserGenerationStatus.findOneAndUpdate(
          { userId },
          { $set: { isGeneratingMindMap: false, updatedAt: new Date() } },
          { new: true, upsert: true }
        );
      } catch (updateError) {
        console.error("Failed to update status after error:", updateError);
      }
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : "Unknown error during mind map generation" 
      },
      { status: 500 }
    );
  }
}

// Helper Functions

async function fetchYouTubeVideosForTopics(topics: string[]): Promise<TopicWithVideo[]> {
  try {
    const youtube = await Innertube.create({ cache: new UniversalCache(false) });
    
    const results = await Promise.all(topics.map(async (topic) => {
      try {
        const search = await youtube.search(topic);
        
        const youtubeVideos: YoutubeVideo[] = [];
        for (const item of search.videos) {
          if (
            item &&
            (item as any).type === 'Video' &&
            typeof (item as any).id === 'string' &&
            typeof (item as any).title?.text === 'string'
          ) {
            const video = item as any;
            youtubeVideos.push({
              title: video.title.text,
              url: `https://www.youtube.com/watch?v=${video.id}`,
              length: video.duration?.text ?? 'Unknown',
              views: video.view_count?.text ?? 'N/A',
              likes: video.like_count?.short_text ?? 'N/A',
            });
          }
          if (youtubeVideos.length >= MAX_RESULTS) break;
        }
        
        if (youtubeVideos.length === 0) {
          youtubeVideos.push({
            title: `No video found for "${topic}"`,
            url: '#',
            length: '00:00',
            views: '0',
            likes: '0',
          });
        }
        
        return { title: topic, youtubeVideos };
      } catch (error) {
        console.error(`Error for ${topic}:`, error);
        return {
          title: topic,
          youtubeVideos: [
            {
              title: `Error fetching video`,
              url: '#',
              length: '00:00',
              views: '0',
              likes: '0',
            },
          ],
        };
      }
  }));
    
    return results;
  } catch (error) {
    console.error('Error in fetchYouTubeVideos:', error);
    
    // Return fallback data in case of error
    return topics.map(topic => ({
      title: topic,
      youtubeVideos: [
        {
          title: `Error fetching videos for "${topic}"`,
          url: '#',
          length: '00:00',
          views: '0',
          likes: '0',
        },
      ],
    }));
  }
}


async function processMindMapWithModels(rootNode: any): Promise<any> {
  // Create a deep clone of the mind map
  const clonedMindMap = JSON.parse(JSON.stringify(rootNode));
  let notesCount = 0;
  
  // Recursive function to traverse and process nodes
  async function traverseAndProcess(node: any): Promise<void> {
    // Process resources in the current node
    if (node.resources && Array.isArray(node.resources)) {
      for (let i = 0; i < node.resources.length; i++) {
        const resource = node.resources[i];
        
        // Process md_notes resources by creating notes records
        if (resource.type === 'md_notes' && resource.data?.description) {
          notesCount++;
          console.log(`Processing notes for "${node.title}": "${resource.data.description.substring(0, 50)}..."`);
          
          try {
            // Create notes record directly using the Notes model
            const newNote = new Notes({
              description: resource.data.description,
              content: null, // Explicitly set content to null
              createdAt: new Date()
            });
            
            const savedNote = await newNote.save();
            const noteId = savedNote._id.toString();
            
            console.log(`Created notes record with ID: ${noteId} for "${node.title}"`);
            
            // Update the resource with the notes ID and remove description
            resource.data.id = noteId;
            delete resource.data.description;
            
            console.log(`Successfully updated resource for "${node.title}" with notes ID: ${noteId}`);
          } catch (error) {
            console.error(`Error creating notes record for topic "${node.title}":`, error);
            // Keep the description in case of error
          }
        }
      }
    }
    
    // Recursively process subtopics
    if (node.subtopics && node.subtopics.length > 0) {
      for (const subtopic of node.subtopics) {
        await traverseAndProcess(subtopic);
      }
    }
  }
  
  // Start processing from the root node
  await traverseAndProcess(clonedMindMap);
  
  console.log(`Successfully processed mind map with ${notesCount} notes resources`);
  return clonedMindMap;
}

async function generateMindMapStructure(topicsWithVideos: TopicWithVideo[], chapterTitle: string) {
  // Required Azure OpenAI credentials and configuration
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
  });

  // Prepare the topics and videos data for the AI
  const topicsData = JSON.stringify(topicsWithVideos);
  
  // Create the message payload with system prompt and topic data
  const completion = await client.chat.completions.create({
    model: deploymentName,
    messages: [
      { 
        role: "system", 
        content: `You are a specialized AI for creating educational mind maps with relevant resources.
        Your task is to analyze a list of educational topics with associated YouTube videos, select the most 
        relevant content for each topic, and organize everything into a hierarchical mind map structure.
        
        Create deep, multi-level hierarchies when appropriate for complex topics. Don't limit yourself to a 
        shallow hierarchy - create as many nested levels as needed for a comprehensive understanding of the subject.
        Your goal is to produce the most educationally valuable structure with a balanced mix of resources.
        
        IMPORTANT INSTRUCTION: Your response must contain ONLY the JSON structure with no additional text. Do not include any explanations, comments, code blocks or markdown formatting. Your entire output should be valid JSON that can be parsed directly.`
      },
      {
        role: "user",
        content: `I have the following list of topics for the chapter "${chapterTitle}", each with several YouTube videos:
        
        ${topicsData}
        
        Please:
        1. For each topic, select the most relevant YouTube video(s) based on their titles, watch time (length), views, and likes.
           Choose videos that best explain the topic comprehensively. Select videos that have:
           - Titles that clearly match the topic
           - Reasonable length (not too short to be superficial, not too long to be impractical)
           - Higher view and like counts (suggesting better quality and popularity)
           - You may select 1 or more videos per topic if needed for complete coverage.
        
        2. Create a balanced distribution of resources - approximately 2/3 video resources and 1/3 notes resources.
           This balance helps different learning styles and ensures comprehensive coverage.
        
        3. Create notes resources for topics that:
           - Lack high-quality video matches
           - Contain complex theoretical concepts
           - Include mathematical formulas or equations
           - Require detailed step-by-step explanations
           - Are foundational to understanding other topics
           - May benefit from written explanation alongside visual learning
        
        4. Analyze the topics to identify patterns, relationships, and hierarchies. Create a DEEPLY NESTED mind map structure 
           that reflects the natural progression of learning the subject. For complex topics, create multiple levels of depth 
           as appropriate - don't limit yourself to a simple structure.
        
        5. You may:
           - Break down large topics into subtopics
           - Group related topics under conceptual categories
           - Create multiple levels of nesting when appropriate
           - Add prerequisite relationships between topics
           - Organize content from fundamental to advanced concepts
        
        6. Return a JSON mind map with the following general structure (but feel free to go deeper):
        {
          "title": "${chapterTitle}",
          "is_end_node": false,
          "subtopics": [
            {
              "title": "Topic Category",
              "is_end_node": false,
              "subtopics": [
                {
                  "title": "Specific Area",
                  "is_end_node": false,
                  "subtopics": [
                    {
                      "title": "Detailed Concept",
                      "is_end_node": true,
                      "resources": [
                        {
                          "id": "res-uuid-1",
                          "type": "youtube_link",
                          "data": {
                            "url": "https://www.youtube.com/watch?v=video1",
                          }
                        },
                        {
                          "id": "res-uuid-2",
                          "type": "md_notes",
                          "data": {
                            "description": "Description of notes content."
                          }
                        }
                      ]
                    },
                    {
                      "title": "Detailed Concept",
                      "is_end_node": true,
                      "resources": [
                        {
                          "id": "res-uuid-3",
                          "type": "youtube_link",
                          "data": {
                            "url": "https://www.youtube.com/watch?v=video2",
                          }
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }

        IMPORTANT: 
        - Aim for approximately 1/3 of the end nodes to have notes resources and 2/3 to have video resources
        - Choose topics for notes resources strategically based on content complexity and learning needs
        - Create deep hierarchical structures to comprehensively cover the subject matter
        - The structure should serve as an in-depth study guide that helps students navigate the material in a logical progression
        
        CRITICAL: Respond with ONLY the JSON structure and nothing else. No explanations, markdown formatting, or additional text.`
      },
    ],
    max_completion_tokens: 100000,
  });

  // Process the response
  const responseContent = completion.choices[0].message.content;
  if (!responseContent) {
    throw new Error("Failed to generate mind map with relevant content");
  }

  // Try to find and parse JSON in the response
  try {
    const jsonMatch = responseContent.match(/```json\s*([\s\S]*?)\s*```/) || 
                      responseContent.match(/\{[\s\S]*\}/);
    
    const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : responseContent;
    const mindMapData = JSON.parse(jsonString);
    
    return mindMapData;
  } catch (error) {
    console.error("Error parsing mind map data:", error);
    throw new Error("Failed to parse the generated mind map data");
  }
}
