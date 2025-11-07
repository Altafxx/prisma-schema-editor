"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { X, Download, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
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

    const [filename, setFilename] = React.useState("");
    const [isExporting, setIsExporting] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    // Set default filename when dialog opens
    React.useEffect(() => {
        if (open) {
            if (hasMultipleFiles) {
                setFilename(defaultZipName);
            } else if (mainFile) {
                setFilename(mainFile.name);
            } else {
                setFilename(defaultFileName);
            }
        }
    }, [open, hasMultipleFiles, mainFile, defaultZipName, defaultFileName]);

    if (!open) return null;

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

                const finalFilename = filename.trim() || defaultZipName;
                const zipFilename = finalFilename.endsWith(".zip")
                    ? finalFilename
                    : `${finalFilename}.zip`;

                downloadFile(zipBlob, zipFilename);
            } else {
                // Export single file
                const file = mainFile || data.schemaFiles[0];
                if (!file) {
                    throw new Error("No schema file to export");
                }

                const blob = new Blob([file.content], { type: "text/plain" });
                const finalFilename = filename.trim() || file.name;
                const prismaFilename = finalFilename.endsWith(".prisma")
                    ? finalFilename
                    : `${finalFilename}.prisma`;

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
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 dark:bg-black/70 transition-colors duration-200">
            <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-700 p-6 w-full max-w-md transition-colors duration-200">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 transition-colors duration-200">
                        Export Schema {hasMultipleFiles ? "Files" : "File"}
                    </h3>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="h-6 w-6"
                        disabled={isExporting}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <div className="space-y-4">
                    <div>
                        <Label className="text-sm font-semibold mb-2 block transition-colors duration-200">
                            Filename {hasMultipleFiles ? "(optional)" : "(optional)"}
                        </Label>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2 transition-colors duration-200">
                            {hasMultipleFiles
                                ? "All schema files will be exported as a zip archive"
                                : `Exporting: ${mainFile?.name || "schema.prisma"}`}
                        </p>
                        <input
                            type="text"
                            value={filename}
                            onChange={(e) => setFilename(e.target.value)}
                            disabled={isExporting}
                            placeholder={hasMultipleFiles ? defaultZipName : mainFile?.name || defaultFileName}
                            className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded text-zinc-900 dark:text-zinc-100 transition-colors duration-200 disabled:opacity-50"
                        />
                    </div>

                    {error && (
                        <div className="text-xs text-red-600 dark:text-red-400 px-3 py-2 bg-red-50 dark:bg-red-900/20 rounded transition-colors duration-200">
                            {error}
                        </div>
                    )}
                </div>

                <div className="mt-6 flex justify-end gap-2">
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
                                <Download className="h-4 w-4 mr-2" />
                                Export
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}

