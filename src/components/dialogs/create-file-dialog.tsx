"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface CreateFileDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: (fileName: string) => void;
    defaultFileName: string;
    existingFiles: string[];
}

export function CreateFileDialog({
    open,
    onClose,
    onConfirm,
    defaultFileName,
    existingFiles
}: CreateFileDialogProps) {
    // Helper to split filename into name and extension
    const splitFilename = (filename: string, defaultExt: string) => {
        const lastDot = filename.lastIndexOf(".");
        if (lastDot === -1) {
            return { name: filename, ext: defaultExt };
        }
        return {
            name: filename.substring(0, lastDot),
            ext: filename.substring(lastDot),
        };
    };

    const [fileName, setFileName] = React.useState("");
    const [error, setError] = React.useState("");

    React.useEffect(() => {
        if (open) {
            const parts = splitFilename(defaultFileName, ".prisma");
            setFileName(parts.name);
            setError("");
        }
    }, [open, defaultFileName]);

    const handleConfirm = () => {
        const trimmedName = fileName.trim();
        if (!trimmedName) {
            setError("File name cannot be empty");
            return;
        }

        // Ensure .prisma extension
        const finalName = trimmedName.endsWith(".prisma")
            ? trimmedName
            : `${trimmedName}.prisma`;

        // Check if file already exists
        if (existingFiles.includes(finalName)) {
            setError("File already exists");
            return;
        }

        onConfirm(finalName);
        setFileName("");
        setError("");
        onClose();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            handleConfirm();
        } else if (e.key === "Escape") {
            onClose();
        }
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Create New Schema File
                    </DialogTitle>
                    <DialogDescription>
                        Enter a name for your new Prisma schema file.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div>
                        <Label className="text-sm font-semibold mb-2 block">
                            Filename
                        </Label>
                        <div className="flex gap-2">
                            <Input
                                type="text"
                                value={fileName}
                                onChange={(e) => {
                                    setFileName(e.target.value);
                                    setError("");
                                }}
                                onKeyDown={handleKeyDown}
                                placeholder={splitFilename(defaultFileName, ".prisma").name}
                                autoFocus
                                className={`flex-1 rounded-l rounded-r-0 border-r-0 ${error ? "border-destructive" : ""}`}
                            />
                            <Select value=".prisma" disabled>
                                <SelectTrigger className="rounded-l-0 rounded-r border-l-0 w-auto min-w-[100px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value=".prisma">.prisma</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {error && (
                        <div className="text-xs text-red-600 dark:text-red-400 px-3 py-2 bg-red-50 dark:bg-red-900/20 rounded transition-colors duration-200">
                            {error}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleConfirm}>
                        Create
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

