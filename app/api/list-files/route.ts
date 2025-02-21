import { NextResponse } from 'next/server';
import { readdir } from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    const filesPath = path.join(process.cwd(), 'app/agents/sample_files');
    const files = await readdir(filesPath);
    
    return NextResponse.json({
      files,
      count: files.length
    });
  } catch (error) {
    console.error('Error reading files:', error);
    return NextResponse.json(
      { error: 'Failed to read files' },
      { status: 500 }
    );
  }
}