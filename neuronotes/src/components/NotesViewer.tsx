import React, { useEffect, useState } from 'react';
import { XMarkIcon, ArrowsPointingOutIcon } from '@heroicons/react/24/outline';

interface NotesViewerProps {
  noteId: string;
}

interface NoteData {
  title: string;
  _id: string;
  content: string | null;
  description: string;
  createdAt?: string;
  updatedAt?: string;
}

const NotesViewer: React.FC<NotesViewerProps> = ({ noteId }) => {
  const [note, setNote] = useState<NoteData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    const fetchNote = async () => {
      try {
        setIsLoading(true);
        setError(null);

        console.log(`Fetching note with ID: ${noteId}`);
        const response = await fetch(`/api/notes/${noteId}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch note: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Note data received:', data);
        setNote(data);
      } catch (err) {
        console.error('Error fetching note:', err);
        setError(err instanceof Error ? err.message : 'Failed to load note');
      } finally {
        setIsLoading(false);
      }
    };

    if (noteId) {
      fetchNote();
    }
  }, [noteId]);

  // Handle ESC key to exit fullscreen
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullScreen) {
        setIsFullScreen(false);
      }
    };

    window.addEventListener('keydown', handleEscKey);
    return () => {
      window.removeEventListener('keydown', handleEscKey);
    };
  }, [isFullScreen]);

  // Add/remove body scroll lock when fullscreen is toggled
  useEffect(() => {
    if (isFullScreen) {
      // Disable scrolling on the body when fullscreen is active
      document.body.style.overflow = 'hidden';
    } else {
      // Re-enable scrolling when exiting fullscreen
      document.body.style.overflow = '';
    }
    
    return () => {
      // Cleanup - ensure scrolling is re-enabled when component unmounts
      document.body.style.overflow = '';
    };
  }, [isFullScreen]);

  // markdown to HTML converter for rendering notes
  const markdownToHtml = (markdown: string | null): string => {
    if (!markdown) return '';
    
    // First, handle horizontal rules properly
    // We'll convert explicit horizontal rules to a specific HTML format
    let html = markdown
      // Convert proper horizontal rules (3 or more hyphens/asterisks/underscores on their own line)
      .replace(/^(\s*?)[-*_]{3,}(\s*?)$/gm, '<hr class="my-4 border-t border-gray-300 dark:border-zinc-600" />')
      
      // Headers
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold my-4">$1</h1>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold my-3">$1</h2>')
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold my-2">$1</h3>')
      
      // Bold and italic
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      
      // Lists - improved to handle nesting better
      .replace(/^\*\s(.*)$/gim, '<ul class="list-disc pl-5 my-2"><li>$1</li></ul>')
      .replace(/^-\s(.*)$/gim, '<ul class="list-disc pl-5 my-2"><li>$1</li></ul>')
      .replace(/^\d+\.\s(.*)$/gim, '<ol class="list-decimal pl-5 my-2"><li>$1</li></ol>')
      
      // Code blocks
      .replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-100 dark:bg-zinc-800 p-3 rounded my-3 overflow-auto text-xs"><code>$1</code></pre>')
      .replace(/`([^`]+)`/g, '<code class="bg-gray-100 dark:bg-zinc-800 px-1 rounded text-xs">$1</code>')
      
      // Prevent any remaining standalone sequences of hyphens from being rendered as separators
      // This is the key fix to prevent unwanted "---" from appearing
      .replace(/^(-{1,2})(?!\s*<)/gm, '$1')
      
      // Line breaks - only convert actual line breaks to <br> tags
      .replace(/\n\s*\n/g, '<br><br>') // Double line breaks become double <br>
      .replace(/\n(?!\s*<(?:\/?(ul|ol|li|h1|h2|h3|p|div|br)))/g, '<br>'); // Single line breaks only if not before HTML tags
    
    // Fix nested lists problem
    html = html.replace(/<\/ul><br><ul class="list-disc pl-5 my-2">/g, '')
      .replace(/<\/ol><br><ol class="list-decimal pl-5 my-2">/g, '');
    
    // Add paragraph tags for better semantics (optional)
    // Note: We're not doing this right now as it would require more complex parsing
    
    return html;
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-zinc-800/80 rounded-lg p-4 border border-gray-200 dark:border-zinc-700 shadow-lg">
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500"></div>
          <span className="ml-2 text-gray-700 dark:text-zinc-300">Loading note...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-zinc-800/80 rounded-lg p-4 border border-gray-200 dark:border-zinc-700 shadow-lg">
        <h3 className="text-lg font-medium text-red-600 dark:text-red-400 mb-2">Error Loading Note</h3>
        <div className="text-gray-700 dark:text-zinc-300">
          <p>{error}</p>
          <p className="mt-2 text-sm">Note ID: {noteId}</p>
        </div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="bg-white dark:bg-zinc-800/80 rounded-lg p-4 border border-gray-200 dark:border-zinc-700 shadow-lg">
        <h3 className="text-lg font-medium text-yellow-600 dark:text-yellow-400 mb-2">Note Not Found</h3>
        <div className="text-gray-700 dark:text-zinc-300">
          <p>The requested note could not be found.</p>
          <p className="mt-2 text-sm">Note ID: {noteId}</p>
        </div>
      </div>
    );
  }

  // Full screen overlay component
  if (isFullScreen) {
    return (
      <>
        {/* Full screen portal that covers everything including navbar */}
        <div 
          className="fixed inset-0 bg-white dark:bg-zinc-900 overflow-y-auto"
          style={{ 
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 100000, // Extremely high z-index to cover navbar
            paddingTop: '0px' // Start content from the very top
          }}
        >
          <div className="max-w-4xl mx-auto p-4 sm:p-6 md:p-8 pt-16"> {/* Add padding top to account for sticky header */}
            <div className="flex justify-end items-center mb-6 sticky top-0 bg-white dark:bg-zinc-900 py-4 z-10">
              <button 
                onClick={() => setIsFullScreen(false)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                aria-label="Close full screen"
              >
                <XMarkIcon className="h-6 w-6 text-gray-700 dark:text-zinc-300" />
              </button>
            </div>
            
            <div className="text-gray-800 dark:text-zinc-300">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-zinc-100 mb-4">
                {note.title || "Note Content"}
              </h2>
              
              <div className="prose dark:prose-invert prose-headings:text-gray-900 dark:prose-headings:text-zinc-100 prose-a:text-blue-600 dark:prose-a:text-blue-400 max-w-none">
                <div dangerouslySetInnerHTML={{ __html: markdownToHtml(note.content) }} />
              </div>
              
              {note.updatedAt && (
                <p className="mt-8 text-xs text-gray-500 dark:text-zinc-500">
                  Last updated: {new Date(note.updatedAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </div>
      </>
    );
  }

  // Regular view
  return (
    <div className="bg-white dark:bg-zinc-800/80 rounded-lg p-4 border border-gray-200 dark:border-zinc-700 shadow-lg flex flex-col h-full">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-medium text-gray-800 dark:text-zinc-100 line-clamp-1">
          {note.title || "Note Content"}
        </h3>
        <button 
          onClick={() => setIsFullScreen(true)}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
          aria-label="Full screen mode"
          title="View in full screen"
        >
          <ArrowsPointingOutIcon className="h-5 w-5 text-gray-700 dark:text-zinc-300" />
        </button>
      </div>
      
      <div className="text-gray-800 dark:text-zinc-300 flex flex-col flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto markdown-content"> {/* Changed from fixed height to flex-1 */}
          <div 
            className="prose dark:prose-invert prose-headings:text-gray-900 dark:prose-headings:text-zinc-100 prose-a:text-blue-600 dark:prose-a:text-blue-400"
            dangerouslySetInnerHTML={{ __html: markdownToHtml(note.content) }}
          />
        </div>

        {note.updatedAt && (
          <p className="mt-2 text-xs text-gray-500 dark:text-zinc-500">
            Last updated: {new Date(note.updatedAt).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
};

export default NotesViewer;