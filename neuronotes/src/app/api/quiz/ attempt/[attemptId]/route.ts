import { NextRequest, NextResponse } from 'next/server';
import { QuizAttempt, Quiz } from '../../../../../lib/db/model';
import { connectToDatabase } from '../../../../../lib/db/mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  try {
    await connectToDatabase();
    
    const { attemptId } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const attempt = await QuizAttempt.findOne({ _id: attemptId, userId })
      .populate({
        path: 'quizId',
        populate: {
          path: 'examId',
          select: 'subjectName description'
        }
      });

    if (!attempt) {
      return NextResponse.json(
        { error: "Quiz attempt not found or access denied" },
        { status: 404 }
      );
    }

    // Ensure we have the full quiz data with questions for the results page
    const fullQuiz = await Quiz.findById(attempt.quizId);
    if (fullQuiz) {
      attempt.quizId = fullQuiz;
    }

    return NextResponse.json(attempt);
  } catch (error: any) {
    console.error('Error fetching quiz attempt:', error);
    return NextResponse.json(
      { error: "Failed to fetch quiz attempt" },
      { status: 500 }
    );
  }
}