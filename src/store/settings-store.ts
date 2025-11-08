import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { RelationMode } from "@/components/dialogs/relation-dialog";

export type Theme = "light" | "dark" | "system";
export type GridPattern = "lines" | "dots" | "none";

export interface Settings {
    theme: Theme;
    defaultFileName: string;
    defaultZipName: string;
    defaultRelationMode: RelationMode;
    gridPattern: GridPattern;
    gridOpacity: number;
    hideExtension: boolean;
}

interface SettingsStore {
    settings: Settings;
    updateSettings: (updates: Partial<Settings>) => void;
    resetSettings: () => void;
}

const defaultSettings: Settings = {
    theme: "system",
    defaultFileName: "schema.prisma",
    defaultZipName: "prisma-schema.zip",
    defaultRelationMode: "implicit",
    gridPattern: "dots",
    gridOpacity: 0.5,
    hideExtension: false,
};

export const useSettingsStore = create<SettingsStore>()(
    persist(
        (set) => ({
            settings: defaultSettings,
            updateSettings: (updates) =>
                set((state) => ({
                    settings: {
                        ...state.settings,
                        ...updates,
                    },
                })),
            resetSettings: () =>
                set({
                    settings: defaultSettings,
                }),
        }),
        {
            name: "app-settings",
            partialize: (state) => ({ settings: state.settings }),
            merge: (persistedState, currentState) => {
                const persisted = persistedState as { settings?: Partial<Settings> };
                return {
                    ...currentState,
                    settings: {
                        ...defaultSettings,
                        ...(persisted?.settings || {}),
                    },
                };
            },
        }
    )
);

