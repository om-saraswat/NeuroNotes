import { User } from '../../../lib/db/model';
import { connectToDatabase } from '../../../lib/db/mongoose';
import { NextResponse, NextRequest } from 'next/server';
import { getToken } from "next-auth/jwt";

// GET all users or specific user info
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    
    if (!token || !token.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user's information
    const user = await User.findById(token.id).select('-password');
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user, { status: 200 });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

// POST to create or update user
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const { name, email, image } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Try to find existing user
    let user = await User.findOne({ email });

    if (user) {
      // Update existing user
      if (name) user.name = name;
      if (image) user.image = image;
      await user.save();
      return NextResponse.json(user.toObject(), { status: 200 });
    }

    // Create new user
    const newUser = new User({
      name: name || 'User',
      email,
      image: image || null,
    });

    await newUser.save();
    return NextResponse.json(newUser.toObject(), { status: 201 });
  } catch (error) {
    console.error('Error creating/updating user:', error);
    return NextResponse.json({ error: 'Failed to create/update user' }, { status: 500 });
  }
}
