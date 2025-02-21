"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Markdown from "react-markdown";
import { useChat } from "@/app/hooks/useChat";
import { useEffect, useState, useRef } from "react";

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
                  className={`p-3 rounded-lg ${
                    message.role === "user"
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
          <Input
            placeholder="Type your message here..."
            value={requestData}
            onChange={(e) => setRequestData(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isProcessing}
          />
          <Button 
            variant="secondary" 
            onClick={handleResponse}
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Submit'}
          </Button>
        </div>
      </div>
    </>
  );
}