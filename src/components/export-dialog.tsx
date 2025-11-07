"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useSchemaStore } from "@/store/schema-store";
import { useSettingsStore } from "@/store/settings-store";
import { createZipFromFiles, downloadFile } from "@/lib/file-utils";

interface ExportDialogProps {
    open: boolean;
    onClose: () => void;
}

export function ExportDialog({ open, onClose }: ExportDialogProps) {
    const exportSchemaData = useSchemaStore((state) => state.exportSchemaData);
    const schemaFiles = useSchemaStore((state) => state.schemaFiles);
    const { defaultZipName, defaultFileName } = useSettingsStore((state) => state.settings);
    const mainFile = schemaFiles.find((f) => f.isMain);
    const hasMultipleFiles = schemaFiles.length > 1;

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

    const [filenameName, setFilenameName] = React.useState("");
    const [isExporting, setIsExporting] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    // Determine the extension based on export type
    const fileExtension = hasMultipleFiles ? ".zip" : ".prisma";

    // Set default filename when dialog opens
    React.useEffect(() => {
        if (open) {
            let defaultFilename = "";
            if (hasMultipleFiles) {
                defaultFilename = defaultZipName;
            } else if (mainFile) {
                defaultFilename = mainFile.name;
            } else {
                defaultFilename = defaultFileName;
            }
            const parts = splitFilename(defaultFilename, fileExtension);
            setFilenameName(parts.name);
        }
    }, [open, hasMultipleFiles, mainFile, defaultZipName, defaultFileName, fileExtension]);

    const handleExport = async () => {
        setIsExporting(true);
        setError(null);

        try {
            const data = exportSchemaData();

            if (hasMultipleFiles) {
                // Export as zip
                const zipBlob = await createZipFromFiles(
                    data.schemaFiles.map((f) => ({
                        name: f.name,
                        content: f.content,
                    }))
                );

                const name = filenameName.trim() || splitFilename(defaultZipName, ".zip").name;
                const zipFilename = `${name}.zip`;

                downloadFile(zipBlob, zipFilename);
            } else {
                // Export single file
                const file = mainFile || data.schemaFiles[0];
                if (!file) {
                    throw new Error("No schema file to export");
                }

                const blob = new Blob([file.content], { type: "text/plain" });
                const defaultName = mainFile ? splitFilename(mainFile.name, ".prisma").name : splitFilename(defaultFileName, ".prisma").name;
                const name = filenameName.trim() || defaultName;
                const prismaFilename = `${name}.prisma`;

                downloadFile(blob, prismaFilename);
            }

            // Close dialog on success
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to export files");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && !isExporting && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Export Schema {hasMultipleFiles ? "Files" : "File"}</DialogTitle>
                    <DialogDescription>
                        {hasMultipleFiles
                            ? "All schema files will be exported as a zip archive"
                            : `Exporting: ${mainFile?.name || "schema.prisma"}`}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div>
                        <Label className="text-sm font-semibold mb-2 block">
                            Filename {hasMultipleFiles ? "(optional)" : "(optional)"}
                        </Label>
                        <div className="flex gap-2">
                            <Input
                                type="text"
                                value={filenameName}
                                onChange={(e) => setFilenameName(e.target.value)}
                                disabled={isExporting}
                                placeholder={
                                    hasMultipleFiles
                                        ? splitFilename(defaultZipName, ".zip").name
                                        : mainFile
                                            ? splitFilename(mainFile.name, ".prisma").name
                                            : splitFilename(defaultFileName, ".prisma").name
                                }
                                className="flex-1 rounded-l rounded-r-0 border-r-0"
                            />
                            <Select value={fileExtension} disabled>
                                <SelectTrigger className="rounded-l-0 rounded-r border-l-0 w-auto min-w-[100px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={fileExtension}>{fileExtension}</SelectItem>
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
                    <Button variant="ghost" onClick={onClose} disabled={isExporting}>
                        Cancel
                    </Button>
                    <Button onClick={handleExport} disabled={isExporting}>
                        {isExporting ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Exporting...
                            </>
                        ) : (
                            <>
                                Export
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

