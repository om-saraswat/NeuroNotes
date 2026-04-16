import { NextRequest, NextResponse } from 'next/server';
import { Quiz } from '../../../../lib/db/model';
import { connectToDatabase } from '../../../../lib/db/mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    await connectToDatabase();
    
    const { quizId } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const includeAnswers = searchParams.get('includeAnswers') === 'true';
    
    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    let quiz;
    if (includeAnswers) {
      // Include answers for review/results page
      quiz = await Quiz.findOne({ _id: quizId, userId })
        .populate('examId', 'subjectName description');
    } else {
      // Exclude correct answers for taking the quiz
      quiz = await Quiz.findOne({ _id: quizId, userId })
        .populate('examId', 'subjectName description')
        .select('-questions.correctAnswer -questions.explanation');
    }

    if (!quiz) {
      return NextResponse.json(
        { error: "Quiz not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json(quiz);
  } catch (error: any) {
    console.error('Error fetching quiz:', error);
    return NextResponse.json(
      { error: "Failed to fetch quiz" },
      { status: 500 }
    );
  }
}