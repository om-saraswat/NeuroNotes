import { NextResponse, NextRequest } from "next/server";
import { MindMap } from "../../../lib/db/model";
import { connectToDatabase } from "../../../lib/db/mongoose";

// POST: Create a new mind map
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase(); // Connect inside the handler
    
    const { chapterId, content } = await request.json();
    const newMindMap = new MindMap({ chapterId, content });

    // Check if mind map already exists
    const existingMindMap = await MindMap.findOne({ chapterId });
    if (existingMindMap) {
      return NextResponse.json(
        { error: "Mind map already exists" },
        { status: 400 }
      );
    }

    await newMindMap.save();
    return NextResponse.json(newMindMap.toObject(), { status: 201 });
  } catch (error) {
    console.error("Error creating mind map:", error);
    return NextResponse.json(
      { error: "Failed to create mind map" },
      { status: 500 }
    );
  }
}

// GET: Fetch a mind map by chapterId
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase(); // Connect inside the handler
    
    const { searchParams } = new URL(request.url);
    const chapterId = searchParams.get("chapterId");

    if (!chapterId) {
      return NextResponse.json(
        { error: "Chapter ID is required" },
        { status: 400 }
      );
    }

    const mindMap = await MindMap.findOne({ chapterId });

    if (!mindMap) {
      return NextResponse.json(
        { error: "Mind map not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(mindMap.toObject(), { status: 200 });
  } catch (error) {
    console.error("Error fetching mind map:", error);
    return NextResponse.json(
      { error: "Failed to fetch mind map" },
      { status: 500 }
    );
  }
}

