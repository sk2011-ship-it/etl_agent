import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ChatInputProps = {
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onSubmit: () => void;
  disabled: boolean;
  isProcessing: boolean;
};

export function ChatInput({
  placeholder,
  value,
  onChange,
  onKeyDown,
  onSubmit,
  disabled,
  isProcessing,
}: ChatInputProps) {
  return (
    <div className="flex-1 flex gap-2">
      <Input
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        disabled={disabled}
      />
      <Button
        variant="secondary"
        onClick={onSubmit}
        disabled={disabled || (!value.trim())}
      >
        {isProcessing ? 'Processing...' : 'Submit'}
      </Button>
    </div>
  );
}