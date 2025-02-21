import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface FileViewerProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  filename: string;
}

export function FileViewer({ isOpen, onClose, content, filename }: FileViewerProps) {
  const getFileExtension = (filename: string) => {
    return filename.split('.').pop()?.toLowerCase() || '';
  };

  const renderContent = () => {
    const extension = getFileExtension(filename);

    switch (extension) {
      case 'json':
        try {
          const formattedJson = JSON.stringify(JSON.parse(content), null, 2);
          return (
            <pre className="bg-gray-100 p-4 rounded-lg overflow-auto">
              <code className="text-sm">{formattedJson}</code>
            </pre>
          );
        } catch {
          return <pre className="whitespace-pre-wrap">{content}</pre>;
        }

      case 'xml':
        return (
          <pre className="bg-gray-100 p-4 rounded-lg overflow-auto">
            <code className="text-sm block">{content}</code>
          </pre>
        );

      case 'csv':
        return (
          <pre className="bg-gray-100 p-4 rounded-lg overflow-auto">
            <code className="text-sm">{content}</code>
          </pre>
        );

      case 'docx':
        return (
          <pre className="whitespace-pre-wrap bg-gray-100 p-4 rounded-lg overflow-auto">
            <code className="text-sm">{content}</code>
          </pre>
        );

      default:
        return <pre className="whitespace-pre-wrap">{content}</pre>;
    }
  };

  return (  
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{filename}</DialogTitle>
        </DialogHeader>
        <div className="overflow-auto max-h-[60vh]">
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
}