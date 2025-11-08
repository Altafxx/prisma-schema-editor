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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useSchemaStore } from "@/store/schema-store";
import { useSettingsStore } from "@/store/settings-store";
import { createZipFromFiles, downloadFile } from "@/lib/file-utils";
import { toast } from "sonner";

interface ExportDialogProps {
    open: boolean;
    onClose: () => void;
    onExportDiagram?: (backgroundTheme?: "light" | "dark", nodeTheme?: "light" | "dark") => Promise<string | null>;
}

export function ExportDialog({ open, onClose, onExportDiagram }: ExportDialogProps) {
    const exportSchemaData = useSchemaStore((state) => state.exportSchemaData);
    const schemaFiles = useSchemaStore((state) => state.schemaFiles);
    const { defaultZipName, defaultFileName } = useSettingsStore((state) => state.settings);
    const mainFile = schemaFiles.find((f) => f.isMain);
    const hasMultipleFiles = schemaFiles.length > 1;

    const [activeTab, setActiveTab] = React.useState<"schema" | "diagram">("schema");
    const [exportFormat, setExportFormat] = React.useState<"svg" | "png" | "pdf">("svg");
    const [filenameName, setFilenameName] = React.useState("");
    const [isExporting, setIsExporting] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [backgroundTheme, setBackgroundTheme] = React.useState<"light" | "dark" | "auto">("auto");
    const [nodeTheme, setNodeTheme] = React.useState<"light" | "dark" | "auto">("auto");

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

    // Determine the extension based on export type and format
    const getFileExtension = () => {
        if (activeTab === "diagram") {
            return `.${exportFormat}`;
        }
        return hasMultipleFiles ? ".zip" : ".prisma";
    };

    const fileExtension = getFileExtension();

    // Set default filename when dialog opens or tab changes
    React.useEffect(() => {
        if (open) {
            let defaultFilename = "";
            if (activeTab === "diagram") {
                defaultFilename = "diagram";
            } else if (hasMultipleFiles) {
                defaultFilename = defaultZipName;
            } else if (mainFile) {
                defaultFilename = mainFile.name;
            } else {
                defaultFilename = defaultFileName;
            }
            const parts = splitFilename(defaultFilename, fileExtension);
            setFilenameName(parts.name);
        }
    }, [open, activeTab, hasMultipleFiles, mainFile, defaultZipName, defaultFileName, fileExtension]);

    const handleExport = async () => {
        setIsExporting(true);
        setError(null);

        try {
            if (activeTab === "diagram") {
                // Export diagram
                if (!onExportDiagram) {
                    throw new Error("Diagram export not available");
                }

                if (exportFormat === "svg") {
                    // Determine actual themes based on selection
                    const currentIsDark = typeof window !== "undefined" && document.documentElement.classList.contains("dark");
                    const actualBackgroundTheme = backgroundTheme === "auto"
                        ? (currentIsDark ? "dark" : "light")
                        : backgroundTheme;
                    const actualNodeTheme = nodeTheme === "auto"
                        ? (currentIsDark ? "dark" : "light")
                        : nodeTheme;

                    const svgContent = await onExportDiagram?.(actualBackgroundTheme, actualNodeTheme);
                    if (!svgContent) {
                        throw new Error("Failed to generate diagram export");
                    }

                    const name = filenameName.trim() || "diagram";
                    const svgFilename = `${name}.svg`;

                    const blob = new Blob([svgContent], { type: "image/svg+xml" });
                    downloadFile(blob, svgFilename);

                    toast.success("Export successful", {
                        description: "Diagram exported as SVG successfully.",
                    });
                } else {
                    // PNG and PDF coming soon
                    toast.info("Coming soon", {
                        description: `${exportFormat.toUpperCase()} export will be available soon.`,
                    });
                    setIsExporting(false);
                    return;
                }
            } else {
                // Export schema
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

                toast.success("Export successful", {
                    description: `File${hasMultipleFiles ? "s" : ""} exported successfully.`,
                });
            }

            // Close dialog on success
            onClose();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Failed to export";
            setError(errorMessage);
            toast.error("Export failed", {
                description: errorMessage,
            });
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && !isExporting && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Export</DialogTitle>
                    <DialogDescription>
                        Choose what you want to export and the format
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "schema" | "diagram")} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="schema">Schema</TabsTrigger>
                        <TabsTrigger value="diagram">Diagram</TabsTrigger>
                    </TabsList>

                    <TabsContent value="schema" className="space-y-4 mt-4">
                        <div>
                            <Label className="text-sm font-semibold mb-2 block">
                                Filename (optional)
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
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                {hasMultipleFiles
                                    ? "All schema files will be exported as a zip archive"
                                    : `Exporting: ${mainFile?.name || "schema.prisma"}`}
                            </p>
                        </div>
                    </TabsContent>

                    <TabsContent value="diagram" className="space-y-4 mt-4">
                        <div>
                            <Label className="text-sm font-semibold mb-2 block">
                                Format
                            </Label>
                            <Select
                                value={exportFormat}
                                onValueChange={(v) => setExportFormat(v as "svg" | "png" | "pdf")}
                                disabled={isExporting}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="svg">SVG</SelectItem>
                                    <SelectItem value="png" disabled>
                                        PNG <span className="text-xs text-zinc-500 ml-2">(Coming soon)</span>
                                    </SelectItem>
                                    <SelectItem value="pdf" disabled>
                                        PDF <span className="text-xs text-zinc-500 ml-2">(Coming soon)</span>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="text-sm font-semibold mb-2 block">
                                    Background Theme
                                </Label>
                                <Select
                                    value={backgroundTheme}
                                    onValueChange={(v) => setBackgroundTheme(v as "light" | "dark" | "auto")}
                                    disabled={isExporting}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="auto">Auto (Current)</SelectItem>
                                        <SelectItem value="light">Light</SelectItem>
                                        <SelectItem value="dark">Dark</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="text-sm font-semibold mb-2 block">
                                    Node Theme
                                </Label>
                                <Select
                                    value={nodeTheme}
                                    onValueChange={(v) => setNodeTheme(v as "light" | "dark" | "auto")}
                                    disabled={isExporting}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="auto">Auto (Current)</SelectItem>
                                        <SelectItem value="light">Light</SelectItem>
                                        <SelectItem value="dark">Dark</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div>
                            <Label className="text-sm font-semibold mb-2 block">
                                Filename (optional)
                            </Label>
                            <div className="flex gap-2">
                                <Input
                                    type="text"
                                    value={filenameName}
                                    onChange={(e) => setFilenameName(e.target.value)}
                                    disabled={isExporting}
                                    placeholder="diagram"
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
                    </TabsContent>
                </Tabs>

                {error && (
                    <div className="text-xs text-red-600 dark:text-red-400 px-3 py-2 bg-red-50 dark:bg-red-900/20 rounded transition-colors duration-200">
                        {error}
                    </div>
                )}

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
                                <Download className="h-4 w-4 mr-2" />
                                Export
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
