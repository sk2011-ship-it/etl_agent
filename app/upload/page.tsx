"use client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Uploader() {
    const [files, setFiles] = useState<FileList | null>(null);
    const { toast } = useToast();

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setFiles(event.target.files);
        }
    };

    console.log(files, "files");

    const handleUpload = async () => {
        if (!files) {
            toast({
                title: "No files selected",
                description: "Please select files to upload",
                variant: "destructive",
            });
            return;
        }

        try {
            console.log('Files to upload:', Array.from(files)); // This will show file objects
            let filenames: string[] = [];

            Array.from(files).forEach((file) => {
                filenames.push(file.name);
            });

            const response = await fetch('/api/upload', {
                method: 'POST',
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ data: filenames }),
            });

            if (response.ok) {
                toast({
                    title: "Success",
                    description: "Files uploaded successfully",
                });
                setFiles(null);
            } else {
                throw new Error('Upload failed');
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to upload files",
                variant: "destructive",
            });
        }
    };

    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold mb-4">Uploader</h1>
            <div className="flex flex-col items-center justify-center space-y-4">
                <Input
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="max-w-md"
                />
                {files && (
                    <div className="text-sm text-gray-500">
                        {Array.from(files).map((file, index) => (
                            <div key={index}>
                                {file.name} ({Math.round(file.size / 1024)} KB)
                            </div>
                        ))}
                    </div>
                )}
                <Button
                    onClick={handleUpload}
                    disabled={!files}
                    className="w-full max-w-md"
                >
                    Upload {files ? `(${files.length} files)` : ''}
                </Button>
            </div>
        </div>
    );
}