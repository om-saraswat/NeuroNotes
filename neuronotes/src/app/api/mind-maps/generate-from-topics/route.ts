import { NextRequest, NextResponse } from 'next/server';
import { Innertube, UniversalCache } from 'youtubei.js';
import { AzureOpenAI } from "openai";
import { connectToDatabase } from '../../../../lib/db/mongoose';
import { Notes, MindMap, Chapter, User, UserGenerationStatus } from '../../../../lib/db/model';
import mongoose from 'mongoose';


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
