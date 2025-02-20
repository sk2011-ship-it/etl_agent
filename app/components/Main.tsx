"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Markdown from "react-markdown";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import mammoth from "mammoth";
import { Loader2 } from "lucide-react";

export default function Main() {
  const [requestData, setRequestData] = useState<string>("");
  const [fileData, setFileData] = useState<File | null>(null);
  const [responseData, setResponseData] = useState<{ message: string; isUser: boolean }[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const { toast } = useToast();

  const handleResponse = async () => {
    try {
      setIsStreaming(true);
      const response = await fetch(`/api/analysis`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: requestData }),
      });

      if (!response.body) {
        throw new Error("No response body");
      }

      // Add user message
      setResponseData((prev) => [...prev, { message: requestData, isUser: true }]);
      // Create temporary message for AI response
      setResponseData((prev) => [...prev, { message: "", isUser: false }]);

      const reader = response.body.getReader();
      let currentMessage = "";
      let buffer = "";

      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

      const appendToMessage = async (text: string) => {
        buffer += text;
        const words = buffer.split(/(\s+)/);

        // Process each complete word
        while (words.length > 1) {
          const word = words.shift() || "";
          const space = words.shift() || "";

          currentMessage += word + space;

          // Update UI with slight delay for word-by-word effect
          await delay(50); // 50ms delay between words

          setResponseData((prev) => {
            const newData = [...prev];
            newData[newData.length - 1] = {
              message: currentMessage,
              isUser: false,
            };
            return newData;
          });
        }

        // Keep any remaining partial word in the buffer
        buffer = words.join("");
      };

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          // Append any remaining text in the buffer
          if (buffer) {
            await appendToMessage(buffer + " ");
          }
          console.log("Stream complete");
          break;
        }

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              await appendToMessage(data.message);
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }

      setFileData(null);
      setRequestData("");
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to get response from server",
        variant: "destructive",
      });
    } finally {
      setIsStreaming(false);
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const uploadedFile = event.target.files[0];

      // Check if the file is a .docx file
      if (
        uploadedFile.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        setFileData(uploadedFile); // Set the file data in the state
        toast({
          title: "File uploaded",
          description: "Successfully uploaded",
        });

        // Extract text from the file immediately after upload
        await extractTextFromFile(uploadedFile);
      } else {
        toast({
          title: "Invalid File Type",
          description: "Please upload a DOCX file.",
          variant: "destructive",
        });
      }
    }
  };

  console.log(fileData, "file data");

  const extractTextFromFile = async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      if (arrayBuffer) {
        const result = await mammoth.extractRawText({ arrayBuffer });

        let finalResult = result.value.trim();
        finalResult = finalResult.replace(/\n\s*\n+/g, "\n\n"); // Clean up multiple newlines
        finalResult = finalResult.replace(/^\s+/g, "").replace(/\s+$/g, ""); // Remove leading/trailing spaces

        // Set the extracted text to the requestData state
        setRequestData(finalResult);
      } else {
        console.error("Failed to read file as ArrayBuffer");
      }
    } catch (error) {
      console.error("Error extracting text from file:", error);
    }
  };

  console.log(requestData, "requestData");

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white p-4">
        <h1 className="text-xl font-semibold text-gray-800">Schema Discovery Agent</h1>
      </div>

      {/* Chat Area */}
      <div className="flex-grow overflow-y-auto p-4 space-y-4">
        {responseData.map((item, key) => (
          <div key={key} className={`flex ${item.isUser ? "justify-end" : "justify-start"} animate-fade-in`}>
            <div className={`max-w-[80%] rounded-lg shadow-sm ${item.isUser
                ? "bg-gray-500 p-2 text-white"
                : "bg-white border p-4 border-gray-200"
                }`}
            >
              {/* Avatar and message container */}
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center 
                  ${item.isUser ? "bg-gray-700" : "bg-gray-100"}`}>
                  {item.isUser ? "U" : "AI"}
                </div>
                <div className="flex-1">
                  <Markdown
                    className={`prose ${item.isUser ? "prose-invert" : ""} max-w-none`}
                  >
                    {item.message}
                  </Markdown>
                </div>
              </div>
              {!item.isUser && isStreaming && key === responseData.length - 1 && (
                <div className="mt-2 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-gray-500">AI is thinking...</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Input Section */}
      <div className="border-t bg-white p-4">
        <div className="max-w-4xl mx-auto flex gap-3">
          <div className="flex-shrink-0">
            <label
              htmlFor="picture"
              className="flex justify-center items-center cursor-pointer w-10 h-10 rounded-full border-2">
              <span className="text-xl text-gray-500">+</span>
              <Input
                id="picture"
                type="file"
                className="hidden"
                onChange={handleUpload}
              />
            </label>
          </div>
          <div className="flex-1 flex gap-2">
            <Input
              placeholder="Type your message here..."
              value={fileData ? "" : requestData}
              onChange={(e) => setRequestData(e.target.value)}
              disabled={isStreaming}
            />
            <Button
              variant="default"
              onClick={handleResponse}
              disabled={isStreaming || !requestData.trim()}
              className={`px-6 ${isStreaming ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isStreaming ? (<Loader2 className="h-4 w-4 animate-spin" />)
                : ('Send')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}