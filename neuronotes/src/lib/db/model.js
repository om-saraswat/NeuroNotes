import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  image: { type: String },
  createdAt: { type: Date, default: Date.now }
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
chapterSchema.index({ ExamId: 1 });

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
  
export const User = mongoose.models.User || mongoose.model('User', userSchema);
export const Exam = mongoose.models.Exam || mongoose.model('Exam', ExamSchema);
export const Chapter = mongoose.models.Chapter || mongoose.model('Chapter', chapterSchema);
export const Notes = mongoose.models.Notes || mongoose.model('Notes', notesSchema);
export const MindMap = mongoose.models.MindMap || mongoose.model('MindMap', mindMapSchema);
