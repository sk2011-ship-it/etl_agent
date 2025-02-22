# Agents Architecture

## Overview

The agents system is a sophisticated data analysis and schema discovery framework that leverages OpenAI's GPT models to understand, analyze, and manipulate various data file formats.

## Core Components

### 1. Schema Discovery Agent (`schemaAgent.ts`)

The main orchestrator that manages the interaction between the user, GPT models, and tools. It follows a structured workflow:

1. **Initialization**
   - Loads system message defining agent behavior
   - Sets up OpenAI client
   - Initializes conversation context

2. **Conversation Flow**
   - Maintains message history
   - Processes user inputs
   - Handles GPT responses
   - Executes tool calls
   - Returns results to user

3. **Error Handling**
   - Catches and processes tool execution errors
   - Maintains conversation stability
   - Provides error feedback

### 2. Execution Layer (`execute.ts`)

Provides core file operations and analysis capabilities through several key functions:

1. **File Operations**
   - `get_files_list`: Lists directory contents with file types
   - `get_file_size`: Returns file size in bytes/KB/MB
   - `get_file_content_low_level`: Reads file content in chunks
     - Supports byte-based reading for large files
     - Fallback to line-based reading when needed

2. **Analysis Functions**
   - `understand_schema`: Analyzes content structure using GPT
   - `analyze_file_content`: Deep content analysis with schema matching
   - `display_file_content`: Shows content with key data points
   - `merge_data`: Intelligent data file merging

### 3. Tools Configuration (`tools.ts`)

Defines the available tools as OpenAI function specifications:

1. **File Management Tools**
   ```typescript
   {
       name: "get_files_list",
       description: "Get list of files from directory",
       parameters: {
           folder: string (optional)
       }
   }
   ```

2. **Content Analysis Tools**
   ```typescript
   {
       name: "understand_schema",
       description: "Analyze content structure",
       parameters: {
           content: string,
           file_type: string
       }
   }
   ```

3. **Data Manipulation Tools**
   ```typescript
   {
       name: "merge_data",
       description: "Merge two data files",
       parameters: {
           file1: string,
           file2: string,
           schema1: object,
           schema2: object,
           content1: string,
           content2: string
       }
   }
   ```

## Data Flow

1. **User Input**
   - User provides initial request
   - Agent processes request through GPT

2. **Tool Selection**
   - GPT model selects appropriate tool(s)
   - Tool parameters are validated
   - Tool is executed

3. **Content Processing**
   - Files are read in chunks if large
   - Content is analyzed for schema
   - Results are processed

4. **Response Generation**
   - Results are formatted
   - GPT generates human-readable response
   - Response is returned to user

## Sample Files

The system includes sample files for testing:

1. **orders.xml**: Order records with transaction details
2. **products.json**: Product catalog with specifications
3. **sales_data.csv**: Detailed sales records
4. **transactions.csv**: Transaction records
5. **users.json**: User profiles and preferences

These files demonstrate various data formats and relationships that the agent can analyze and process.

## Usage Example
