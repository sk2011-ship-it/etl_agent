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

export async function display_file_content(filename: string, data_points?: string[]) {
  try {
    const fileSizeInfo = await get_file_size(filename);
    const chunkSize = 1024 * 1024; // 1MB chunks
    let content = '';
    let dataPointsFound: Record<string, any> = {};

    // Read file in chunks
    for (let byteStart = 0; byteStart < fileSizeInfo.size_bytes; byteStart += chunkSize) {
      const chunk = await get_file_content_low_level(filename, {
        byte_start: byteStart,
        byte_length: Math.min(chunkSize, fileSizeInfo.size_bytes - byteStart)
      });

      content += chunk;

      // If data points are specified, look for them in the content
      if (data_points) {
        for (const point of data_points) {
          // Simple pattern matching - you might want to enhance this
          const regex = new RegExp(`${point}[\\s]*:[\\s]*([^\\n]+)`, 'i');
          const match = chunk.content.match(regex);
          if (match) {
            dataPointsFound[point] = match[1].trim();
          }
        }
      }
    }

    return {
      content: content.substring(0, 1000) + (content.length > 1000 ? '...' : ''), // First 1000 chars
      dataPoints: dataPointsFound,
      totalSize: fileSizeInfo,
      analyzedPoints: Object.keys(dataPointsFound).length
    };
  } catch (error) {
    throw new Error(`Error displaying file content: ${error}`);
  }
}

export async function analyze_file_content(filename: string, schema: string) {
  try {
    const fileSizeInfo = await get_file_size(filename);
    const chunkSize = 1024 * 1024; // 1MB chunks
    let content = '';

    // First read a small sample
    const initialChunk = await get_file_content_low_level(filename, {
      byte_start: 0,
      byte_length: Math.min(chunkSize, fileSizeInfo.size_bytes)
    });

    // If file is large, read more
    if (fileSizeInfo.size_bytes > chunkSize) {
      const additionalChunk = await get_file_content_low_level(filename, {
        byte_start: chunkSize,
        byte_length: Math.min(chunkSize, fileSizeInfo.size_bytes - chunkSize)
      });
      content = initialChunk.content + additionalChunk.content;
    } else {
      content = initialChunk.content;
    }

    // Deep analysis using GPT-4
    const completion = await schemaAI.chat.completions.create({
      model: "gpt-4o",
      messages: [{
        role: "user",
        content: `Given this schema: ${schema}
        
Analyze this ${initialChunk.file_type.toUpperCase()} content and provide:
1. How well the content matches the schema
2. Key components or sections found
3. Important patterns or relationships
4. Any deviations from the schema or anomalies

Content: ${content}`
      }],
      temperature: 0.1,
    });

    const deepAnalysis = completion.choices[0].message.content;

    return {
      content: content.substring(0, 2000) + (content.length > 2000 ? '...' : ''),
      analysis: deepAnalysis,
      totalSize: fileSizeInfo
    };
  } catch (error) {
    throw new Error(`Error analyzing file content: ${error}`);
  }
}

export async function merge_data(
  file1: string,
  file2: string,
  schema1: any,
  schema2: any,
  content1: string,
  content2: string
): Promise<any> {
  try {
    // Use GPT-4 to analyze and merge the data
    const completion = await schemaAI.chat.completions.create({
      model: "gpt-4o",
      messages: [{
        role: "user",
        content: `You are a data merging expert. Analyze and merge these two datasets:

File 1 (${file1}):
Schema: ${JSON.stringify(schema1, null, 2)}
Content Sample: ${content1.substring(0, 1000)}${content1.length > 1000 ? '...' : ''}

File 2 (${file2}):
Schema: ${JSON.stringify(schema2, null, 2)}
Content Sample: ${content2.substring(0, 1000)}${content2.length > 1000 ? '...' : ''}

Follow these steps for analysis and merging:

1. Schema Analysis:
   - List all fields from both datasets
   - Identify data types of each field
   - Find exact and similar field names
   - Detect nested structures and arrays

2. Data Compatibility Check:
   - Compare field values and formats
   - Identify primary keys and unique identifiers
   - Check for data type conflicts
   - Validate value ranges and patterns

3. Merge Strategy:
   - Define primary joining keys
   - Handle duplicate field names
   - Resolve data type conflicts
   - Specify field mapping rules
   - Determine array merging approach

4. Data Transformation:
   - Create unified field names
   - Convert data types if needed
   - Normalize date formats
   - Handle missing values

Return a detailed JSON response with:
{
  "canMerge": boolean,
  "reason": "detailed explanation",
  "matchingFields": ["field1", "field2"],
  "mergeStrategy": {
    "primaryKey": "field_name",
    "fieldMapping": {
      "source_field": "target_field"
    },
    "transformRules": {
      "field": "transformation_rule"
    }
  },
  "mergedData": [
    // Combined data with transformed fields
  ],
  "errors": [
    // Any issues found during analysis
  ]
}

Ensure the merged output:
- Maintains data integrity
- Preserves all relevant information
- Uses consistent naming
- Handles nested structures properly
- Includes all unique fields from both sources`
      }],
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    const analysisResult = JSON.parse(completion.choices[0].message.content || "{}");

    // Return the analysis results
    return {
      file1: file1,
      file2: file2,
      analysis: analysisResult,
      success: analysisResult.canMerge
    };
  } catch (error) {
    return {
      error: `Error merging data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      file1,
      file2
    };
  }
}