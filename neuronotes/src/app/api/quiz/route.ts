import { NextRequest, NextResponse } from 'next/server';
import { Quiz } from '../../../lib/db/model';
import { connectToDatabase } from '../../../lib/db/mongoose';

// GET /api/quiz - Get all quizzes for a user
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const examId = searchParams.get('examId');
    
    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const query: any = { userId };
    if (examId) {
      query.examId = examId;
    }

    const quizzes = await Quiz.find(query)
      .populate('examId', 'subjectName description')
      .sort({ createdAt: -1 })
      .select('-questions'); // Don't send questions in list view for security

    return NextResponse.json(quizzes);
  } catch (error: any) {
    console.error('Error fetching quizzes:', error);
    return NextResponse.json(
      { error: "Failed to fetch quizzes" },
      { status: 500 }
    );
  }
}

// DELETE /api/quiz - Delete a quiz
export async function DELETE(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const quizId = searchParams.get('quizId');
    const userId = searchParams.get('userId');
    
    if (!quizId || !userId) {
      return NextResponse.json(
        { error: "Quiz ID and User ID are required" },
        { status: 400 }
      );
    }

    const deletedQuiz = await Quiz.findOneAndDelete({ _id: quizId, userId });
    
    if (!deletedQuiz) {
      return NextResponse.json(
        { error: "Quiz not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: "Quiz deleted successfully" });
  } catch (error: any) {
    console.error('Error deleting quiz:', error);
    return NextResponse.json(
      { error: "Failed to delete quiz" },
      { status: 500 }
    );
  }
}