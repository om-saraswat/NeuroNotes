import { NextRequest, NextResponse } from 'next/server';
import { QuizAttempt, Quiz } from '../../../../../lib/db/model';
import { connectToDatabase } from '../../../../../lib/db/mongoose';

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { quizId, userId, startedAt } = await request.json();
    
    if (!quizId || !userId || !startedAt) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Find the existing attempt
    const quizAttempt = await QuizAttempt.findOne({ 
      quizId, 
      userId, 
      startedAt: new Date(startedAt),
      isComplete: false
    });

    if (!quizAttempt) {
      return NextResponse.json(
        { error: "Quiz attempt not found or already completed" },
        { status: 404 }
      );
    }

    // Get quiz for scoring
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return NextResponse.json(
        { error: "Quiz not found" },
        { status: 404 }
      );
    }

    // Calculate final score from saved answers
    let correctAnswers = 0;
    const processedAnswers = quizAttempt.answers.map((answer: any) => {
      const question = quiz.questions[answer.questionIndex];
      const isCorrect = question.correctAnswer === answer.selectedOption;
      if (isCorrect) correctAnswers++;
      
      return {
        questionIndex: answer.questionIndex,
        selectedOption: answer.selectedOption,
        isCorrect,
        timeTaken: answer.timeTaken || 0
      };
    });

    const score = correctAnswers;
    const percentage = Math.round((correctAnswers / quiz.totalQuestions) * 100);
    const completedAt = new Date();
    const totalTimeTaken = quiz.timeLimit * 60; // Full time limit in seconds

    // Update the attempt as completed
    quizAttempt.answers = processedAnswers;
    quizAttempt.score = score;
    quizAttempt.percentage = percentage;
    quizAttempt.totalTimeTaken = totalTimeTaken;
    quizAttempt.completedAt = completedAt;
    quizAttempt.isComplete = true;

    await quizAttempt.save();

    return NextResponse.json({
      success: true,
      message: "Quiz auto-submitted due to time expiry",
      attempt: {
        _id: quizAttempt._id,
        score,
        percentage,
        totalTimeTaken,
        completedAt: quizAttempt.completedAt
      }
    });

  } catch (error: any) {
    console.error('Error auto-submitting quiz:', error);
    return NextResponse.json(
      { error: "Failed to auto-submit quiz" },
      { status: 500 }
    );
  }
}