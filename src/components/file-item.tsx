"use client";

import { useSettingsStore } from "@/store/settings-store";
import { Button } from "@/components/ui/button";

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

export function FileItem({
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
    const { hideExtension } = useSettingsStore((state) => state.settings);

    // Split filename into name and extension
    const splitFilename = (filename: string) => {
        const lastDot = filename.lastIndexOf(".");
        if (lastDot === -1) {
            return { name: filename, ext: "" };
        }
        return {
            name: filename.substring(0, lastDot),
            ext: filename.substring(lastDot),
        };
    };

    const { name: fileName, ext: fileExt } = splitFilename(file.name);

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
                {hideExtension ? (
                    fileName
                ) : (
                    <>
                        {fileName}
                        {fileExt && <span className="opacity-50">{fileExt}</span>}
                    </>
                )}
            </span>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                <Button
                    onClick={onRename}
                    variant="ghost"
                    size="icon-sm"
                    className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 text-xs h-6 w-6"
                    title="Rename"
                >
                    ✎
                </Button>
                {canDelete && (
                    <Button
                        onClick={onDelete}
                        variant="ghost"
                        size="icon-sm"
                        className="text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 text-xs h-6 w-6"
                        title="Delete"
                    >
                        ×
                    </Button>
                )}
            </div>
        </div>
    );
}

