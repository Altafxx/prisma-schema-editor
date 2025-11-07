import { create } from "zustand";
import type { ParsedPrismaSchema } from "@/types/prisma";

export interface SchemaFile {
  name: string;
  content: string;
  isMain: boolean; // Main file contains datasource/generator
}

interface SchemaStore {
  // Legacy single-file support (for backward compatibility)
  schemaText: string;

  // Multi-file support
  schemaFiles: SchemaFile[];
  activeFileId: string | null;

  parsedSchema: ParsedPrismaSchema | null;
  error: string | null;
  isSyncing: boolean;

  // Legacy setters
  setSchemaText: (text: string) => void;

  // Multi-file setters
  setSchemaFiles: (files: SchemaFile[]) => void;
  addSchemaFile: (file: SchemaFile) => void;
  updateSchemaFile: (fileId: string, content: string) => void;
  deleteSchemaFile: (fileId: string) => void;
  renameSchemaFile: (fileId: string, newName: string) => void;
  setActiveFile: (fileId: string | null) => void;

  // Common setters
  setParsedSchema: (schema: ParsedPrismaSchema | null) => void;
  setError: (error: string | null) => void;
  setIsSyncing: (syncing: boolean) => void;

  // Helper to get merged schema text
  getMergedSchema: () => string;

  // Save/Load functions
  saveSchema: () => void;
  loadSchema: () => void;

  // Import/Export functions
  importSchemas: (files: SchemaFile[], replace: boolean) => void;
  exportSchemaData: () => { schemaFiles: SchemaFile[]; activeFileId: string | null };
}

const defaultSchemaContent = `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  posts     Post[]
  createdAt DateTime @default(now())
}

model Post {
  id        Int      @id @default(autoincrement())
  title     String
  content   String?
  published Boolean  @default(false)
  authorId  Int
  author    User     @relation(fields: [authorId], references: [id])
  createdAt  DateTime @default(now())
}`;

// Load saved schema on initialization
const loadSavedSchema = (): { schemaFiles: SchemaFile[]; activeFileId: string | null } => {
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem("prisma-schema-data");
      if (saved) {
        const data = JSON.parse(saved);
        if (data.schemaFiles && Array.isArray(data.schemaFiles) && data.schemaFiles.length > 0) {
          return {
            schemaFiles: data.schemaFiles,
            activeFileId: data.activeFileId || data.schemaFiles[0]?.name || null,
          };
        }
      }
    } catch (error) {
    }
  }
  // Default schema
  return {
    schemaFiles: [
      {
        name: "schema.prisma",
        content: defaultSchemaContent,
        isMain: true,
      },
    ],
    activeFileId: "schema.prisma",
  };
};

const initialData = loadSavedSchema();

