"use client";

import { useState } from "react";
import { useSchemaStore } from "@/store/schema-store";
import {
    Sidebar,
    SidebarContent,
    SidebarHeader,
    SidebarProvider,
    SidebarTrigger,
    useSidebar,
} from "@/components/ui/sidebar";
import { ImportDialog } from "./import-dialog";
import { ExportDialog } from "./export-dialog";
import { SettingsDialog } from "./settings-dialog";
import { Button } from "@/components/ui/button";
import { Upload, Download, Settings } from "lucide-react";
import { useSettingsStore } from "@/store/settings-store";

export function FileExplorer() {
    const {
        schemaFiles,
        activeFileId,
        setActiveFile,
        addSchemaFile,
        deleteSchemaFile,
        renameSchemaFile,
    } = useSchemaStore();
    const { defaultFileName } = useSettingsStore((state) => state.settings);

    const [renamingFileId, setRenamingFileId] = useState<string | null>(null);
    const [newFileName, setNewFileName] = useState("");
    const [showAddFile, setShowAddFile] = useState(false);
    const [newFileInput, setNewFileInput] = useState("");
    const [showImportDialog, setShowImportDialog] = useState(false);
    const [showExportDialog, setShowExportDialog] = useState(false);
    const [showSettingsDialog, setShowSettingsDialog] = useState(false);

    const handleAddFile = () => {
        const fileName = newFileInput.trim();
        if (!fileName) return;

        // Ensure .prisma extension
        const finalName = fileName.endsWith(".prisma")
            ? fileName
            : `${fileName}.prisma`;

        // Check if file already exists
        if (schemaFiles.some((f) => f.name === finalName)) {
            alert("File already exists");
            return;
        }

        addSchemaFile({
            name: finalName,
            content: "",
            isMain: false,
        });

        setNewFileInput("");
        setShowAddFile(false);
    };

    const handleDeleteFile = (fileId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm(`Delete ${fileId}?`)) {
            deleteSchemaFile(fileId);
        }
    };

    const handleStartRename = (fileId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setRenamingFileId(fileId);
        setNewFileName(fileId);
    };

    const handleFinishRename = (fileId: string) => {
        if (!newFileName.trim()) {
            setRenamingFileId(null);
            return;
        }

        const finalName = newFileName.endsWith(".prisma")
            ? newFileName
            : `${newFileName}.prisma`;

        renameSchemaFile(fileId, finalName);
        setRenamingFileId(null);
        setNewFileName("");
    };

    const mainFile = schemaFiles.find((f) => f.isMain);
    const otherFiles = schemaFiles.filter((f) => !f.isMain);

    return (
        <>
            <SidebarProvider defaultOpen={true}>
                <SidebarWrapper
                    mainFile={mainFile}
                    otherFiles={otherFiles}
                    activeFileId={activeFileId}
                    setActiveFile={setActiveFile}
                    onStartRename={handleStartRename}
                    onFinishRename={handleFinishRename}
                    onDelete={handleDeleteFile}
                    renamingFileId={renamingFileId}
                    newFileName={newFileName}
                    setNewFileName={setNewFileName}
                    showAddFile={showAddFile}
                    setShowAddFile={setShowAddFile}
                    newFileInput={newFileInput}
                    setNewFileInput={setNewFileInput}
                    onAddFile={handleAddFile}
                    onImport={() => setShowImportDialog(true)}
                    onExport={() => setShowExportDialog(true)}
                    onSettings={() => setShowSettingsDialog(true)}
                    defaultFileName={defaultFileName}
                />
            </SidebarProvider>
            <ImportDialog open={showImportDialog} onClose={() => setShowImportDialog(false)} />
            <ExportDialog open={showExportDialog} onClose={() => setShowExportDialog(false)} />
            <SettingsDialog open={showSettingsDialog} onClose={() => setShowSettingsDialog(false)} />
        </>
    );
}

interface SidebarWrapperProps {
    mainFile?: { name: string; content: string; isMain: boolean };
    otherFiles: Array<{ name: string; content: string; isMain: boolean }>;
    activeFileId: string | null;
    setActiveFile: (fileId: string) => void;
    onStartRename: (fileId: string, e: React.MouseEvent) => void;
    onFinishRename: (fileId: string) => void;
    onDelete: (fileId: string, e: React.MouseEvent) => void;
    renamingFileId: string | null;
    newFileName: string;
    setNewFileName: (name: string) => void;
    showAddFile: boolean;
    setShowAddFile: (show: boolean) => void;
    newFileInput: string;
    setNewFileInput: (input: string) => void;
    onAddFile: () => void;
    onImport: () => void;
    onExport: () => void;
    onSettings: () => void;
    defaultFileName: string;
}

