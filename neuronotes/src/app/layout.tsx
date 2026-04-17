// @ts-nocheck
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";
import { ThemeProvider } from "next-themes";
import SessionWrapper from "@/components/SessionWrapper";
import { Toaster } from "@/components/ui/sonner";
import Navbar from "@/components/Navbar";
import { VideoPlayerProvider } from '../context/VideoPlayerContext';
import React from 'react';

export const metadata: Metadata = {
  title: "NeuroNotes",
  description: "A comprehensive educational platform that transforms traditional learning through AI-powered mind maps, interactive video content, and intelligent note generation. YouEducation makes complex subjects accessible by organizing educational content into visual, hierarchical structures with integrated YouTube videos and automatically generated study notes.",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <SessionWrapper>
        <body className={`min-h-screen flex flex-col bg-white dark:bg-gray-950 ${geistSans.variable} ${geistMono.variable}`}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <Navbar />
            <VideoPlayerProvider>
              <main className="grow">
                {children}
              </main>
            </VideoPlayerProvider>
          </ThemeProvider>
          <Toaster />
        </body>
      </SessionWrapper>
    </html>
  );
}