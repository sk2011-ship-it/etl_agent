import { Plus, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type FileControlsProps = {
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onFileView: () => void;
  savedFiles: string[];
  onFileClick: (filename: string) => void;
};

export function FileControls({
  onFileUpload,
  onFileView,
  savedFiles,
  onFileClick,
}: FileControlsProps) {
  return (
    <div className="flex gap-2">
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
                onChange={onFileUpload}
                multiple
              />
            </label>
          </TooltipTrigger>
          <TooltipContent>
            <p>Upload files</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog>
        <DialogTrigger asChild>
          <div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="flex justify-center items-center w-9 h-9 rounded-lg border-2 border-input hover:bg-accent hover:text-accent-foreground transition-colors"
                    onClick={onFileView}
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
                    onClick={() => onFileClick(filename)}
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
  );
}