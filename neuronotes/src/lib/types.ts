
// These interfaces should match the schema definitions in models.js
export interface ExamData {
  _id: string;
  userId: string;
  subjectName: string;
  description?: string;
  createdAt: string | Date;
  examDate: string | Date;
}

export interface Chapter {
  _id: string;
  examId: string;
  title: string;
  content: string[];
  mindmapId?: string | null;
}

export interface Notes {
  _id: string;
  content: Record<string, any>;
  createdAt: string | Date;
}

export interface MindMap {
  _id: string;
  chapterId: string;
  content: any;
  createdAt: string | Date;
}

export interface ExamCardProps {
  exam: ExamData;
  type: 'current' | 'completed';
}


export interface ExamsListProps {
  title: string;
  exams: ExamData[];
  type: 'current' | 'completed';
  onAddExam?: () => void;
}

export interface AddExamCardProps {
  onSave: (examData: ExamData) => void
  onCancel: () => void
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

export interface Quiz {
  _id: string;
  examId: string;
  userId: string;
  title: string;
  description?: string;
  questions: QuizQuestion[];
  timeLimit: number; // in minutes
  difficulty: 'easy' | 'medium' | 'hard';
  totalQuestions: number;
  createdAt: string | Date;
}

export interface QuizAnswer {
  questionIndex: number;
  selectedOption: number;
  isCorrect: boolean;
  timeTaken: number; // in seconds
}

export interface QuizAttempt {
  _id: string;
  quizId: string;
  userId: string;
  answers: QuizAnswer[];
  score: number;
  percentage: number;
  totalTimeTaken: number; // in seconds
  completedAt: string | Date;
  startedAt: string | Date;
}

export interface QuizAttemptWithQuiz extends QuizAttempt {
  quiz: Quiz;
}