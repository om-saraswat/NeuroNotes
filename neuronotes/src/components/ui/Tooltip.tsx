import React, { useState } from 'react';
import Image from 'next/image';

interface TooltipProps {
  children: React.ReactNode;
  imageUrl: string;
  alt: string;
  width?: number;
  height?: number;
}

export function ImageTooltip({ children, imageUrl, alt, width = 400, height = 300 }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  
  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      <div className="inline-flex items-center cursor-pointer">
        {children}
      </div>
      {isVisible && (
        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 z-50">
          <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
            <Image 
              src={imageUrl} 
              alt={alt}
              width={width}
              height={height}
              className="rounded-lg max-w-[500px] max-h-[400px] w-auto h-auto"
            />
          </div>
          <div className="w-3 h-3 bg-white dark:bg-gray-800 transform rotate-45 absolute -bottom-1.5 left-1/2 ml-[-6px] border-r border-b border-gray-200 dark:border-gray-700"></div>
        </div>
      )}
    </div>
  );
}
