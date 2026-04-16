import { User, UserGenerationStatus } from '../../../../lib/db/model';
import { connectToDatabase } from '../../../../lib/db/mongoose';
import { NextResponse, NextRequest } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ userId: string }>}) {
    try {
        await connectToDatabase();
        const {userId} = await params; 
        const user = await User.findOne({_id: userId});
        if(user){
            const status = await UserGenerationStatus.findOne({ userId: user._id });
            const payload = {
                ...user.toObject(),
                isGeneratingMindMap: status?.isGeneratingMindMap ?? false,
                isGeneratingQuiz: status?.isGeneratingQuiz ?? false,
            };
            return NextResponse.json(payload, { status: 200, headers: { 'Content-Type': 'application/json' } });
        }else{
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
    } catch (error) {
        console.error('Error fetching users:', error);
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
}