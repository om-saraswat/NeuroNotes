import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  image: { type: String },
  isGeneratingMindMap: { type: Boolean, default: false }, 
  isGeneratingQuiz: { type: Boolean, default: false }, 
  createdAt: { type: Date, default: Date.now }
});

// New: per-user generation status collection
const userGenerationStatusSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, required: true },
  isGeneratingMindMap: { type: Boolean, default: false },
  isGeneratingQuiz: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
userGenerationStatusSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

const ExamSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subjectName: { type: String, required: true },
  description: { type: String },
  createdAt: { type: Date, default: Date.now },
  examDate: { type: Date },
});
ExamSchema.index({ userId: 1 });

const chapterSchema = new mongoose.Schema({
  examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
  title: { type: String, required: true },
  content: { type: [String], required: true},
  mindmapId: { type: mongoose.Schema.Types.ObjectId, ref: 'MindMap' },
  order: { type: Number, default: 0 }, // Adding order field to maintain chapter sequence
});
chapterSchema.index({ examId: 1 });

const notesSchema = new mongoose.Schema({
  content: { 
    type: mongoose.Schema.Types.Mixed, 
    required: false, 
    default: null  
  }, 
  description: { type: String, required: true }, // Description is required
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const mindMapSchema = new mongoose.Schema({
  chapterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chapter', required: true },
  content: { type: mongoose.Schema.Types.Mixed, required: true },
  createdAt: { type: Date, default: Date.now }
});

const quizSchema = new mongoose.Schema({
  examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String },
  questions: [{
    question: { type: String, required: true },
    options: [{ type: String, required: true }],
    correctAnswer: { type: Number, required: true }, // Index of correct option (0-3)
    explanation: { type: String }
  }],
  timeLimit: { type: Number, required: true }, // Time limit in minutes
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  totalQuestions: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});
quizSchema.index({ examId: 1, userId: 1 });

const quizAttemptSchema = new mongoose.Schema({
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  answers: [{
    questionIndex: { type: Number, required: true },
    selectedOption: { type: Number, required: true }, // Index of selected option
    isCorrect: { type: Boolean, required: true },
    timeTaken: { type: Number, default: 0 } // Time taken for this question in seconds
  }],
  score: { type: Number, required: true }, // Score out of totalQuestions
  percentage: { type: Number, required: true }, // Percentage score
  totalTimeTaken: { type: Number, required: true }, // Total time taken in seconds
  completedAt: { type: Date, default: Date.now },
  startedAt: { type: Date, required: true }
});
quizAttemptSchema.index({ quizId: 1, userId: 1 });
quizAttemptSchema.index({ userId: 1, completedAt: -1 });
  
export const User = mongoose.models.User || mongoose.model('User', userSchema);
export const Exam = mongoose.models.Exam || mongoose.model('Exam', ExamSchema);
export const Chapter = mongoose.models.Chapter || mongoose.model('Chapter', chapterSchema);
export const Notes = mongoose.models.Notes || mongoose.model('Notes', notesSchema);
export const MindMap = mongoose.models.MindMap || mongoose.model('MindMap', mindMapSchema);
export const Quiz = mongoose.models.Quiz || mongoose.model('Quiz', quizSchema);
export const QuizAttempt = mongoose.models.QuizAttempt || mongoose.model('QuizAttempt', quizAttemptSchema);
export const UserGenerationStatus = mongoose.models.UserGenerationStatus || mongoose.model('UserGenerationStatus', userGenerationStatusSchema);