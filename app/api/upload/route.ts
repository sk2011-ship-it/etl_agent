import { getCollection } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const files = formData.getAll('file') as File[];

        if (!files || files.length === 0) {
            return NextResponse.json(
                { error: "No files received." },
                { status: 400 }
            );
        }

        const savedFiles = [];
        const collection = await getCollection('filenames');
        
        // Get existing filenames from database
        const existingDoc = await collection.findOne({});
        const existingFiles = existingDoc?.nameoffiles || [];

        for (const file of files) {
            // Skip if file already exists in database
            if (existingFiles.includes(file.name)) {
                continue;
            }

            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);

            const filePath = path.join(process.cwd(), 'app/agents/sample_files', file.name);
            await writeFile(filePath, buffer);
            savedFiles.push(file.name);
        }

        if (savedFiles.length > 0) {
            // Update database only with new filenames
            await collection.updateOne(
                {},
                {
                    $push: {
                        nameoffiles: {
                            $each: savedFiles
                        }
                    } as any,
                    $setOnInsert: { createdAt: new Date() },
                    $set: { lastUpdated: new Date() }
                },
                { upsert: true }
            );
        }

        return NextResponse.json({
            message: savedFiles.length > 0 
                ? `Successfully uploaded ${savedFiles.length} files` 
                : "No new files to upload",
            files: savedFiles
        });

    } catch (error) {
        console.error("Error uploading files:", error);
        return NextResponse.json(
            { error: "Error uploading files" },
            { status: 500 }
        );
    }
}