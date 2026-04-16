import { Exam, Chapter, MindMap, Notes } from '@/lib/db/models';
import { connectToDatabase } from '@/lib/db/mongoose';
import { NextResponse, NextRequest } from 'next/server';
import mongoose from 'mongoose';

export async function GET(request: NextRequest, { params }: { params: Promise<{ examId: string }> }) {
    try {
        await connectToDatabase(); // Connect inside the handler
        
        const { examId } = await params
        const exam = await Exam.findOne({ _id: examId });

        if (exam) {
            // return exam data as JSON with status 200
            return NextResponse.json(exam.toObject(), { status: 200, headers: { 'Content-Type': 'application/json' } });
        } else {
            return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
        }
    } catch (error) {
        console.error('Error fetching exam:', error);
        return NextResponse.json({ error: 'Failed to fetch exam' }, { status: 500 });
    }
}

// Delete
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ examId: string }>}) {
    await connectToDatabase();
    
    try {
        const { examId } = await params
        const requestData = await request.json();
        const userId = requestData.userId;
        
        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        // Find the exam and check ownership
        const exam = await Exam.findById(examId);
        
        if (!exam) {
            return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
        }
        
        // Verify the exam belongs to the user making the request
        if (exam.userId.toString() !== userId) {
            return NextResponse.json({ error: 'Unauthorized: You do not own this exam' }, { status: 403 });
        }

        // Start a session for transaction
        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
            // Find all chapters for this exam
            const chapters = await Chapter.find({ examId: examId });
            
            // For each chapter, delete associated mindmaps and notes
            for (const chapter of chapters) {
                // Delete mindmap if exists
                if (chapter.mindmapId) {
                    await MindMap.findByIdAndDelete(chapter.mindmapId, { session });
                }
                
                // Delete notes associated with the chapter (if you have a reference to chapter in the notes schema)
                // This assumes you want to find notes by chapter ID
                await Notes.deleteMany({ chapterId: chapter._id }, { session });
            }
            
            // Delete all chapters
            await Chapter.deleteMany({ examId: examId }, { session });
            
            // Finally delete the exam
            const deletedExam = await Exam.findByIdAndDelete(examId, { session });
            
            // Commit the transaction
            await session.commitTransaction();
            session.endSession();
            
            return NextResponse.json({ 
                message: 'Exam and all associated data deleted successfully',
                deletedExam: deletedExam
            }, { status: 200 });
            
        } catch (error) {
            // Abort transaction on error
            await session.abortTransaction();
            session.endSession();
            throw error;
        }
        
    } catch (error) {
        console.error('Error deleting Exam:', error);
        return NextResponse.json({ error: 'Failed to delete exam' }, { status: 500 });
    }
}

// Update
export async function PUT(request: NextRequest, { params }: { params: Promise<{ examId: string }>}) {
    try {
        const { examId } = await params
        const updateData = await request.json();
        const updatedExam = await Exam.findByIdAndUpdate(examId, updateData, { new: true });
        if (updatedExam) {
            return NextResponse.json(updatedExam.toObject(), { status: 200 });
        }
        return NextResponse.json({ error: 'exam not found' }, { status: 404 });
    } catch (error) {
        console.error('Error updating exam:', error);    
        return NextResponse.json({ error: 'Failed to update exam' }, { status: 500 });
    }
}