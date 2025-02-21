import { useState, useCallback } from "react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function useChat() {
  const [requestData, setRequestData] = useState<string>("");
  const [responseData, setResponseData] = useState<ChatMessage[]>([]);
  const [currentSteps, setCurrentSteps] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleResponse = useCallback(async () => {
    if (!requestData.trim() || isProcessing) return;
    
    setIsProcessing(true);
    setCurrentSteps([]);
    const newUserMessage: ChatMessage = { role: "user", content: requestData };
    setResponseData(prev => [...prev, newUserMessage]);

    try {
      const response = await fetch('/api/analysis/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentMessage: requestData,
          messageHistory: [...responseData, newUserMessage],
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '') continue;
          
          try {
            const cleanedLine = line.replace(/^data: /, '').trim();
            if (!cleanedLine) continue;
            
            const data = JSON.parse(cleanedLine);
            
            if (data.step) {
              setCurrentSteps(prevSteps => [...prevSteps, data.step]);
            } else if (data.message) {
              setResponseData(prev => {
                const lastMessage = prev[prev.length - 1];
                if (lastMessage?.role === 'assistant' && lastMessage.content === data.message) {
                  return prev;
                }
                return [...prev, { role: "assistant", content: data.message }];
              });
            }
          } catch (e) {
            console.error("Error parsing line:", e, line);
          }
        }
      }
    } catch (error) {
      console.error("Error with streaming response:", error);
      setResponseData(prev => [...prev, {
        role: "assistant",
        content: "Sorry, there was an error processing your request."
      }]);
    } finally {
      setIsProcessing(false);
      setRequestData("");
    }
  }, [requestData, responseData, isProcessing]);

  return {
    requestData,
    setRequestData,
    responseData,
    currentSteps,
    handleResponse,
    isProcessing,
  };
} 