import { User, UserGenerationStatus } from '../../../../lib/db/model';
import { connectToDatabase } from '../../../../lib/db/mongoose';
import { NextResponse, NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        await connectToDatabase();
        
        const { searchParams } = new URL(request.url);
        const email = searchParams.get('email');
        
        if (!email) {
            return NextResponse.json({ error: 'Email parameter is required' }, { status: 400 });
        }
        
        const user = await User.findOne({ email });
        
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Merge status from dedicated collection
        const status = await UserGenerationStatus.findOne({ userId: user._id });
        const payload = {
            ...user.toObject(),
            isGeneratingMindMap: status?.isGeneratingMindMap ?? false,
            isGeneratingQuiz: status?.isGeneratingQuiz ?? false,
        };

        return NextResponse.json(payload, { status: 200 });
        
    } catch (error) {
        console.error('Error fetching user by email:', error);
        return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
    }
}