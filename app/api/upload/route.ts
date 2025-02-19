import { getCollection } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

interface requestBody {
    data: string[];
}

export async function POST(req: NextRequest) {

    if (!req.body) {
        return NextResponse.json(
            { error: 'No body in the request' },
            { status: 400 }
        );
    }

    if (req.method !== 'POST') {
        return NextResponse.json(
            { error: 'Method not allowed' },
            { status: 405 }
        );
    }

    try {
        const { data }: requestBody = await req.json();
        console.log('Received data:', data);
        // Check if data is an array
        if (!Array.isArray(data)) {
            return NextResponse.json(
                { error: 'Data must be an array' },
                { status: 400 }
            );
        }
        // Check if data is empty
        if (data.length === 0) {
            return NextResponse.json(
                { error: 'Data array is empty' },
                { status: 400 }
            );
        }

        const collection = await getCollection('filenames');

        const existingDoc = await collection.findOne({});
        const existingFiles = existingDoc?.nameoffiles || [];
        // Check for duplicates
        const newFiles = data.filter(filename => !existingFiles.includes(filename));

        if(newFiles.length === 0){
            return NextResponse.json({
                message:"All files already exist in the database"
            })
        }
        // Update existing document or create new one if doesn't exist
        await collection.updateOne(
            // Empty filter - matches the first document or creates new if none exists
            {},
            {
                // $push operator adds elements to an array
                $push: {
                    nameoffiles: {
                        // Adds each element from data array individually
                        $each: newFiles as string[]
                    }
                } as any,
                // $setOnInsert only runs when a new document is created (upsert)
                $setOnInsert: { createdAt: new Date() },
                // $set updates these fields every time
                $set: { lastUpdated: new Date() }
            },
            // Creates new document if no match found
            { upsert: true }
        );

        return NextResponse.json({
            message: `Successfully uploaded names of ${newFiles.length} files`,
        });
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to upload files' },
            { status: 500 }
        );
    }
}