"use client";
import { useChat } from "@/app/hooks/useChat";
import { useEffect, useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { FileControls } from "./chat/FileControls";
import { ChatInput } from "./chat/ChatInput";
import { FileViewer } from "./FileViewer";
import { ChatMessage } from "./chat/ChatMessage";
import { StepsList } from "./chat/StepsList";

type StepItem = {
  type: 'step';
  content: string;
  key: string;
};

type MessageItem = {
  type: 'message';
  content: string;
  role: 'user' | 'assistant';
  key: string;
};

type CombinedItem = StepItem | MessageItem;

export default function Main() {
  const {
    requestData,
    setRequestData,
    responseData,
    currentSteps,
    handleResponse,
    isProcessing
  } = useChat();
  const [initialized, setInitialized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [fileViewerOpen, setFileViewerOpen] = useState(false);
  const [selectedFileContent, setSelectedFileContent] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("");
  const [fileData, setFileData] = useState<File | null>(null);
  const [savedFiles, setSavedFiles] = useState<string[]>([]);
  const { toast } = useToast();

  const shouldShowStepsAfter = (index: number) => {
    return index === responseData.length - 1 && responseData[index].role === 'user';
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [responseData, currentSteps]);

  useEffect(() => {
    if (!initialized) {
      setInitialized(true);
      handleResponse();
    }
  }, [initialized, handleResponse]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      handleResponse();
      setRequestData("");
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const files = Array.from(event.target.files);
      const allowedExtensions = ['.docx', '.json', '.csv', '.xml'];

      // Check all files first
      const invalidFiles = files.filter(file => {
        const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
        return !allowedExtensions.includes(fileExtension);
      });

      if (invalidFiles.length > 0) {
        toast({
          title: "Unsupported file type",
          description: `Only .docx, .json, .csv, and .xml files are allowed.`,
        });
        return;
      }

      let successfulUploads = 0;

      try {
        for (const file of files) {
          if (file.size > 10 * 1024 * 1024) {
            toast({
              title: "File too large",
              description: `${file.name} is larger than 10MB`,
            });
            continue;
          }

          const formData = new FormData();
          formData.append('file', file);

          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            throw new Error(`Failed to upload ${file.name}`);
          }

          setFileData(file);
          successfulUploads++;
        }

        if (successfulUploads > 0) {
          toast({
            title: "Files uploaded",
            description: `Successfully uploaded ${successfulUploads} ${successfulUploads === 1 ? 'file' : 'files'}`,
          });
        }

      } catch (error) {
        console.error("Error uploading files:", error);
        toast({
          title: "Error",
          description: "Failed to upload one or more files",
        });
      }
    }
  };

  const fetchSavedFiles = async () => {
    try {
      const response = await fetch('/api/list-files');
      if (response.ok) {
        const data = await response.json();
        setSavedFiles(data.files);
      }
    } catch (error) {
      console.error('Error fetching files:', error);
      toast({
        title: "Error",
        description: "Failed to fetch saved files",
        variant: "destructive",
      });
    }
  };

  const handleFileClick = async (filename: string) => {
    try {
      const response = await fetch(`/api/read-file?filename=${encodeURIComponent(filename)}`);
      if (!response.ok) {
        throw new Error('Failed to read file');
      }
      const data = await response.json();
      setSelectedFileContent(data.content);
      setSelectedFileName(filename);
      setFileViewerOpen(true);
    } catch (error) {
      console.error('Error reading file:', error);
      toast({
        title: "Error",
        description: "Failed to read file content",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <div className="flex flex-col h-screen justify-between">
        <div className="flex-grow overflow-y-auto p-4">
          {responseData.map((message, index) => (
            <div key={`message-container-${index}`}>
              <ChatMessage role={message.role} content={message.content} />
              {shouldShowStepsAfter(index) && currentSteps.length > 0 && (
                <StepsList steps={currentSteps} />
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="flex gap-2 p-4 shadow-md border-t border-gray-300">
          <FileControls
            onFileUpload={handleFileUpload}
            onFileView={fetchSavedFiles}
            savedFiles={savedFiles}
            onFileClick={handleFileClick}
          />
          <ChatInput
            placeholder={"Type your message here..."}
            value={requestData}
            onChange={(e) => setRequestData(e.target.value)}
            onKeyDown={handleKeyDown}
            onSubmit={handleResponse}
            disabled={isProcessing}
            isProcessing={isProcessing}
          />
        </div>
      </div>
      <FileViewer
        isOpen={fileViewerOpen}
        onClose={() => setFileViewerOpen(false)}
        content={selectedFileContent}
        filename={selectedFileName}
      />
    </>
  );
}