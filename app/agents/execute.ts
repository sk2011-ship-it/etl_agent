import fs from 'fs/promises';
import { stat } from 'fs/promises';
import path from 'path';
import { createReadStream } from 'fs';
import readline from 'readline';
import OpenAI from "openai";

const schemaAI = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Type for file system errors
interface FileSystemError extends Error {
    code?: string;
}

export async function get_files_list(folder: string = 'app/agents/sample_files') {
    console.log('📂 Attempting to read directory:', path.resolve(folder));
    try {
        const files = await fs.readdir(folder);
        console.log('📋 Files found:', files);
        return {
            files: files.map(file => ({
                name: file,
                type: path.extname(file).slice(1)
            }))
        };
    } catch (error) {
        const fsError = error as FileSystemError;
        console.error('❌ Error reading directory:', {
            folder: folder,
            absolutePath: path.resolve(folder),
            error: fsError.message,
            code: fsError.code
        });
        throw error;
    }
}

export async function get_file_size(filename: string) {
    const filePath = path.join('app/agents/sample_files', filename);
    console.log('📏 Checking file size:', {
        filename,
        filePath: filePath,
        absolutePath: path.resolve(filePath)
    });
    
    try {
        const stats = await stat(filePath);
        return {
            size_bytes: stats.size,
            size_kb: Math.round(stats.size / 1024 * 100) / 100,
            size_mb: Math.round(stats.size / (1024 * 1024) * 100) / 100
        };
    } catch (error) {
        const fsError = error as FileSystemError;
        console.error('❌ Error getting file size:', {
            filename,
            filePath: filePath,
            absolutePath: path.resolve(filePath),
            error: fsError.message,
            code: fsError.code
        });
        throw error;
    }
}

export async function get_file_content_low_level(filename: string, options: {
    byte_start?: number;
    byte_length?: number;
    start_line?: number;
    num_lines?: number;
}) {
    const filePath = path.join('app/agents/sample_files', filename);
    console.log('📄 Attempting to read file:', {
        filename,
        filePath: filePath,
        absolutePath: path.resolve(filePath),
        options
    });
    
    try {
        const fileType = path.extname(filename).slice(1);
        
        // Byte-based reading (preferred for large files)
        if (options.byte_start !== undefined && options.byte_length !== undefined) {
            const fileHandle = await fs.open(filePath);
            const buffer = Buffer.alloc(options.byte_length);
            const { bytesRead } = await fileHandle.read(buffer, 0, options.byte_length, options.byte_start);
            await fileHandle.close();
            
            return {
                content: buffer.toString('utf8', 0, bytesRead),
                type: 'byte',
                start: options.byte_start,
                length: bytesRead,
                file_type: fileType
            };
        }

        // Line-based reading (fallback)
        if (options.start_line !== undefined && options.num_lines !== undefined) {
            const fileStream = createReadStream(filePath);
            const rl = readline.createInterface({
                input: fileStream,
                crlfDelay: Infinity
            });

            const lines: string[] = [];
            let lineNo = 0;
            const endLine = options.start_line + options.num_lines;

            for await (const line of rl) {
                if (lineNo >= options.start_line && lineNo < endLine) {
                    lines.push(line);
                }
                if (lineNo >= endLine) break;
                lineNo++;
            }

            rl.close();
            fileStream.close();

            return {
                content: lines.join('\n'),
                type: 'line',
                start: options.start_line,
                num_lines: lines.length,
                total_lines: lineNo,
                file_type: fileType
            };
        }

        throw new Error('Either byte range or line range must be specified');
    } catch (error) {
        const fsError = error as FileSystemError;
        console.error('❌ Error reading file:', {
            filename,
            filePath: filePath,
            absolutePath: path.resolve(filePath),
            error: fsError.message,
            code: fsError.code
        });
        throw error;
    }
}

export async function understand_schema(content: string, file_type: string) {
    try {
        const prompt = `Analyze the following ${file_type.toUpperCase()} content and describe its schema/structure. 
        If you can't determine the complete schema, indicate what's missing.
        Content: ${content}`;

        const completion = await schemaAI.chat.completions.create({
            model: "gpt-4o",
            messages: [{
                role: "user",
                content: prompt
            }],
            temperature: 0.1, // Lower temperature for more consistent schema analysis
        });

        const analysis = completion.choices[0].message.content;
        const isComplete = !analysis?.toLowerCase().includes("missing") && 
                          !analysis?.toLowerCase().includes("need more") &&
                          !analysis?.toLowerCase().includes("unclear");

        return {
            schema_analysis: analysis,
            is_complete: isComplete,
            file_type: file_type
        };
    } catch (error) {
        console.error('Error analyzing schema:', error);
        throw error;
    }
} 