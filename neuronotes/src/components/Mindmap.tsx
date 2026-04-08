"use client";
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Transformer } from 'markmap-lib';
import { Markmap } from 'markmap-view';
import { INode } from 'markmap-common';
import { useTheme } from 'next-themes';

type ApiResourceData = {
  url?: string;
  content?: string;
  title?: string;
  length?: string;
  views?: string;
  id?: string; 
};

type ApiResource = { 
  id: string; 
  type: string;
  data: ApiResourceData;
};

type ApiNode = {
  title: string;
  is_end_node: boolean;
  subtopics?: ApiNode[];
  resources?: ApiResource[];
};

const resourceMap = new Map<string, { node: ApiNode; resource?: ApiResource }>();
const nodePathMap = new Map<string, string>();

function normalizeText(text: string): string {
  // Create a temporary DOM element to decode HTML entities
  const tempElement = document.createElement('div');
  tempElement.innerHTML = text;
  const decoded = tempElement.textContent || tempElement.innerText || text;
  
  // Additional normalization for common issues
  return decoded
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function apiToMarkdown(node: ApiNode, level = 1, path = "", count_videos= 1, count_notes = 1): { markdown: string; count_videos: number; count_notes: number } {
  // Handle null or undefined node
  if (!node) {
    console.error("Received null or undefined node in apiToMarkdown");
    return { markdown: "# Error Loading Data\n", count_videos, count_notes };
  }

  const currentPath = path ? `${path} > ${node.title}` : node.title;

  resourceMap.set(currentPath, { node });
  nodePathMap.set(node.title, currentPath);

  let md = `${'#'.repeat(level)} ${node.title}\n`;
  if (node.resources && node.resources.length > 0) {
    node.resources.forEach(resource => {
      let icon = '🍿 '; // Default for videos
      if (resource.type === 'md_notes') {
        icon = '📚 '; // Use note icon for notes
      }
      let resourceTitle
      if(resource.type === 'md_notes') {
        resourceTitle = `${count_notes}. Notes`
        count_notes++;
      }else{
        resourceTitle = `${count_videos}. Youtube Video`
        count_videos++;
      }
       
      const resourcePath = `${currentPath} > ${resourceTitle}`;
      resourceMap.set(resourcePath, { node, resource });
      nodePathMap.set(`${icon} ${resourceTitle}`, resourcePath);
      md += `${'#'.repeat(level + 1)} ${icon} ${resourceTitle}\n`;
    });
  }
  
  // Add subtopics
  if (node.subtopics) {
    const subtopicResults = { markdown: "", count_videos, count_notes };
    node.subtopics.forEach(child => {
      const childResult = apiToMarkdown(child, level + 1, currentPath, subtopicResults.count_videos, subtopicResults.count_notes);
      subtopicResults.markdown += childResult.markdown;
      subtopicResults.count_videos = childResult.count_videos;
      subtopicResults.count_notes = childResult.count_notes;
    });
    md += subtopicResults.markdown;
    count_videos = subtopicResults.count_videos;
    count_notes = subtopicResults.count_notes;
  }
  
  return { markdown: md, count_videos, count_notes };
}

function buildPathFromNode(nodeData: INode): string {
  const normalizedContent = normalizeText(nodeData.content);
  console.log("Original content:", nodeData.content, "Normalized:", normalizedContent);
  
  // Method 1: Try to use the stored path mapping with normalized content
  const directPath = nodePathMap.get(normalizedContent);
  if (directPath) {
    console.log("Found direct path mapping:", directPath);
    return directPath;
  }
  
  // Also try with original content in case normalization isn't needed
  const originalDirectPath = nodePathMap.get(nodeData.content);
  if (originalDirectPath) {
    console.log("Found direct path mapping with original content:", originalDirectPath);
    return originalDirectPath;
  }
  
  // Method 2: Build path by traversing ancestors if available
  const pathParts: string[] = [];
  let currentNode: INode | undefined = nodeData;
  
  // Collect all ancestors
  while (currentNode) {
    pathParts.unshift(normalizeText(currentNode.content));
    // Try different ways to access parent
    currentNode = (currentNode as any).parent || 
                  (currentNode as any).data?.parent ||
                  (currentNode as any).state?.parent;
  }
  
  const builtPath = pathParts.join(' > ');
  console.log("Built path from traversal:", builtPath);
  
  // Method 3: If traversal doesn't work, try to find by content matching
  if (builtPath === normalizedContent) {
    // Single node, try to find it in our resource map
    for (const [mapPath] of resourceMap.entries()) {
      const normalizedMapPath = normalizeText(mapPath);
      const cleanContent = normalizedContent.replace('🍿 ', '');
      
      if (normalizedMapPath.endsWith(normalizedContent) || 
          normalizedMapPath.endsWith(cleanContent) ||
          mapPath.endsWith(nodeData.content) || 
          mapPath.endsWith(nodeData.content.replace('🍿 ', ''))) {
        console.log("Found path by content matching:", mapPath);
        return mapPath;
      }
    }
  }
  
  return builtPath;
}

function createClickHandler(onLeafClick: (selection: any) => void) {
  return (event: MouseEvent) => {
    console.log("Click detected on:", event.target);
    const nodeG = (event.target as Element).closest('g.markmap-node') as SVGGElement;
    if (!nodeG) {
      console.log("No markmap-node found in the event path");
      return;
    }
    if (!(nodeG as any).__data__) {
      console.log("No __data__ found on node:", nodeG);
      return;
    }
    
    const nodeData = (nodeG as any).__data__ as INode;
    console.log("Node data found:", nodeData);
    const path = buildPathFromNode(nodeData);
    console.log("Final computed path:", path);
    console.log("All available paths in resourceMap:", Array.from(resourceMap.keys()));
    const mapItem = resourceMap.get(path);
    
    if (!mapItem) {
      return;
    }
    
    handleNodeSelection(mapItem, event, onLeafClick);
  };
}

function handleNodeSelection(
  mapItem: { node: ApiNode; resource?: ApiResource }, 
  event: MouseEvent, 
  onLeafClick: (selection: any) => void
) {
  const { node, resource } = mapItem;
  if (resource) {
    event.stopPropagation();
    console.log("Resource node clicked:", resource);
    const selection = {
      title: node.title,
      resources: [resource], // Just this specific resource
      resource: resource,    // Provide the specific resource that was clicked
      type: resource.type
    };
    console.log("About to call onLeafClick with:", selection);
    onLeafClick(selection);
    
    return;
  }
  if (node.is_end_node && node.resources && node.resources.length > 0) {
    event.stopPropagation();
    console.log("Topic node with resources clicked:", node);
    const selection = {
      title: node.title,
      resources: node.resources,
      type: node.resources[0]?.type
    };
    console.log("About to call onLeafClick with:", selection);
    onLeafClick(selection);
  }
}

interface MindMapProps {
  data: any;
  onLeafClick: (selection: any) => void;
  height?: string | number;
  width?: string | number;
  autoFit?: boolean;
}

const MindMap: React.FC<MindMapProps> = ({ 
  data, 
  onLeafClick,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const markmapRef = useRef<Markmap | null>(null);
  const transformer = new Transformer();
  const { resolvedTheme } = useTheme();
  const initializedRef = useRef(false);

  const [zoomLevel, setZoomLevel] = useState(1);
  const [is3DView] = useState(false);
  // This effect runs once to initialize the mind map
  useEffect(() => {
    console.log("MindMap component received data:", data);

    if (typeof window === 'undefined' || !svgRef.current || initializedRef.current) return;
    resourceMap.clear();
    nodePathMap.clear(); // Clear the path mapping as well
    
    try {
      let md;
      if (data) {
        // Initialize counters in local scope
        const { markdown } = apiToMarkdown(data);
        md = markdown;
        console.log("Generated markdown:", md);
        console.log("Resource map populated with paths:", Array.from(resourceMap.keys()));
        console.log("Node path map populated:", Array.from(nodePathMap.entries()));
      } else {
        md = "# No data available";
        console.error("No mindmap data provided");
      }
      
      const { root } = transformer.transform(md);     
      const mm = Markmap.create(svgRef.current, {
        autoFit: true,
        initialExpandLevel: 2,
        paddingX: 16,
        duration: 500,
      }, root);
      markmapRef.current = mm;
      initializedRef.current = true;

    } catch (error) {
      console.error("Error creating mindmap:", error);
    }
    const handleNodeClick = createClickHandler(onLeafClick);

    if (svgRef.current) {
      svgRef.current.removeEventListener('click', handleNodeClick);
      svgRef.current.addEventListener('click', handleNodeClick);     
      console.log("Enhanced click event listener attached to SVG element");
    } else {
      console.warn("svgRef.current is null, couldn't attach click handler");
    }

    const handleResize = () => {
      if (markmapRef.current) {
        markmapRef.current.fit();
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (svgRef.current) {
        svgRef.current.removeEventListener('click', handleNodeClick);
      }
    };
  }, [data, onLeafClick]); 

  const handleZoomIn = useCallback(() => {
    if (markmapRef.current) {
      markmapRef.current.rescale(zoomLevel + 0.2);
      setZoomLevel(prev => prev + 0.2);
    }
  }, [zoomLevel]);

  const handleZoomOut = useCallback(() => {
    if (markmapRef.current) {
      markmapRef.current.rescale(Math.max(0.3, zoomLevel - 0.2));
      setZoomLevel(prev => Math.max(0.3, prev - 0.2));
    }
  }, [zoomLevel]);

  const handleReset = useCallback(() => {
    if (markmapRef.current) {
      markmapRef.current.fit();
      setZoomLevel(1);
    }
  }, []);


  return (
    <div className="relative h-full w-full flex flex-col">
      {/* 3D perspective wrapper */}
      <div 
        className={`relative flex-1 transition-all duration-500 overflow-hidden rounded-xl border border-gray-300 dark:border-zinc-700 bg-gray-100/80 dark:bg-zinc-800/50 backdrop-blur-sm shadow-lg ${is3DView ? 'transform-style-3d perspective-1000' : ''}`}
      >
        {/* Animated background */}
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 dark:from-zinc-900 dark:via-zinc-800 dark:to-zinc-900 opacity-80">
          <div className="absolute inset-0 opacity-20 bg-grid-gray-300 dark:bg-grid-zinc-600/20 bg-[size:20px_20px]"></div>
        </div>
        
        {/* SVG container with 3D transformation when enabled */}
        <div 
          className={`relative z-10 w-full h-full transition-transform duration-500 ${
            is3DView ? 'transform rotate3d(1, 0, 0, 20deg)' : ''
          }`}
        >
          <svg 
            ref={svgRef} 
            className="w-full h-full" 
            style={{
              cursor: 'pointer',
              fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
              fontWeight: 500,
              fill: resolvedTheme === 'dark' ? '#ffffff' : '#1e293b',
              color: resolvedTheme === 'dark' ? '#ffffff' : '#1e293b'
            }}
          />
        </div>
        
        {/* Controls overlay */}
        <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-2 bg-white/90 dark:bg-zinc-800/90 p-2 rounded-lg border border-gray-300 dark:border-zinc-700 shadow-lg">
          <button 
            onClick={handleZoomIn} 
            className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 transition-colors"
            aria-label="Zoom in"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              <line x1="11" y1="8" x2="11" y2="14"></line>
              <line x1="8" y1="11" x2="14" y2="11"></line>
            </svg>
          </button>
          <button 
            onClick={handleZoomOut}
            className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 transition-colors"
            aria-label="Zoom out"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              <line x1="8" y1="11" x2="14" y2="11"></line>
            </svg>
          </button>
          <button 
            onClick={handleReset}
            className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 transition-colors"
            aria-label="Reset view"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
              <path d="M3 3v5h5"></path>
            </svg>
          </button>
        </div>
        
        {/* Short instruction text */}
        <div className="absolute top-4 left-4 z-20 bg-white/80 dark:bg-zinc-900/80 text-xs text-gray-700 dark:text-zinc-400 py-1 px-2 rounded border border-gray-300 dark:border-zinc-700 backdrop-blur-sm">
          Click topics to expand/collapse. Click resource nodes to view content.
        </div>
      </div>
    </div>
  );
}

export default MindMap