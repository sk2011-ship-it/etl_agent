import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
    try {
        const data = await req.formData();
        const file: File | null = data.get('file') as unknown as File;

        if (!file) {
            return NextResponse.json({ error: 'No file received' }, { status: 400 });
        }

        // Create uploads directory in public folder
        const uploadDir = path.join(process.cwd(), 'public', 'uploads');
        await mkdir(uploadDir, { recursive: true });

        // Convert file to buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Write file to public/uploads
        const filePath = path.join(uploadDir, file.name);
        await writeFile(filePath, buffer);

        return NextResponse.json({ 
            message: 'File saved successfully',
            path: `/uploads/${file.name}`
        });
    } catch (error) {
        console.error('Error saving file:', error);
        return NextResponse.json(
            { error: 'Failed to save file' },
            { status: 500 }
        );
    }
}