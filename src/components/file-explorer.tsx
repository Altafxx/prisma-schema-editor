"use client";

import { useState } from "react";
import { useSchemaStore } from "@/store/schema-store";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ImportDialog } from "./import-dialog";
import { ExportDialog } from "./export-dialog";
import { SettingsDialog } from "./settings-dialog";
import { DeleteDialog } from "./delete-dialog";
import { CreateFileDialog } from "./create-file-dialog";
import { useSettingsStore } from "@/store/settings-store";
import { SidebarWrapper } from "./sidebar-wrapper";
import { toast } from "sonner";

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
    const [showImportDialog, setShowImportDialog] = useState(false);
    const [showExportDialog, setShowExportDialog] = useState(false);
    const [showSettingsDialog, setShowSettingsDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showCreateFileDialog, setShowCreateFileDialog] = useState(false);
    const [fileToDelete, setFileToDelete] = useState<string | null>(null);

    const handleCreateFile = (fileName: string) => {
        addSchemaFile({
            name: fileName,
            content: "",
            isMain: false,
        });
        toast.success("File created", {
            description: `${fileName} has been created successfully.`,
        });
    };

    const handleDeleteFile = (fileId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setFileToDelete(fileId);
        setShowDeleteDialog(true);
    };

    const handleConfirmDelete = () => {
        if (fileToDelete) {
            deleteSchemaFile(fileToDelete);
            setFileToDelete(null);
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
                    onCreateFile={() => setShowCreateFileDialog(true)}
                    onImport={() => setShowImportDialog(true)}
                    onExport={() => setShowExportDialog(true)}
                    onSettings={() => setShowSettingsDialog(true)}
                    defaultFileName={defaultFileName}
                />
            </SidebarProvider>
            <ImportDialog open={showImportDialog} onClose={() => setShowImportDialog(false)} />
            <ExportDialog open={showExportDialog} onClose={() => setShowExportDialog(false)} />
            <SettingsDialog open={showSettingsDialog} onClose={() => setShowSettingsDialog(false)} />
            <DeleteDialog
                open={showDeleteDialog}
                onClose={() => {
                    setShowDeleteDialog(false);
                    setFileToDelete(null);
                }}
                onConfirm={handleConfirmDelete}
                filename={fileToDelete || ""}
            />
            <CreateFileDialog
                open={showCreateFileDialog}
                onClose={() => setShowCreateFileDialog(false)}
                onConfirm={handleCreateFile}
                defaultFileName={defaultFileName}
                existingFiles={schemaFiles.map((f) => f.name)}
            />
        </>
    );
}

