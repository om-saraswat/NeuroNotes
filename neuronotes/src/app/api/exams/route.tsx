import { Exam } from '../../../lib/db/model';
import { connectToDatabase } from '../../../lib/db/mongoose';
import { NextResponse, NextRequest } from 'next/server';
import { getToken } from "next-auth/jwt";
import mongoose from "mongoose";

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase(); // Connect inside the handler

    // This will extract and verify the session token from cookies/headers
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

    if (!token || !token.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch exams for this user only
    const Exams = await Exam.find({ userId: token.id });
    return NextResponse.json(Exams, { status: 200 });
  } catch (error) {
    console.error('Error fetching Exams:', error);
    return NextResponse.json({ error: 'Failed to fetch Exams' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {  
    try {
        await connectToDatabase();

        const { userId, subjectName, description, examDate} = await request.json();

        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
          return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
        }

        const newExam = new Exam({ userId, subjectName, description, examDate });

        // check if Exam already exists
        const existingExam = await Exam.findOne({ userId, subjectName });
        if (existingExam) {
            return NextResponse.json({ error: 'Exam already exists' }, { status: 400 });
        }

        await newExam.save();
        return NextResponse.json(newExam.toObject(), { status: 201 });
    } catch (error) {
        console.error('Error creating exam:', error);
        return NextResponse.json({ error: 'Failed to create exam' }, { status: 500 });
    }
}