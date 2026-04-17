"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import MindMap from "../../../../components/Mindmap";
import VideoPlayer from "../../../../components/VideoPlayer";
import ChatUI from "../../../../components/ChatUI";
import NotesViewer from "../../../../components/NotesViewer";
import VideoDetailsViewer from "../../../../components/VideoDetailsViewer";

interface NoteData {
  _id: string;
  content: string | null;
  description: string;
  createdAt?: string;
  updatedAt?: string;
}

const ChapterPage: React.FC = () => {
  const params = useParams();
  const chapterId = params.chapterId as string;

  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState<string | null>(null);
  const [noteData, setNoteData] = useState<NoteData | null>(null);
  const [mindMapData, setMindMapData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"mindmap" | "chat">("mindmap");
  const [currentSelection, setCurrentSelection] = useState<any>(null);
  const [initialMindMapLoaded, setInitialMindMapLoaded] = useState(false);
  // Add a counter to force remounting
  const [renderKey, setRenderKey] = useState(0);
  // Replace the single isGeneratingNotes boolean with a map of note IDs
  const [generatingNotesIds, setGeneratingNotesIds] = useState<Set<string>>(new Set());

  // Fetch note data when selectedNote changes
  useEffect(() => {
    if (!selectedNote) {
      setNoteData(null);
      return;
    }

    const fetchNote = async () => {
      try {
        console.log(`Fetching note with ID: ${selectedNote}`);
        const response = await fetch(`/api/notes?id=${selectedNote}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch note: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Note data received:', data);
        setNoteData(data);

        // Check if content is null and generate if needed
        if (!data.content) {
          await generateNotesContent(selectedNote, data.description);
        }
      } catch (err) {
        console.error('Error fetching note:', err);
        setNoteData(null);
      }
    };

    fetchNote();
  }, [selectedNote]);

  // Generate notes content when needed
  const generateNotesContent = async (noteId: string, description: string) => {
    try {
      // Track this specific note ID as generating
      setGeneratingNotesIds(prev => new Set(prev).add(noteId));
      console.log(`Generating notes content for ID: ${noteId}`);

      const response = await fetch(`/api/notes/generate/${noteId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: currentSelection?.title || 'Educational Topic',
          description: description
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate notes: ${response.statusText}`);
      }

      const updatedNote = await response.json();
      
      // Update local state
      setNoteData(updatedNote);
      console.log('Notes generated and saved successfully');

    } catch (err) {
      console.error('Error generating notes:', err);
      // Set error content
      setNoteData(prev => prev ? { 
        ...prev, 
        content: `# Error\n\nFailed to generate notes: ${err instanceof Error ? err.message : 'Unknown error'}`
      } : null);
    } finally {
      // Remove this note ID from the generating set
      setGeneratingNotesIds(prev => {
        const updated = new Set(prev);
        updated.delete(noteId);
        return updated;
      });
    }
  };

  // Fetch mind map data when the component mounts
  useEffect(() => {
    const fetchMindMap = async () => {
      if (!chapterId) {
        setError("Chapter ID not found");
        setIsLoading(false);
        return;
      }

      // Don't refetch if already loaded
      if (initialMindMapLoaded && mindMapData) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        console.log(`Fetching mind map for chapterId: ${chapterId}`);

        const response = await fetch(
          `/api/mind-maps?chapterId=${encodeURIComponent(chapterId)}`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch mind map: ${response.statusText}`);
        }

        const data = await response.json();
        console.log("Mind map data received:", data);

        if (data && data.content) {
          setMindMapData(data.content);
          setInitialMindMapLoaded(true);
        } else {
          setError("No mind map content found");
        }

        setIsLoading(false);
      } catch (err) {
        console.error("Error fetching mind map:", err);
        setError("Failed to load mind map data. Please try again later.");
        setIsLoading(false);
      }
    };

    fetchMindMap();
  }, [chapterId]);

  // Add this effect to keep chat content in sync with note content
  useEffect(() => {
    const refreshNoteData = async () => {
      if (activeTab === "chat" && selectedNote && !selectedVideo) {
        try {
          const response = await fetch(`/api/notes?id=${selectedNote}`);
          if (response.ok) {
            const data = await response.json();
            setNoteData(data);
          }
        } catch (error) {
          console.error("Error refreshing note data for chat:", error);
        }
      }
    };
    
    refreshNoteData();
  }, [activeTab, selectedNote, selectedVideo]);

  // Handle leaf click
  const handleLeafClick = useCallback(
    (selection: any) => {
      console.log("Leaf node clicked:", selection);
      
      // Store the full selection for title reference
      setCurrentSelection(selection);
      
      // Reset both states when a new node is clicked
      setSelectedVideo(null);
      setSelectedNote(null);
      setNoteData(null);
      
      // Increment render key to force remounting
      setRenderKey(prev => prev + 1);
      
      if (
        selection &&
        selection.resource &&
        selection.resource.type === "md_notes" &&
        selection.resource.data &&
        selection.resource.data.id
      ) {
        // Handle notes type
        console.log("Setting selected note ID:", selection.resource.data.id);
        setSelectedNote(selection.resource.data.id);
      } else if (
        selection &&
        selection.resources &&
        selection.resources.length > 0
      ) {
        // Check if the first resource is a note
        const firstResource = selection.resources[0];
        if (firstResource.type === "md_notes" && firstResource.data && firstResource.data.id) {
          console.log("Setting selected note ID from resources array:", firstResource.data.id);
          setSelectedNote(firstResource.data.id);
        } else if (firstResource.data && firstResource.data.url) {
          // Handle video resource
          console.log("Setting selected video URL from resources array:", firstResource.data.url);
          setSelectedVideo(firstResource.data.url);
        }
      } else if (
        selection &&
        selection.resource &&
        selection.resource.data &&
        selection.resource.data.url
      ) {
        // Handle video resource
        console.log("Setting selected video URL:", selection.resource.data.url);
        setSelectedVideo(selection.resource.data.url);
      } else if (typeof selection === "string") {
        // Fallback for simpler implementations that just pass a URL string
        setSelectedVideo(selection);
      }
    },
    []
  );

  // Handle tab switching
  const handleTabChange = (tab: "mindmap" | "chat") => {
    setActiveTab(tab);
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-var(--navbar-height))]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-lg">Loading mind map...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-var(--navbar-height))]">
        <div className="text-center bg-red-50 dark:bg-red-900/20 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">Error</h2>
          <p className="text-gray-700 dark:text-gray-300">{error}</p>
          <p className="mt-4">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Try Again
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-var(--navbar-height))] flex flex-col">
      <div className="flex flex-col md:flex-row h-full">
        {/* Left panel for video/notes - 40% width */}
        {(selectedVideo || selectedNote) && (
          <div className="w-full md:w-[40%] h-full">
            <div className="h-full p-2 flex flex-col">
              {selectedVideo && (
                <div className="h-full flex flex-col">
                  <div className="shrink-0">
                    {/* Use renderKey to force remounting */}
                    <VideoPlayer key={`${selectedVideo}-${renderKey}`} url={selectedVideo} />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <VideoDetailsViewer key={`details-${selectedVideo}-${renderKey}`} videoUrl={selectedVideo} />
                  </div>
                </div>
              )}
              
              {selectedNote && (
                <div className="h-full">
                  {/* Check if this specific note ID is being generated */}
                  {selectedNote && generatingNotesIds.has(selectedNote) ? (
                    <div className="flex justify-center items-center h-full">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
                        <p className="mt-2 text-sm text-gray-600">Generating notes...</p>
                        <p className="mt-1 text-xs text-gray-500">This may take a few moments</p>
                      </div>
                    </div>
                  ) : (
                    <NotesViewer key={`${selectedNote}-${renderKey}`} noteId={selectedNote} />
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Right panel for mindmap/chat with custom tabs - 60% width */}
        <div
          className={`w-full ${
            selectedVideo || selectedNote ? "md:w-[60%]" : "md:w-full"
          } h-full flex flex-col bg-white dark:bg-zinc-900`}
        >
          {/* Tab navigation */}
          <div className="border-b border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/90 ">
            <div className="flex">
              <button
                className={`px-5 py-3 text-sm font-medium transition-all relative
                  ${activeTab === "mindmap"
                    ? "text-gray-900 dark:text-white bg-white dark:bg-zinc-900"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  }`}
                onClick={() => handleTabChange("mindmap")}
              >
                Mind Map
                {activeTab === "mindmap" && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-black dark:bg-white"></div>
                )}
              </button>
              <button
                className={`px-5 py-2.5 text-sm font-medium transition-all relative
                  ${activeTab === "chat"
                    ? "text-gray-900 dark:text-white bg-white dark:bg-zinc-900"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  }`}
                onClick={() => handleTabChange("chat")}
              >
                Chat
                {activeTab === "chat" && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-black dark:bg-white"></div>
                )}
              </button>
            </div>
          </div>
          
          {/* Tab content area */}
          <div className="flex-1 relative">

            <div className="absolute inset-0 w-full h-full" 
                 style={{ 
                   visibility: activeTab === "mindmap" ? "visible" : "hidden", 
                   opacity: activeTab === "mindmap" ? 1 : 0,
                   transition: "opacity 0.3s ease-in-out" 
                 }}>
              {mindMapData && (
                <div className="h-full w-full">
                  <MemoizedMindMap
                    key={chapterId}
                    data={mindMapData}
                    onLeafClick={handleLeafClick}
                  />
                </div>
              )}
            </div>
            
            <div className="absolute inset-0 w-full h-full" style={{ visibility: activeTab === "chat" ? "visible" : "hidden", opacity: activeTab === "chat" ? 1 : 0 }}>
              {currentSelection ? (
                <div className="h-full w-full">
                  {selectedVideo ? (
                    // Render ChatUI for videos too
                    <ChatUI
                      source={{
                        type: "youtube",
                        content: selectedVideo,
                        contentTitle: currentSelection.title || "Selected Video"
                      }}
                    />
                  ) : (
                    // Keep existing chat functionality for notes
                    <ChatUI
                      source={{
                        type: "markdown",
                        content: noteData?.content || "",
                        contentTitle: currentSelection.title || "Selected Content"
                      }}
                    />
                  )}
                </div>
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-white dark:bg-zinc-900">
                  <div className="text-center max-w-md mx-auto p-8">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-zinc-800 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      No Resource Selected
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                      Select a topic from the mind map to start chatting about the content.
                    </p>
                    <p className="text-sm text-gray-400 dark:text-gray-500">
                      Click on any node in the mind map to load its associated video or notes for discussion.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Create a memoized version of the MindMap component
const MemoizedMindMap = React.memo(MindMap, (prevProps, nextProps) => {
  return JSON.stringify(prevProps.data) === JSON.stringify(nextProps.data);
});

export default ChapterPage;


