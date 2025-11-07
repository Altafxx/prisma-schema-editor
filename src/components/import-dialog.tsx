"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useSchemaStore, type SchemaFile } from "@/store/schema-store";
import {
    readPrismaFile,
    extractPrismaFilesFromZip,
} from "@/lib/file-utils";

interface ImportDialogProps {
    open: boolean;
    onClose: () => void;
}

export function ImportDialog({ open, onClose }: ImportDialogProps) {
    const importSchemas = useSchemaStore((state) => state.importSchemas);
    const [replaceMode, setReplaceMode] = React.useState<"replace" | "merge">("replace");
    const [isProcessing, setIsProcessing] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsProcessing(true);
        setError(null);

        try {
            const schemaFiles: SchemaFile[] = [];

            for (let i = 0; i < files.length; i++) {
                const file = files[i];

                if (file.name.endsWith(".zip")) {
                    // Extract .prisma files from zip
                    const extractedFiles = await extractPrismaFilesFromZip(file);
                    extractedFiles.forEach((extracted) => {
                        schemaFiles.push({
                            name: extracted.name,
                            content: extracted.content,
                            isMain: false,
                        });
                    });
                } else if (file.name.endsWith(".prisma")) {
                    // Read .prisma file directly
                    const content = await readPrismaFile(file);
                    schemaFiles.push({
                        name: file.name,
                        content,
                        isMain: false,
                    });
                } else {
                    throw new Error(`Unsupported file type: ${file.name}. Only .prisma and .zip files are supported.`);
                }
            }

            if (schemaFiles.length === 0) {
                throw new Error("No .prisma files found in the selected files.");
            }

            // Import the schemas
            importSchemas(schemaFiles, replaceMode === "replace");

            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }

            // Close dialog on success
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to import files");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && !isProcessing && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Import Schema Files</DialogTitle>
                    <DialogDescription>
                        You can select single or multiple .prisma files, or a .zip file containing .prisma files
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div>
                        <Label className="text-sm font-semibold mb-2 block">
                            Import Mode
                        </Label>
                        <RadioGroup
                            value={replaceMode}
                            onValueChange={(value) => setReplaceMode(value as "replace" | "merge")}
                            disabled={isProcessing}
                            className="flex flex-col gap-3"
                        >
                            <div className="flex items-start space-x-2">
                                <RadioGroupItem value="replace" id="replace" disabled={isProcessing} className="mt-0.5" />
                                <Label
                                    htmlFor="replace"
                                    className={isProcessing ? "cursor-not-allowed opacity-50 flex-1" : "cursor-pointer flex-1"}
                                >
                                    <span className="font-medium block">Replace existing</span>
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400 block transition-colors duration-200">
                                        Remove all current files and import new ones
                                    </span>
                                </Label>
                            </div>
                            <div className="flex items-start space-x-2">
                                <RadioGroupItem value="merge" id="merge" disabled={isProcessing} className="mt-0.5" />
                                <Label
                                    htmlFor="merge"
                                    className={isProcessing ? "cursor-not-allowed opacity-50 flex-1" : "cursor-pointer flex-1"}
                                >
                                    <span className="font-medium block">Merge with existing</span>
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400 block transition-colors duration-200">
                                        Add imported files alongside current files
                                    </span>
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>

                    <div>
                        <Label className="text-sm font-semibold mb-2 block">
                            Select Files
                        </Label>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".prisma,.zip"
                            multiple
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                        <Button
                            onClick={handleClick}
                            disabled={isProcessing}
                            className="w-full"
                            variant="outline"
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <Upload className="h-4 w-4 mr-2" />
                                    Choose Files
                                </>
                            )}
                        </Button>
                    </div>

                    {error && (
                        <div className="text-xs text-red-600 dark:text-red-400 px-3 py-2 bg-red-50 dark:bg-red-900/20 rounded transition-colors duration-200">
                            {error}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={onClose} disabled={isProcessing}>
                        Cancel
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