export const useSchemaStore = create<SchemaStore>((set, get) => ({
  // Legacy support
  schemaText: initialData.schemaFiles.find((f) => f.isMain)?.content || defaultSchemaContent,

  // Multi-file support - initialize with saved schema or default
  schemaFiles: initialData.schemaFiles,
  activeFileId: initialData.activeFileId,

  parsedSchema: null,
  error: null,
  isSyncing: false,

  // Legacy setter - updates main file
  setSchemaText: (text) => {
    const state = get();
    const mainFile = state.schemaFiles.find((f) => f.isMain);
    if (mainFile) {
      state.updateSchemaFile(mainFile.name, text);
    } else {
      // Fallback to legacy behavior
      set({ schemaText: text });
    }
  },

  // Multi-file setters
  setSchemaFiles: (files) => set({ schemaFiles: files }),

  addSchemaFile: (file) => {
    const state = get();
    set({
      schemaFiles: [...state.schemaFiles, file],
      activeFileId: file.name,
    });
  },

  updateSchemaFile: (fileId, content) => {
    const state = get();
    set({
      schemaFiles: state.schemaFiles.map((file) =>
        file.name === fileId ? { ...file, content } : file
      ),
    });

    // Also update legacy schemaText if it's the main file
    const file = state.schemaFiles.find((f) => f.name === fileId);
    if (file?.isMain) {
      set({ schemaText: content });
    }
  },

  deleteSchemaFile: (fileId) => {
    const state = get();
    const file = state.schemaFiles.find((f) => f.name === fileId);
    if (file?.isMain) {
      // Don't allow deleting main file
      return;
    }

    const newFiles = state.schemaFiles.filter((f) => f.name !== fileId);
    const newActiveFileId =
      state.activeFileId === fileId
        ? newFiles[0]?.name || null
        : state.activeFileId;

    set({
      schemaFiles: newFiles,
      activeFileId: newActiveFileId,
    });
  },

  renameSchemaFile: (fileId, newName) => {
    const state = get();
    const file = state.schemaFiles.find((f) => f.name === fileId);
    if (!file) return;

    // Check if new name already exists
    if (state.schemaFiles.some((f) => f.name === newName && f.name !== fileId)) {
      return; // Name already exists
    }

    set({
      schemaFiles: state.schemaFiles.map((file) =>
        file.name === fileId ? { ...file, name: newName } : file
      ),
      activeFileId: state.activeFileId === fileId ? newName : state.activeFileId,
    });
  },

  setActiveFile: (fileId) => set({ activeFileId: fileId }),

  // Common setters
  setParsedSchema: (schema) => set({ parsedSchema: schema }),
  setError: (error) => set({ error }),
  setIsSyncing: (syncing) => set({ isSyncing: syncing }),

  // Get merged schema text from all files
  getMergedSchema: () => {
    const state = get();
    const mainFile = state.schemaFiles.find((f) => f.isMain);
    const otherFiles = state.schemaFiles.filter((f) => !f.isMain);

    // Combine all files - main file first (datasource/generator), then others
    const parts: string[] = [];

    if (mainFile) {
      parts.push(mainFile.content);
    }

    otherFiles.forEach((file) => {
      if (file.content.trim()) {
        parts.push(`\n// === ${file.name} ===\n${file.content}`);
      }
    });

    return parts.join("\n\n");
  },

  // Save schema files to localStorage
  saveSchema: () => {
    const state = get();
    if (typeof window !== "undefined") {
      try {
        const dataToSave = {
          schemaFiles: state.schemaFiles,
          activeFileId: state.activeFileId,
          timestamp: Date.now(),
        };
        localStorage.setItem("prisma-schema-data", JSON.stringify(dataToSave));
      } catch (error) {
      }
    }
  },

  // Load schema files from localStorage
  loadSchema: () => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("prisma-schema-data");
        if (saved) {
          const data = JSON.parse(saved);
          if (data.schemaFiles && Array.isArray(data.schemaFiles)) {
            set({
              schemaFiles: data.schemaFiles,
              activeFileId: data.activeFileId || data.schemaFiles[0]?.name || null,
            });
            return true;
          }
        }
      } catch (error) {
      }
    }
    return false;
  },

  // Import schemas from files
  importSchemas: (files, replace) => {
    const state = get();

    if (replace) {
      // Replace all existing files
      // Ensure at least one file is marked as main
      const filesWithMain = files.length > 0
        ? files.map((f, i) => ({ ...f, isMain: i === 0 && !files.some(f2 => f2.isMain) }))
        : files;

      set({
        schemaFiles: filesWithMain,
        activeFileId: filesWithMain[0]?.name || null,
      });
    } else {
      // Merge with existing files
      const existingNames = new Set(state.schemaFiles.map((f) => f.name));
      const newFiles: SchemaFile[] = [];

      files.forEach((file) => {
        let finalName = file.name;
        let counter = 1;

        // Handle name conflicts by appending numbers
        while (existingNames.has(finalName)) {
          const nameWithoutExt = file.name.replace(/\.prisma$/, "");
          finalName = `${nameWithoutExt}_${counter}.prisma`;
          counter++;
        }

        existingNames.add(finalName);
        newFiles.push({
          ...file,
          name: finalName,
          isMain: false, // Don't allow imported files to override main file
        });
      });

      set({
        schemaFiles: [...state.schemaFiles, ...newFiles],
        activeFileId: newFiles[0]?.name || state.activeFileId,
      });
    }

    // Auto-save after import
    state.saveSchema();
  },

  // Export schema data
  exportSchemaData: () => {
    const state = get();
    return {
      schemaFiles: state.schemaFiles,
      activeFileId: state.activeFileId,
    };
  },
}));

