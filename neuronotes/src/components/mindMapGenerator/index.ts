"use client"

import axios from 'axios';
import { toast } from 'sonner';

interface GenerateMindMapResult {
  success: boolean;
  mindMapId?: string;
  error?: string;
}

/**
 * @deprecated Use the consolidated API endpoint directly via axios or fetch
 */
export async function generateMindMapFromTopics(
  topicList: string[],
  chapterId: string,
  chapterTitle: string
): Promise<GenerateMindMapResult> {
  try {
    toast.info(`Starting mind map generation process for ${chapterTitle}...`);
    
    // Call the consolidated API endpoint
    const response = await axios.post('/api/mind-maps/generate-from-topics', {
      topics: topicList,
      chapterId,
      chapterTitle
    });
    
    return response.data;
    
  } catch (error) {
    console.error("Error in mind map generation process:", error);
    toast.error(`Failed to generate mind map: ${error instanceof Error ? error.message : "Unknown error"}`);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error during mind map generation",
    };
  }
}