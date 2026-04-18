'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import { QuizAttempt, Quiz } from '@/lib/types';
import { toast } from 'sonner';
import { Clock, CheckCircle, XCircle, Award, ArrowLeft, RotateCcw, TrendingUp } from 'lucide-react';
import Link from 'next/link';

interface QuizAttemptWithDetails extends QuizAttempt {
  quiz: Quiz;
}

const QuizResultsPage = () => {
  const params = useParams();
  const router = useRouter();
  const attemptId = params.attemptId as string;
  const { data: session } = useSession();
  
  const [loading, setLoading] = useState<boolean>(true);
  const [attempt, setAttempt] = useState<QuizAttemptWithDetails | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      if (session?.user?.email) {
        try {
          const userResponse = await axios.get(`/api/users/by-email?email=${session.user.email}`);
          setUserId(userResponse.data._id);
        } catch (error) {
          toast.error('Failed to load user data', { description: error instanceof Error ? error.message : String(error) });
        }
      }
    };

    fetchUserData();
  }, [session]);

  // Fetch attempt data
  useEffect(() => {
    const fetchAttempt = async () => {
      if (!userId) {
        return;
      }
      
      try {
        const url = `/api/quiz/attempt/${attemptId}?userId=${userId}`;
        const response = await axios.get(url);
        setAttempt(response.data);
      } catch (error: any) {
        toast.error('Failed to load quiz results', { description: error instanceof Error ? error.message : String(error) });
        router.push('/');
      } finally {
        setLoading(false);
      }
    };

    fetchAttempt();
  }, [userId, attemptId, router]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600 dark:text-green-400';
    if (percentage >= 80) return 'text-blue-600 dark:text-blue-400';
    if (percentage >= 70) return 'text-yellow-600 dark:text-yellow-400';
    if (percentage >= 60) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getGradeBg = (percentage: number) => {
    if (percentage >= 90) return 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800';
    if (percentage >= 80) return 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800';
    if (percentage >= 70) return 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800';
    if (percentage >= 60) return 'bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800';
    return 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800';
  };

  const getGradeText = (percentage: number) => {
    if (percentage >= 90) return 'Excellent!';
    if (percentage >= 80) return 'Great Job!';
    if (percentage >= 70) return 'Good Work!';
    if (percentage >= 60) return 'Keep Practicing!';
    return 'Need More Study';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-t-4 border-blue-500 border-solid rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-700 dark:text-gray-300">Loading results...</p>
        </div>
      </div>
    );
  }

  if (!attempt || !userId) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <div className="max-w-md mx-auto p-8 bg-gray-50 dark:bg-black/90 rounded-2xl shadow-lg shadow-gray-500 border border-gray-100 dark:border-white/10">
          <h2 className="text-2xl font-bold text-red-500 mb-4">Error</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">Quiz results not found or access denied</p>
          <button 
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 transition-all duration-200"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const quiz = attempt.quiz || attempt.quizId;

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* Header */}
      <div className="border-b border-gray-100 dark:border-white/10">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-black dark:text-white mb-2 tracking-tight">Quiz Results</h1>
              <p className="text-gray-500 dark:text-white/70 text-lg">{quiz?.title || 'Loading...'}</p>
            </div>
            
            <Link
              href={`/exams/${(() => {
                let examId = '';
                if (quiz?.examId) {
                  if (
                    typeof quiz.examId === 'object' &&
                    quiz.examId !== null &&
                    typeof (quiz.examId as { _id?: string })._id === 'string'
                  ) {
                    examId = (quiz.examId as { _id: string })._id;
                  } else if (typeof quiz.examId === 'string') {
                    examId = quiz.examId;
                  }
                }
                return examId;
              })()}`}
              className="flex items-center gap-2 px-6 py-3 bg-gray-100 dark:bg-black/90 text-gray-700 dark:text-white/70 rounded-xl hover:bg-gray-200 dark:hover:bg-black/70 transition-all duration-200 border border-gray-200 dark:border-white/10"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Exam
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Score Overview */}
        <div className={`rounded-2xl border-2 p-12 mb-12 shadow-lg ${getGradeBg(attempt?.percentage || 0)}`}>
          <div className="text-center">
            <div className="flex items-center justify-center mb-6">
              <Award className={`h-20 w-20 ${getGradeColor(attempt?.percentage || 0)}`} />
            </div>
            <h2 className={`text-6xl font-bold mb-4 ${getGradeColor(attempt?.percentage || 0)}`}>
              {attempt?.percentage || 0}%
            </h2>
            <p className={`text-2xl font-semibold mb-6 ${getGradeColor(attempt?.percentage || 0)}`}>
              {getGradeText(attempt?.percentage || 0)}
            </p>
            <p className="text-xl text-gray-700 dark:text-gray-300">
              You scored {attempt?.score || 0} out of {quiz?.totalQuestions || 0} questions correctly
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-gray-50 dark:bg-black/90 rounded-2xl shadow-lg shadow-gray-500 border border-gray-100 dark:border-white/10 p-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-600 dark:text-white/70 uppercase tracking-wide">Score</h3>
                <p className="text-3xl font-bold text-black dark:text-white">
                  {attempt?.score || 0}/{quiz?.totalQuestions || 0}
                </p>
              </div>
              <CheckCircle className="h-10 w-10 text-green-500" />
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-black/90 rounded-2xl shadow-lg shadow-gray-500 border border-gray-100 dark:border-white/10 p-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-600 dark:text-white/70 uppercase tracking-wide">Time Taken</h3>
                <p className="text-3xl font-bold text-black dark:text-white">
                  {formatTime(attempt?.totalTimeTaken || 0)}
                </p>
              </div>
              <Clock className="h-10 w-10 text-blue-500" />
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-black/90 rounded-2xl shadow-lg shadow-gray-500 border border-gray-100 dark:border-white/10 p-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-600 dark:text-white/70 uppercase tracking-wide">Accuracy</h3>
                <p className="text-3xl font-bold text-black dark:text-white">
                  {attempt?.percentage || 0}%
                </p>
              </div>
              <TrendingUp className="h-10 w-10 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Question Review */}
        <div className="bg-gray-50 dark:bg-black/90 rounded-2xl shadow-lg shadow-gray-500 border border-gray-100 dark:border-white/10 overflow-hidden">
          <div className="bg-linear-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-black dark:via-gray-900 dark:to-black px-8 py-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Question Review</h2>
          </div>

          <div className="divide-y divide-gray-200 dark:divide-white/10">
            {quiz?.questions?.map((question, index) => {
              const userAnswer = attempt.answers?.find(a => a.questionIndex === index);
              const isCorrect = userAnswer?.isCorrect || false;

              return (
                <div key={index} className="p-8">
                  <div className="flex items-start gap-6">
                    <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                      isCorrect 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' 
                        : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                    }`}>
                      {isCorrect ? <CheckCircle className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-black dark:text-white mb-4">
                        {index + 1}. {question.question}
                      </h3>
                      
                      <div className="space-y-3 mb-6">
                        {question.options?.map((option, optionIndex) => {
                          const isSelected = userAnswer?.selectedOption === optionIndex;
                          const isCorrectOption = question.correctAnswer === optionIndex;
                          
                          return (
                            <div 
                              key={optionIndex} 
                              className={`p-4 rounded-xl border-2 ${
                                isCorrectOption 
                                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                                  : isSelected 
                                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' 
                                  : 'bg-gray-50 dark:bg-black/50 border-gray-200 dark:border-white/10'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-black dark:text-white font-medium">{option}</span>
                                <div className="flex items-center gap-2">
                                  {isCorrectOption && (
                                    <span className="text-xs font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full">
                                      Correct
                                    </span>
                                  )}
                                  {isSelected && !isCorrectOption && (
                                    <span className="text-xs font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-3 py-1 rounded-full">
                                      Your Answer
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      {question.explanation && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-4">
                          <h4 className="font-bold text-blue-800 dark:text-blue-200 mb-2">Explanation:</h4>
                          <p className="text-blue-700 dark:text-blue-300">{question.explanation}</p>
                        </div>
                      )}
                      
                      {userAnswer && (
                        <div className="mt-4 text-sm text-gray-500 dark:text-white/70">
                          Time taken: {formatTime(userAnswer.timeTaken)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-6 mt-12">
          <Link
            href={`/quiz-history`}
            className="flex items-center gap-3 px-8 py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-all duration-200 shadow-sm"
          >
            <TrendingUp className="h-5 w-5" />
            View All Results
          </Link>
          
          <Link
            href={`/quiz/${quiz?._id || ''}`}
            className="flex items-center gap-3 px-8 py-4 bg-black dark:bg-white text-white dark:text-black rounded-xl font-medium transition-all duration-200 hover:bg-gray-800 dark:hover:bg-gray-200 shadow-sm"
          >
            <RotateCcw className="h-5 w-5" />
            Retake Quiz
          </Link>
        </div>
      </div>
    </div>
  );
};

export default QuizResultsPage;
