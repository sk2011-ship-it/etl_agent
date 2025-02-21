"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Markdown from "react-markdown";
import { useChat } from "@/app/hooks/useChat";
import { useEffect, useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Plus, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FileViewer } from "./FileViewer";

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
  const { toast } = useToast();

  // Helper to determine if we should show steps after this message
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
      setRequestData(""); // Clear the text field
    }
  };

  // Add this file handling function
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const files = Array.from(event.target.files);

      try {
        for (const file of files) {
          if (file.size > 10 * 1024 * 1024) {
            toast({
              title: "File too large",
              description: `${file.name} is larger than 10MB`,
              variant: "destructive",
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
        }

        toast({
          title: "Files uploaded",
          description: `Successfully uploaded ${files.length} files`,
        });

      } catch (error) {
        console.error("Error uploading files:", error);
        toast({
          title: "Error",
          description: "Failed to upload one or more files",
          variant: "destructive",
        });
      }
    }
  };

  // Add new state for files list
  const [savedFiles, setSavedFiles] = useState<string[]>([]);

  // Add function to fetch saved files
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

  // Add new function to fetch file content
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
              <div
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} p-2`}
              >
                <div
                  className={`p-3 rounded-lg ${message.role === "user"
                    ? "bg-gray-500 text-white"
                    : "bg-gray-200 text-gray-800"
                    }`}
                >
                  <Markdown>{message.content}</Markdown>
                </div>
              </div>

              {/* Show steps only after the last user message */}
              {shouldShowStepsAfter(index) && currentSteps.length > 0 && (
                <div className="space-y-1 my-2">
                  {currentSteps.map((step, stepIndex) => (
                    <div
                      key={`step-${stepIndex}`}
                      className="flex justify-start p-2"
                    >
                      <div className="p-3 rounded-lg bg-gray-100 text-gray-800 text-sm italic max-w-[80%] opacity-75">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">•</span>
                          <span>{step}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="flex gap-2 p-4 shadow-md border-t border-gray-300">
          <div className="flex gap-2">
            {/* First tooltip for Plus icon remains unchanged */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <label
                    htmlFor="file-upload"
                    className="flex justify-center items-center cursor-pointer w-9 h-9 rounded-lg border-2 border-input hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    <Input
                      id="file-upload"
                      type="file"
                      className="hidden"
                      onChange={handleFileUpload}
                      multiple
                    />
                  </label>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Upload files</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Eye icon with both Dialog and Tooltip */}
            <Dialog>
              <DialogTrigger asChild>
                <div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          className="flex justify-center items-center w-9 h-9 rounded-lg border-2 border-input hover:bg-accent hover:text-accent-foreground transition-colors"
                          onClick={fetchSavedFiles}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>View files</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Saved Files</DialogTitle>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto">
                  {savedFiles.length > 0 ? (
                    <div className="space-y-2">
                      {savedFiles.map((filename, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 rounded-lg border hover:bg-accent cursor-pointer"
                          onClick={() => handleFileClick(filename)}
                        >
                          <span className="text-sm">{filename}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground">No files found</p>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="flex-1 flex gap-2">
            <Input
              placeholder={fileData ? fileData.name : "Type your message here..."}
              value={requestData}
              onChange={(e) => setRequestData(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isProcessing}
            />
            <Button
              variant="secondary"
              onClick={handleResponse}
              disabled={isProcessing || (!requestData.trim() && !fileData)}
            >
              {isProcessing ? 'Processing...' : 'Submit'}
            </Button>
          </div>
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