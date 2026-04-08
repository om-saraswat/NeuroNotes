"use client";
import React, { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { ImageTooltip } from './ui/Tooltip';

export function Footer() {
  const [supportImageUrl, setSupportImageUrl] = useState<string>('');
  
  useEffect(() => {
    // 50/50 probability to select between the two images
    const images = [
      'https://res.cloudinary.com/drdt8dznr/image/upload/c_fill,w_326,h_307/v1751218404/WhatsApp_Image_2025-06-29_at_23.02.09_2a0c723b_tvoa70.jpg',
      'https://res.cloudinary.com/drdt8dznr/image/upload/v1751218075/Screenshot_2025-06-19_220857_ygfark.png',
    ];
    
    const randomIndex = Math.floor(Math.random() * 2);
    setSupportImageUrl(images[randomIndex]);
  }, []);

  return (
    <footer className="w-full py-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center space-x-1">
            <span className="text-sm">© {new Date().getFullYear()} YouEducation</span>
            <span className="mx-2">•</span>
            <ImageTooltip 
              imageUrl={supportImageUrl}
              alt="Support Us"
              width={500}
              height={400}
            >
              <span className="flex items-center hover:text-rose-500 transition-colors duration-300 cursor-pointer">
                Support Us 
                <Heart className="ml-1 h-4 w-4 fill-current" />
              </span>
            </ImageTooltip>
          </div>
        </div>
      </div>
    </footer>
  );
}