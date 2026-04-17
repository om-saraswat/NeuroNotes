import { Chapter } from '../../../../lib/db/model';
import { connectToDatabase } from '../../../../lib/db/mongoose';
import { NextResponse, NextRequest } from 'next/server';

// GET all chapters for a specific exam
export async function GET(request: NextRequest) {
    try {
        await connectToDatabase(); // Connect inside the handler
        
        const { searchParams } = new URL(request.url);
        const examId = searchParams.get('examId');
        
        if (!examId) {
            return NextResponse.json({error: 'Exam ID is required'}, {status: 400});
        }

        // Find all chapters associated with this exam and sort them by order field
        const chapters = await Chapter.find({ examId: examId }).sort({ order: 1 });
        return NextResponse.json(chapters, { status: 200 });
    } catch (error) {
        console.error('Error fetching chapters:', error);
        return NextResponse.json({error: 'Failed to fetch chapters'}, {status: 500});
    }
}

// POST request to create a new chapters for an exam
export async function POST(request: NextRequest) {
    try {
        await connectToDatabase(); 
        
        const {examId, chapters} = await request.json();
        if (!examId || !chapters || !Array.isArray(chapters)) {
            return NextResponse.json({error: 'Invalid request data'}, {status: 400});
        }
        
        // Create new chapters in the database with mindmapId explicitly set to null
        // and add an order property to maintain insertion order
        const chaptersToCreate = chapters.map((chapter, index) => ({
            ...chapter,
            examId,
            mindmapId: null,
            order: index // Add order based on the array index
        }));
        
        const createdChapters = await Chapter.insertMany(chaptersToCreate);
        
        return NextResponse.json(createdChapters.map(chapter => chapter.toObject()), {status: 201});
    } catch (error) {
        console.error('Error creating chapters:', error);
        return NextResponse.json({error: 'Failed to create chapters'}, {status: 500});
    }
}