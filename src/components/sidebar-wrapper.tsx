"use client";

import {
    Sidebar,
    SidebarContent,
    SidebarHeader,
    SidebarTrigger,
    useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Upload, Download, Settings, Plus } from "lucide-react";
import { FileItem } from "./file-item";

export interface SidebarWrapperProps {
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

export function SidebarWrapper({
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
        <Sidebar
            side="left"
            collapsible="icon"
            className="bg-zinc-50 dark:bg-zinc-950 border-zinc-300 dark:border-zinc-700 transition-all duration-300 ease-in-out"
        >
            <SidebarHeader className="relative flex items-center">
                <SidebarTrigger className={`shrink-0 absolute z-10 ${open ? "left-6" : "left-1/2 -translate-x-1/2"}`} />
                {open && (
                    <>
                        <div className="flex items-center gap-2 flex-1 min-w-0 ml-12">
                            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tracking-wide transition-opacity duration-300 whitespace-nowrap">
                                Schema Files
                            </h2>
                        </div>
                        <Button
                            onClick={() => setShowAddFile(true)}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            title="Add new file"
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </>
                )}
            </SidebarHeader>

            <SidebarContent>
                <div className={`flex-1 overflow-y-auto py-2 transition-opacity duration-300 ${!open ? "opacity-0 pointer-events-none overflow-hidden" : "opacity-100"}`}>
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

                {/* Import/Export/Settings buttons at bottom */}
                <div className="flex flex-col gap-1 px-3 pb-2 *:px-2">
                    <Button
                        onClick={onImport}
                        variant="ghost"
                        size="icon"
                        className={open ? "w-full justify-start" : "w-full justify-center"}
                        title="Import"
                    >
                        <Upload className="h-4 w-4 shrink-0" />
                        {open && <span className="ml-2 text-sm whitespace-nowrap">Import</span>}
                    </Button>
                    <Button
                        onClick={onExport}
                        variant="ghost"
                        size="icon"
                        className={open ? "w-full justify-start" : "w-full justify-center"}
                        title="Export"
                    >
                        <Download className="h-4 w-4 shrink-0" />
                        {open && <span className="ml-2 text-sm whitespace-nowrap">Export</span>}
                    </Button>
                    <Button
                        onClick={onSettings}
                        variant="ghost"
                        size="icon"
                        className={open ? "w-full justify-start" : "w-full justify-center"}
                        title="Settings"
                    >
                        <Settings className="h-4 w-4 shrink-0" />
                        {open && <span className="ml-2 text-sm whitespace-nowrap">Settings</span>}
                    </Button>
                </div>
            </SidebarContent>
        </Sidebar>
    );
}

