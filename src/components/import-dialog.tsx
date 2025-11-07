"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { X, Upload, Loader2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
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

    if (!open) return null;

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
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 dark:bg-black/70 transition-colors duration-200">
            <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-700 p-6 w-full max-w-md transition-colors duration-200">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 transition-colors duration-200">
                        Import Schema Files
                    </h3>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="h-6 w-6"
                        disabled={isProcessing}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <div className="space-y-4">
                    <div>
                        <Label className="text-sm font-semibold mb-2 block transition-colors duration-200">
                            Import Mode
                        </Label>
                        <RadioGroup
                            value={replaceMode}
                            onValueChange={(value) => setReplaceMode(value as "replace" | "merge")}
                            disabled={isProcessing}
                        >
                            <div className="flex items-start space-x-2 mb-2">
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
                        <Label className="text-sm font-semibold mb-2 block transition-colors duration-200">
                            Select Files
                        </Label>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3 transition-colors duration-200">
                            You can select single or multiple .prisma files, or a .zip file containing .prisma files
                        </p>
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

                <div className="mt-6 flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose} disabled={isProcessing}>
                        Cancel
                    </Button>
                </div>
            </div>
        </div>
    );
}

