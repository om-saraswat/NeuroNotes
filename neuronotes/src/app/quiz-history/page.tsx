'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import { QuizAttemptWithQuiz } from '../../lib/types';
import { toast } from 'sonner';
import { Clock, Award, TrendingUp, Filter, Calendar, BookOpen, Eye, Info } from 'lucide-react';
import Link from 'next/link';

const QuizHistoryContent = () => {
  const searchParams = useSearchParams();
  const examId = searchParams.get('examId');
  const { data: session } = useSession();
  
  const [loading, setLoading] = useState<boolean>(true);
  const [attempts, setAttempts] = useState<QuizAttemptWithQuiz[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [filteredAttempts, setFilteredAttempts] = useState<QuizAttemptWithQuiz[]>([]);
  const [filter, setFilter] = useState<'all' | 'excellent' | 'good' | 'average' | 'poor'>('all');
  const [expandedQuizInfoId, setExpandedQuizInfoId] = useState<string | null>(null);

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

  // Fetch quiz attempts
  useEffect(() => {
    const fetchAttempts = async () => {
      if (!userId) {
        return;
      }
      
      try {
        const url = `/api/quiz/attempt?userId=${userId}`;
        
        if (examId) {
          const quizzesUrl = `/api/quiz?userId=${userId}&examId=${examId}`;
          const quizzesResponse = await axios.get(quizzesUrl);
          const quizzes = quizzesResponse.data;
          
          const attemptPromises = quizzes.map((quiz: any) => {
            const attemptUrl = `/api/quiz/attempt?userId=${userId}&quizId=${quiz._id}`;
            return axios.get(attemptUrl);
          });
          
          const attemptResponses = await Promise.all(attemptPromises);
          const allAttempts = attemptResponses.flatMap(response => response.data);
          setAttempts(allAttempts);
        } else {
          const response = await axios.get(url);
          setAttempts(response.data);
        }
      } catch (error: any) {
        toast.error('Failed to load quiz history', { description: error instanceof Error ? error.message : String(error) });
      } finally {
        setLoading(false);
      }
    };

    fetchAttempts();
  }, [userId, examId]);

  // Filter attempts based on performance
  useEffect(() => {
    let filtered = attempts;
    
    switch (filter) {
      case 'excellent':
        filtered = attempts.filter(attempt => attempt.percentage >= 90);
        break;
      case 'good':
        filtered = attempts.filter(attempt => attempt.percentage >= 70 && attempt.percentage < 90);
        break;
      case 'average':
        filtered = attempts.filter(attempt => attempt.percentage >= 50 && attempt.percentage < 70);
        break;
      case 'poor':
        filtered = attempts.filter(attempt => attempt.percentage < 50);
        break;
      default:
        filtered = attempts;
    }
    
    setFilteredAttempts(filtered);
  }, [attempts, filter]);

  const formatDate = (dateString: string | Date) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format time in hh:mm:ss format
  const formatTime = (seconds: number) => {
    if (typeof seconds !== 'number' || isNaN(seconds)) return 'N/A';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return [
      h > 0 ? String(h).padStart(2, '0') : null,
      String(m).padStart(2, '0'),
      String(s).padStart(2, '0')
    ].filter(Boolean).join(':');
  };

  const extractChaptersFromTitle: (title: string) => string[] = (title: string) => {
    const start = title.lastIndexOf('(');
    const end = title.lastIndexOf(')');
    if (start !== -1 && end !== -1 && end > start) {
      const inner = title.slice(start + 1, end);
      return inner.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [];
  };

  const getPerformanceBadge = (percentage: number) => {
    if (percentage >= 90) return { text: 'Excellent', color: 'bg-green-100 text-green-800 border-green-200' };
    if (percentage >= 70) return { text: 'Good', color: 'bg-blue-100 text-blue-800 border-blue-200' };
    if (percentage >= 50) return { text: 'Average', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
    return { text: 'Needs Work', color: 'bg-red-100 text-red-800 border-red-200' };
  };

  const getStats = () => {
    if (filteredAttempts.length === 0) {
      return { avgScore: 0, totalQuizzes: 0, bestScore: 0 };
    }
    
    const avgScore = Math.round(filteredAttempts.reduce((sum, attempt) => sum + attempt.percentage, 0) / filteredAttempts.length);
    const bestScore = Math.max(...filteredAttempts.map(attempt => attempt.percentage));
    
    return {
      avgScore,
      totalQuizzes: filteredAttempts.length,
      bestScore
    };
  };

  const stats = getStats();

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-t-4 border-blue-500 border-solid rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-700 dark:text-gray-300">Loading quiz history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* Header */}
      <div className="border-b border-gray-100 dark:border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-black dark:text-white mb-3 tracking-tight">Quiz History</h1>
              <p className="text-gray-500 dark:text-white/70 text-lg">
                {examId ? 'Quiz attempts for this exam' : 'All your quiz attempts'}
              </p>
            </div>
            
            {examId && (
              <Link
                href={`/exams/${examId}`}
                className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl font-medium transition-all duration-200 hover:bg-gray-800 dark:hover:bg-gray-200 shadow-sm"
              >
                Back to Exam
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-gray-50 dark:bg-black/90 rounded-2xl shadow-lg shadow-gray-500 border border-gray-100 dark:border-white/10 p-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-600 dark:text-white/70 uppercase tracking-wide">Total Quizzes</h3>
                <p className="text-4xl font-bold text-black dark:text-white">{stats.totalQuizzes}</p>
              </div>
              <BookOpen className="h-12 w-12 text-blue-500" />
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-black/90 rounded-2xl shadow-lg shadow-gray-500 border border-gray-100 dark:border-white/10 p-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-600 dark:text-white/70 uppercase tracking-wide">Average Score</h3>
                <p className="text-4xl font-bold text-black dark:text-white">{stats.avgScore}%</p>
              </div>
              <TrendingUp className="h-12 w-12 text-green-500" />
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-black/90 rounded-2xl shadow-lg shadow-gray-500 border border-gray-100 dark:border-white/10 p-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-600 dark:text-white/70 uppercase tracking-wide">Best Score</h3>
                <p className="text-4xl font-bold text-black dark:text-white">{stats.bestScore}%</p>
              </div>
              <Award className="h-12 w-12 text-yellow-500" />
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="bg-gray-50 dark:bg-black/90 rounded-2xl shadow-lg shadow-gray-500 border border-gray-100 dark:border-white/10 p-6 mb-8">
          <div className="flex items-center gap-4 flex-wrap">
            <Filter className="h-5 w-5 text-blue-500" />
            <span className="text-sm font-semibold text-gray-600 dark:text-white/70 uppercase tracking-wide">Filter by performance:</span>
            
            <div className="flex gap-2 flex-wrap">
              {[
                { value: 'all', label: 'All' },
                { value: 'excellent', label: 'Excellent (90%+)' },
                { value: 'good', label: 'Good (70-89%)' },
                { value: 'average', label: 'Average (50-69%)' },
                { value: 'poor', label: 'Below 50%' }
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setFilter(option.value as any);
                  }}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    filter === option.value
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'bg-gray-200 dark:bg-black/70 text-gray-700 dark:text-white/70 hover:bg-gray-300 dark:hover:bg-black/50 border border-gray-300 dark:border-white/20'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Quiz Attempts List */}
        {filteredAttempts.length === 0 ? (
          <div className="bg-gray-50 dark:bg-black/90 rounded-2xl shadow-lg shadow-gray-500 border border-gray-100 dark:border-white/10 p-12 text-center">
            <BookOpen className="h-20 w-20 text-gray-400 dark:text-white/50 mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-black dark:text-white mb-3">No Quiz Attempts Found</h3>
            <p className="text-gray-500 dark:text-white/70 mb-6 text-lg">
              {filter === 'all' ? 'You haven\'t taken any quizzes yet.' : `No quizzes found with ${filter} performance.`}
            </p>
            {!examId && (
              <Link
                href="/"
                className="inline-flex items-center px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl font-medium transition-all duration-200 hover:bg-gray-800 dark:hover:bg-gray-200 shadow-sm"
              >
                Browse Exams
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {filteredAttempts.map((attempt) => {
              const badge = getPerformanceBadge(attempt.percentage);
              const quiz = attempt.quiz || attempt.quizId;
              const examName =
                quiz?.examId && typeof quiz.examId === 'object' && 'subjectName' in quiz.examId
                  ? (quiz.examId as any).subjectName
                  : 'Subject';
              const shortName = `${examName}`;
              const chaptersUsed = extractChaptersFromTitle(quiz?.title || '');
              const isExpanded = expandedQuizInfoId === (quiz?._id || '');

              return (
                <div key={attempt._id} className="bg-gray-50 dark:bg-black/90 rounded-2xl shadow-lg shadow-gray-500 border border-gray-100 dark:border-white/10 overflow-hidden hover:shadow-xl hover:shadow-gray-600 transition-all duration-300">
                  <div className="p-8">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-2xl font-bold text-black dark:text-white">{shortName}</h3>
                          <button
                            type="button"
                            onClick={() => setExpandedQuizInfoId(isExpanded ? null : (quiz?._id || ''))}
                            className="inline-flex items-center justify-center rounded p-1 hover:bg-gray-100 dark:hover:bg-black/70"
                            title="Show chapters used"
                            aria-label="Show chapters used"
                          >
                            <Info className="h-4 w-4 text-gray-500 dark:text-white/70" />
                          </button>
                        </div>
                        {isExpanded && (
                          <p className="text-sm text-gray-600 dark:text-white/70 mb-1">
                            Chapters: {chaptersUsed.length ? chaptersUsed.join(', ') : 'Unavailable'}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <span className={`px-4 py-2 rounded-xl text-sm font-bold border ${badge.color}`}>
                          {badge.text}
                        </span>
                        
                        <Link
                          href={`/quiz/results/${attempt._id}`}
                          className="flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-all duration-200 shadow-sm"
                        >
                          <Eye className="h-4 w-4" />
                          View Details
                        </Link>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div className="flex items-center gap-3">
                        <Award className="h-5 w-5 text-blue-500" />
                        <div>
                          <span className="text-sm text-gray-500 dark:text-white/70">Score:</span>
                          <p className="font-bold text-black dark:text-white">
                            {attempt.score}/{quiz?.totalQuestions || 0} ({attempt.percentage}%)
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-blue-500" />
                        <div>
                          <span className="text-sm text-gray-500 dark:text-white/70">Time:</span>
                          <p className="font-bold text-black dark:text-white">
                            {formatTime(attempt.totalTimeTaken)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-blue-500" />
                        <div>
                          <span className="text-sm text-gray-500 dark:text-white/70">Date:</span>
                          <p className="font-bold text-black dark:text-white">
                            {formatDate(attempt.completedAt)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <TrendingUp className="h-5 w-5 text-blue-500" />
                        <div>
                          <span className="text-sm text-gray-500 dark:text-white/70">Difficulty:</span>
                          <p className="font-bold text-black dark:text-white capitalize">
                            {quiz?.difficulty || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const QuizHistoryPage = () => {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-t-4 border-blue-500 border-solid rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-700 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    }>
      <QuizHistoryContent />
    </Suspense>
  );
};

export default QuizHistoryPage;