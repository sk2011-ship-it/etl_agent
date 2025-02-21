import { ChatCompletionTool } from "openai/resources/chat/completions";

// Define tool configurations
export const tools: ChatCompletionTool[] = [{
    type: "function",
    function: {
        name: "get_files_list",
        description: "Get list of files from the sample_files directory",
        parameters: {
            type: "object",
            properties: {
                folder: {
                    type: "string",
                    description: "The folder to list files from (defaults to 'app/agents/sample_files')",
                    default: "app/agents/sample_files"
                }
            },
            required: []
        }
    }
}, {
    type: "function",
    function: {
        name: "get_file_size",
        description: "Get the size of a file in bytes, KB, and MB",
        parameters: {
            type: "object",
            properties: {
                filename: {
                    type: "string",
                    description: "Name of the file to check"
                }
            },
            required: ["filename"]
        }
    }
}, {
    type: "function",
    function: {
        name: "get_file_content_low_level",
        description: "Read a portion of a file by byte range or line numbers",
        parameters: {
            type: "object",
            properties: {
                filename: {
                    type: "string",
                    description: "Name of the file to read"
                },
                byte_start: {
                    type: "number",
                    description: "Starting byte position"
                },
                byte_length: {
                    type: "number",
                    description: "Number of bytes to read"
                },
                start_line: {
                    type: "number",
                    description: "Starting line number (0-based)"
                },
                num_lines: {
                    type: "number",
                    description: "Number of lines to read"
                }
            },
            required: ["filename"]
        }
    }
}, {
    type: "function",
    function: {
        name: "understand_schema",
        description: "Analyze content to understand its schema/structure",
        parameters: {
            type: "object",
            properties: {
                content: {
                    type: "string",
                    description: "Content to analyze"
                },
                file_type: {
                    type: "string",
                    description: "Type of file (json, xml, csv, etc)"
                }
            },
            required: ["content", "file_type"]
        }
    }
}, {
    type: "function",
    function: {
        name: "ask_human",
        description: "Ask a question to the human user and get their response",
        parameters: {
            type: "object",
            properties: {
                message: {
                    type: "string",
                    description: "The question or message to show to the user. Should be a full question or message, not a partial one."
                }
            },
            required: ["message"]
        }
    }
}, {
    type: "function",
    function: {
        name: "display_file_content",
        description: "Displays file content with specified data points for analysis",
        parameters: {
            type: "object",
            properties: {
                filename: {
                    type: "string",
                    description: "The name of the file to analyze"
                },
                data_points: {
                    type: "array",
                    items: {
                        type: "string"
                    },
                    description: "Array of data points to look for in the file"
                }
            },
            required: ["filename"]
        }
    }
}, {
    type: "function",
    function: {
        name: "analyze_file_content",
        description: "Analyzes file content based on provided schema",
        parameters: {
            type: "object",
            properties: {
                filename: {
                    type: "string",
                    description: "The name of the file to analyze"
                },
                schema: {
                    type: "string",
                    description: "Schema understanding to guide the analysis"
                }
            },
            required: ["filename", "schema"]
        }
    }
}, {
    type: "function",
    function: {
        name: "merge_data",
        description: "Intelligently merges two data files using GPT-4 analysis",
        parameters: {
            type: "object",
            properties: {
                file1: {
                    type: "string",
                    description: "Path to the first file"
                },
                file2: {
                    type: "string",
                    description: "Path to the second file"
                },
                schema1: {
                    type: "object",
                    description: "Schema of the first file"
                },
                schema2: {
                    type: "object",
                    description: "Schema of the second file"
                },
                content1: {
                    type: "string",
                    description: "Content of the first file"
                },
                content2: {
                    type: "string",
                    description: "Content of the second file"
                }
            },
            required: ["file1", "file2", "schema1", "schema2", "content1", "content2"]
        }
    }
}]; 