"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Markdown from "react-markdown";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import mammoth from "mammoth";

interface ApiResponse {
  message: string;
}

export default function Main() {
  const [requestData, setRequestData] = useState<string>("");
  const [fileData, setFileData] = useState<File | null>(null);
  const [responseData, setResponseData] = useState<
    { message: string; isUser: boolean }[]
  >([]);
  const { toast } = useToast();

  const handleResponse = async () => {
    // if (fileData) {
    //   console.log("Please enter some text.");
    //   return;
    // }

    try {
      // Sending the user message to the server
      const response = await fetch(`/api/analysis`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: requestData }),
      });

      // Parsing the server's response
      const data: ApiResponse = await response.json();

      // Add the user's message and the AI's response
      setResponseData((prev) => [
        ...prev,
        { message: requestData, isUser: true }, // User message
        { message: data.message, isUser: false }, // AI response
      ]);
      setFileData(null); // clear the fileData state
      setRequestData(""); // Clear the textarea after sending
      console.log(data);
    } catch (error) {
      console.error("Error making the POST request:", error);
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
    <>
      <div className="flex flex-col h-screen justify-between">
        {/* chat mapping div */}
        <div className="flex-grow overflow-y-auto p-4">
          {responseData.map((item, key) => (
            <div
              key={key}
              className={`flex ${
                item.isUser ? "justify-end" : "justify-start"
              } p-2`}
            >
              <div
                className={`p-3 rounded-lg ${
                  item.isUser
                    ? "bg-gray-500 text-white" // User messages (right side)
                    : "bg-gray-200 text-gray-800" // AI responses (left side)
                }`}
              >
                <Markdown>{item.message}</Markdown>
              </div>
            </div>
          ))}
        </div>

        {/* Input Section */}
        <div className="flex gap-2 p-4 shadow-md border-t border-gray-300">
          <div className="w-10">
            <label
              htmlFor="picture"
              className="flex justify-center items-center cursor-pointer w-full h-9 border-2 border-gray-300 rounded-lg"
            >
              <span className="text-2xl text-gray-500">+</span>
              <Input
                id="picture"
                type="file"
                className="hidden"
                onChange={handleUpload}
              />
            </label>
          </div>
          <Input
            placeholder="Type your message here..."
            value={fileData ? "" : requestData}
            onChange={(e) => setRequestData(e.target.value)}
          />
          <Button variant="secondary" onClick={handleResponse}>
            Submit
          </Button>
        </div>
      </div>
    </>
  );
}