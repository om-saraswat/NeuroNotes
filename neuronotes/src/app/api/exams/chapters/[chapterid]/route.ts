import { Chapter } from '@/lib/db/model';
import { connectToDatabase } from '@/lib/db/mongoose';
import { NextResponse, NextRequest } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ chapterid: string }>}) {
    try {
        await connectToDatabase(); // Connect inside the handler
        
        const {chapterid} = await params;
        const chapter = await Chapter.findOne({_id: chapterid});
        if (chapter) {
            // return chapter data as JSON with status 200     
            return NextResponse.json(chapter.toObject(), {status: 200, headers: {'Content-Type': 'application/json'}});
        }
        return NextResponse.json({error: 'Chapter not found'}, {status: 404});
    } catch (error) {
        console.error('Error fetching chapter:', error);
        return NextResponse.json({error: 'Failed to fetch chapter'}, {status: 500});
    }
}

// Delete
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ chapterid: string }>}) {
    try {
        await connectToDatabase(); // Connect inside the handler
        
        const {chapterid} = await params;
        const deletedChapter = await Chapter.findByIdAndDelete(chapterid);
        if (deletedChapter) {
            return NextResponse.json({message: 'Chapter deleted successfully'}, {status: 200});
        }
        return NextResponse.json({error: 'Chapter not found'}, {status: 404});
    } catch (error) {
        console.error('Error deleting chapter:', error);
        return NextResponse.json({error: 'Failed to delete chapter'}, {status: 500});
    }
}

// Update
export async function PUT(request: NextRequest, { params }: { params: Promise<{ chapterid: string }>}) {
    try {
        await connectToDatabase(); // Connect inside the handler
        
        const {chapterid} = await params;
        const updateData = await request.json();
        const updatedChapter = await Chapter.findByIdAndUpdate(chapterid, updateData, {new: true});
        if (updatedChapter) {
            return NextResponse.json(updatedChapter.toObject(), {status: 200});
        }
        return NextResponse.json({error: 'Chapter not found'}, {status: 404});
    } catch (error) {
        console.error('Error updating chapter:', error);
        return NextResponse.json({error: 'Failed to update chapter'}, {status: 500});
    }
}

// This file handles the API routes for chapters, allowing for fetching and creating chapters.
