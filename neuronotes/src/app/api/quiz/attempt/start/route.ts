import { NextRequest, NextResponse } from 'next/server';
import { QuizAttempt, Quiz } from '../../../../../lib/db/model';
import { connectToDatabase } from '../../../../../lib/db/mongoose';

// POST - Submit quiz answer or final submission
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { quizId, userId, answers, startedAt, isComplete = false, questionIndex, selectedOption } = await request.json();
    
    if (!quizId || !userId || !startedAt) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get quiz to validate and calculate scores
    const quiz = await Quiz.findOne({ _id: quizId, userId });
    if (!quiz) {
      return NextResponse.json(
        { error: "Quiz not found or access denied" },
        { status: 404 }
      );
    }

    // Check if attempt already exists
    let quizAttempt = await QuizAttempt.findOne({ 
      quizId, 
      userId, 
      startedAt: new Date(startedAt) 
    });

    if (!quizAttempt) {
      // Create new attempt if it doesn't exist
      quizAttempt = new QuizAttempt({
        quizId,
        userId,
        answers: [],
        score: 0,
        percentage: 0,
        totalTimeTaken: 0,
        completedAt: null,
        startedAt: new Date(startedAt),
        isComplete: false
      });
    }

    // Handle single question submission (real-time saving)
    if (!isComplete && questionIndex !== undefined && selectedOption !== undefined) {
      // Update or add the answer for this question
      const existingAnswerIndex = quizAttempt.answers.findIndex(
        (answer: any) => answer.questionIndex === questionIndex
      );

      const question = quiz.questions[questionIndex];
      const isCorrect = question.correctAnswer === selectedOption;
      const answerData = {
        questionIndex,
        selectedOption,
        isCorrect,
        timeTaken: Math.round((new Date().getTime() - new Date(startedAt).getTime()) / 1000)
      };

      if (existingAnswerIndex >= 0) {
        quizAttempt.answers[existingAnswerIndex] = answerData;
      } else {
        quizAttempt.answers.push(answerData);
      }

      await quizAttempt.save();

      return NextResponse.json({
        success: true,
        message: "Answer saved",
        attemptId: quizAttempt._id
      });
    }

    // Handle final submission or auto-submission
    if (isComplete || answers) {
      // Use provided answers or current saved answers
      const finalAnswers = answers || quizAttempt.answers;
      
      // Calculate final score
      let correctAnswers = 0;
      const processedAnswers = finalAnswers.map((answer: any) => {
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
      const totalTimeTaken = Math.round((completedAt.getTime() - new Date(startedAt).getTime()) / 1000);

      // Update the attempt with final data
      quizAttempt.answers = processedAnswers;
      quizAttempt.score = score;
      quizAttempt.percentage = percentage;
      quizAttempt.totalTimeTaken = totalTimeTaken;
      quizAttempt.completedAt = completedAt;
      quizAttempt.isComplete = true;

      await quizAttempt.save();

      return NextResponse.json({
        success: true,
        attempt: {
          _id: quizAttempt._id,
          score,
          percentage,
          totalTimeTaken,
          completedAt: quizAttempt.completedAt
        }
      });
    }

    return NextResponse.json(
      { error: "Invalid request parameters" },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('Error handling quiz attempt:', error);
    return NextResponse.json(
      { error: "Failed to handle quiz attempt" },
      { status: 500 }
    );
  }
}

// GET quiz attempts for a user
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const quizId = searchParams.get('quizId');
    
    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const query: any = { userId };
    if (quizId) {
      query.quizId = quizId;
    }

    const attempts = await QuizAttempt.find(query)
      .populate({
        path: 'quizId',
        select: 'title description totalQuestions timeLimit difficulty',
        populate: {
          path: 'examId',
          select: 'subjectName'
        }
      })
      .sort({ completedAt: -1 });

    return NextResponse.json(attempts);
  } catch (error: any) {
    console.error('Error fetching quiz attempts:', error);
    return NextResponse.json(
      { error: "Failed to fetch quiz attempts" },
      { status: 500 }
    );
  }
}