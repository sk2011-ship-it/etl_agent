import Markdown from "react-markdown";

type ChatMessageProps = {
  role: 'user' | 'assistant';
  content: string;
};

export function ChatMessage({ role, content }: ChatMessageProps) {
  return (
    <div className={`flex ${role === "user" ? "justify-end" : "justify-start"} p-2`}>
      <div
        className={`p-3 rounded-lg ${
          role === "user" ? "bg-gray-500 text-white" : "bg-gray-200 text-gray-800"
        }`}
      >
        <Markdown>{content}</Markdown>
      </div>
    </div>
  );
}