function SidebarWrapper({
    mainFile,
    otherFiles,
    activeFileId,
    setActiveFile,
    onStartRename,
    onFinishRename,
    onDelete,
    renamingFileId,
    newFileName,
    setNewFileName,
    showAddFile,
    setShowAddFile,
    newFileInput,
    setNewFileInput,
    onAddFile,
    onImport,
    onExport,
    onSettings,
    defaultFileName,
}: SidebarWrapperProps) {
    const { open } = useSidebar();

    return (
        <>
            {/* External trigger when collapsed */}
            {!open && (
                <div className="flex items-start justify-center border-r border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 pt-2 min-w-12 transition-colors duration-200">
                    <SidebarTrigger />
                </div>
            )}
            <Sidebar
                side="left"
                collapsible="offcanvas"
                className="bg-zinc-50 dark:bg-zinc-950 border-zinc-300 dark:border-zinc-700 transition-colors duration-200"
            >
                <SidebarHeader className="justify-between">
                    <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide transition-colors duration-200">
                        Schema Files
                    </h3>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setShowAddFile(true)}
                            className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 text-sm px-1.5 py-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors duration-200"
                            title="Add new file"
                        >
                            +
                        </button>
                        {open && <SidebarTrigger />}
                    </div>
                </SidebarHeader>

                <SidebarContent>
                    <div className="flex-1 overflow-y-auto py-2">
                        {/* Main file */}
                        {mainFile && (
                            <div>
                                <div className="px-3 py-1 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                                    Main
                                </div>
                                <FileItem
                                    file={mainFile}
                                    isActive={activeFileId === mainFile.name}
                                    onClick={() => setActiveFile(mainFile.name)}
                                    onRename={(e) => onStartRename(mainFile.name, e)}
                                    onDelete={(e) => onDelete(mainFile.name, e)}
                                    isRenaming={renamingFileId === mainFile.name}
                                    newFileName={newFileName}
                                    setNewFileName={setNewFileName}
                                    onFinishRename={() => onFinishRename(mainFile.name)}
                                    canDelete={false}
                                />
                            </div>
                        )}

                        {/* Other files */}
                        {otherFiles.length > 0 && (
                            <div className="mt-4">
                                <div className="px-3 py-1 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                                    Models
                                </div>
                                {otherFiles.map((file) => (
                                    <FileItem
                                        key={file.name}
                                        file={file}
                                        isActive={activeFileId === file.name}
                                        onClick={() => setActiveFile(file.name)}
                                        onRename={(e) => onStartRename(file.name, e)}
                                        onDelete={(e) => onDelete(file.name, e)}
                                        isRenaming={renamingFileId === file.name}
                                        newFileName={newFileName}
                                        setNewFileName={setNewFileName}
                                        onFinishRename={() => onFinishRename(file.name)}
                                        canDelete={true}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Add file input */}
                        {showAddFile && (
                            <div className="px-3 py-2 border-t border-zinc-300 dark:border-zinc-700">
                                <input
                                    type="text"
                                    value={newFileInput}
                                    onChange={(e) => setNewFileInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            onAddFile();
                                        } else if (e.key === "Escape") {
                                            setShowAddFile(false);
                                            setNewFileInput("");
                                        }
                                    }}
                                    placeholder={defaultFileName}
                                    className="w-full px-2 py-1 text-sm bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded text-zinc-900 dark:text-zinc-100"
                                    autoFocus
                                />
                                <div className="flex gap-1 mt-1">
                                    <button
                                        onClick={onAddFile}
                                        className="text-xs px-2 py-0.5 bg-blue-500 text-white rounded hover:bg-blue-600"
                                    >
                                        Add
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowAddFile(false);
                                            setNewFileInput("");
                                        }}
                                        className="text-xs px-2 py-0.5 bg-zinc-300 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded hover:bg-zinc-400 dark:hover:bg-zinc-600"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Import/Export buttons at bottom */}
                    <div className="flex flex-col *:py-4 *:w-full *:justify-start *:text-sm *:rounded-none *:border-x-0 *:border-t *:border-b-0 *:border-zinc-300 dark:*:border-zinc-700 hover:*:cursor-pointer">
                        <Button
                            onClick={onImport}
                            variant="outline"
                        >
                            <Upload className="h-4 w-4 mr-2" />
                            Import
                        </Button>
                        <Button
                            onClick={onExport}
                            variant="outline"
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Export
                        </Button>
                        <Button
                            onClick={onSettings}
                            variant="outline"
                        >
                            <Settings className="h-4 w-4 mr-2" />
                            Settings
                        </Button>
                    </div>
                </SidebarContent>
            </Sidebar>
        </>
    );
}

interface FileItemProps {
    file: { name: string; content: string; isMain: boolean };
    isActive: boolean;
    onClick: () => void;
    onRename: (e: React.MouseEvent) => void;
    onDelete: (e: React.MouseEvent) => void;
    isRenaming: boolean;
    newFileName: string;
    setNewFileName: (name: string) => void;
    onFinishRename: () => void;
    canDelete: boolean;
}

function FileItem({
    file,
    isActive,
    onClick,
    onRename,
    onDelete,
    isRenaming,
    newFileName,
    setNewFileName,
    onFinishRename,
    canDelete,
}: FileItemProps) {
    if (isRenaming) {
        return (
            <div className="px-3 py-1">
                <input
                    type="text"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            onFinishRename();
                        } else if (e.key === "Escape") {
                            setNewFileName(file.name);
                            onFinishRename();
                        }
                    }}
                    onBlur={onFinishRename}
                    className="w-full px-2 py-0.5 text-sm bg-white dark:bg-zinc-900 border border-blue-500 rounded text-zinc-900 dark:text-zinc-100"
                    autoFocus
                />
            </div>
        );
    }

    return (
        <div
            className={`px-3 py-1.5 cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-800 group flex items-center justify-between ${isActive
                ? "bg-blue-100 dark:bg-blue-900/30 border-l-2 border-blue-500"
                : ""
                }`}
            onClick={onClick}
        >
            <span className="text-sm text-zinc-900 dark:text-zinc-100 truncate flex-1">
                {file.name}
            </span>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                <button
                    onClick={onRename}
                    className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 text-xs px-1"
                    title="Rename"
                >
                    ✎
                </button>
                {canDelete && (
                    <button
                        onClick={onDelete}
                        className="text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 text-xs px-1"
                        title="Delete"
                    >
                        ×
                    </button>
                )}
            </div>
        </div>
    );
}

