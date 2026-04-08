'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { useRouter } from 'next/navigation';

interface Chapter {
  _id: string;
  title: string;
  content: string[];
}

interface QuizGenerationDialogProps {
  examId: string;
  userId: string;
  trigger: React.ReactNode;
  onQuizGenerated?: () => void;
}

export const QuizGenerationDialog: React.FC<QuizGenerationDialogProps> = ({ 
  examId, 
  userId, 
  trigger, 
  onQuizGenerated 
}) => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingChapters, setIsLoadingChapters] = useState(false);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [numberOfQuestions, setNumberOfQuestions] = useState(10);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapterIds, setSelectedChapterIds] = useState<string[]>([]);

  // Fetch chapters when dialog opens
  useEffect(() => {
    if (isOpen && chapters.length === 0) {
      fetchChapters();
    }
  }, [isOpen]);

  const fetchChapters = async () => {
    setIsLoadingChapters(true);
    try {
      const response = await axios.get(`/api/exams/chapters?examId=${examId}`);
      const fetchedChapters = response.data;
      setChapters(fetchedChapters);
      // Select all chapters by default
      setSelectedChapterIds(fetchedChapters.map((ch: Chapter) => ch._id));
    } catch (error) {
      console.error('Error fetching chapters:', error);
      toast.error('Failed to load chapters');
    } finally {
      setIsLoadingChapters(false);
    }
  };

  const handleChapterToggle = (chapterId: string) => {
    setSelectedChapterIds(prev => 
      prev.includes(chapterId)
        ? prev.filter(id => id !== chapterId)
        : [...prev, chapterId]
    );
  };

  const handleSelectAllChapters = () => {
    setSelectedChapterIds(chapters.map(ch => ch._id));
  };

  const handleDeselectAllChapters = () => {
    setSelectedChapterIds([]);
  };

  const handleGenerateQuiz = async () => {
    if (selectedChapterIds.length === 0) {
      toast.error('Please select at least one chapter');
      return;
    }

    setIsGenerating(true);
    toast.info('Starting quiz generation...');

    try {
      const result = await axios.post('/api/quiz/generate', {
        examId,
        userId,
        difficulty,
        numberOfQuestions,
        selectedChapterIds
      });

      // New async behavior: server returns 202 and started=true
      if (result.status === 202 && result.data?.started) {
        toast.success('Quiz generation started. You can view it soon in “View Quiz”.');
        setIsOpen(false);               // close popup immediately
        onQuizGenerated?.();            // notify parent if needed
        return;
      }

      // Backward-compat (if server still returns created quiz)
      if (result.data?.success && result.data?.quiz?._id) {
        toast.success('Quiz generated successfully!');
        setIsOpen(false);
        onQuizGenerated?.();
        // Navigate to quiz only if server actually returned a created quiz
        router.push(`/quiz/${result.data.quiz._id}`);
        return;
      }

      // Fallback error
      toast.error(`Failed to generate quiz: ${result.data?.error || 'Unknown error'}`);
    } catch (error: any) {
      console.error('Error generating quiz:', error);
      if (error?.response?.status === 409) {
        toast.error('Quiz generation already in progress for this user.');
      } else {
        toast.error('Failed to generate quiz. Please try again later.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const difficultyOptions = [
    { value: 'easy' as const, label: 'Easy' },
    { value: 'medium' as const, label: 'Medium' },
    { value: 'hard' as const, label: 'Hard' }
  ];

  const questionOptions = [5, 10, 15, 20, 25];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate Quiz
          </DialogTitle>
          <DialogDescription>
            Create a customized quiz based on your selected chapters.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Chapter Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Select Chapters</label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAllChapters}
                  disabled={isLoadingChapters}
                >
                  All
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDeselectAllChapters}
                  disabled={isLoadingChapters}
                >
                  None
                </Button>
              </div>
            </div>
            
            {isLoadingChapters ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm">Loading chapters...</span>
              </div>
            ) : (
              <div className="max-h-32 overflow-y-auto border rounded p-2 space-y-1">
                {chapters.map((chapter) => (
                  <label
                    key={chapter._id}
                    className="flex items-center space-x-2 p-1 rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <input
                      type="checkbox"
                      checked={selectedChapterIds.includes(chapter._id)}
                      onChange={() => handleChapterToggle(chapter._id)}
                      className="rounded text-blue-600"
                    />
                    <BookOpen className="h-3 w-3 text-gray-500" />
                    <span className="text-sm flex-1">{chapter.title}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Difficulty Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">Difficulty</label>
            <div className="grid grid-cols-3 gap-2">
              {difficultyOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setDifficulty(option.value)}
                  className={`p-2 text-sm rounded border transition-colors ${
                    difficulty === option.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Number of Questions */}
          <div>
            <label className="text-sm font-medium mb-2 block">Questions</label>
            <div className="grid grid-cols-5 gap-2">
              {questionOptions.map((num) => (
                <button
                  key={num}
                  onClick={() => setNumberOfQuestions(num)}
                  className={`p-2 text-sm rounded border transition-colors ${
                    numberOfQuestions === num
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerateQuiz}
            disabled={isGenerating || selectedChapterIds.length === 0 || isLoadingChapters}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate Quiz'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};