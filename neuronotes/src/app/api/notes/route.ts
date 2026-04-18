import { NextResponse, NextRequest } from 'next/server';
import { Notes } from '../../../lib/db/model';
import { connectToDatabase } from '../../../lib/db/mongoose';

// POST - Create a new notes document
export async function POST(request: NextRequest) {
  try {
    // Connect to the database
    await connectToDatabase();
    
    const body = await request.json();
    const { content, description } = body;
    
    // Log the incoming request for debugging
    console.log('Notes API - Received request:', { content, description });
    
    if (!description) {
      console.log('Notes API - Missing description');
      return NextResponse.json({ error: 'Notes description is required' }, { status: 400 });
    }
    
    // Create the notes document
    const newNotes = new Notes({ 
      content: content || null, 
      description
    });
    
    // Save to database
    const savedNotes = await newNotes.save();
    console.log('Notes API - Successfully created notes:', savedNotes._id);
    
    return NextResponse.json(savedNotes.toObject(), { status: 201 });
    
  } catch (error) {
    console.error('Notes API - Error creating notes:', error);
    
    // Return more detailed error information
    if (error instanceof Error) {
      return NextResponse.json({ 
        error: 'Failed to create notes',
        details: error.message 
      }, { status: 500 });
    }
    
    return NextResponse.json({ error: 'Failed to create notes' }, { status: 500 });
  }
}

// GET - Retrieve notes by ID
export async function GET(request: NextRequest) {
  try {
    // Connect to the database
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    console.log('Notes API - GET request for ID:', id);
    
    if (!id) {
      return NextResponse.json({ error: 'Notes ID is required' }, { status: 400 });
    }
    
    const notes = await Notes.findById(id);
    if (!notes) {
      console.log('Notes API - Notes not found for ID:', id);
      return NextResponse.json({ error: 'Notes not found' }, { status: 404 });
    }
    
    console.log('Notes API - Successfully retrieved notes:', notes._id);
    return NextResponse.json(notes.toObject(), { status: 200 });
    
  } catch (error) {
    console.error('Notes API - Error fetching notes:', error);
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
  }
}