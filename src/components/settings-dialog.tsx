"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { X, Moon, Sun, Monitor } from "lucide-react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useSettingsStore } from "@/store/settings-store";
import { useTheme } from "next-themes";
import type { Theme } from "@/store/settings-store";
import type { RelationMode } from "./relation-dialog";

interface SettingsDialogProps {
    open: boolean;
    onClose: () => void;
}

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
    const { settings, updateSettings } = useSettingsStore();
    const { setTheme: setNextTheme, theme: currentTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);

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

    // Local state for form
    const [theme, setTheme] = React.useState<Theme>(settings.theme);
    const [defaultFileName, setDefaultFileName] = React.useState(settings.defaultFileName);
    const [defaultZipName, setDefaultZipName] = React.useState(settings.defaultZipName);
    const [defaultRelationMode, setDefaultRelationMode] = React.useState<RelationMode>(settings.defaultRelationMode);

    // Split filenames into name and extension
    const fileNameParts = React.useMemo(() => splitFilename(defaultFileName, ".prisma"), [defaultFileName]);
    const zipNameParts = React.useMemo(() => splitFilename(defaultZipName, ".zip"), [defaultZipName]);

    // Avoid hydration mismatch
    React.useEffect(() => {
        setMounted(true);
    }, []);

    // Load settings when dialog opens
    React.useEffect(() => {
        if (open) {
            setTheme(settings.theme);
            setDefaultFileName(settings.defaultFileName);
            setDefaultZipName(settings.defaultZipName);
            setDefaultRelationMode(settings.defaultRelationMode);
        }
    }, [open, settings]);

    // Update full filename when name part changes
    const handleFileNameChange = (name: string) => {
        setDefaultFileName(name ? `${name}.prisma` : ".prisma");
    };

    const handleZipNameChange = (name: string) => {
        setDefaultZipName(name ? `${name}.zip` : ".zip");
    };

    if (!open) return null;

    const handleSave = () => {
        // Ensure extensions are correct
        const fileName = defaultFileName.trim() || "schema";
        const zipName = defaultZipName.trim() || "prisma-schema";
        const finalFileName = fileName.endsWith(".prisma") ? fileName : `${fileName}.prisma`;
        const finalZipName = zipName.endsWith(".zip") ? zipName : `${zipName}.zip`;

        // Update settings store
        updateSettings({
            theme,
            defaultFileName: finalFileName,
            defaultZipName: finalZipName,
            defaultRelationMode,
        });

        // Update theme if it changed
        if (theme !== currentTheme && mounted) {
            // Use the same theme handling logic from mode-toggle
            if (typeof window !== "undefined") {
                localStorage.setItem("theme", theme);
                const root = document.documentElement;
                root.classList.remove("light", "dark");

                if (theme === "system") {
                    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
                    if (systemPrefersDark) {
                        root.classList.add("dark");
                    } else {
                        root.classList.add("light");
                    }
                } else if (theme === "dark") {
                    root.classList.add("dark");
                } else {
                    root.classList.add("light");
                }
            }
            setNextTheme(theme);
        }

        onClose();
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 dark:bg-black/70 transition-colors duration-200">
            <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-700 p-6 w-full max-w-md transition-colors duration-200">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 transition-colors duration-200">
                        Settings
                    </h3>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="h-6 w-6"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <div className="space-y-6">
                    {/* Theme Selection */}
                    <div>
                        <Label className="text-sm font-semibold mb-3 block transition-colors duration-200">
                            Theme
                        </Label>
                        <RadioGroup
                            value={theme}
                            onValueChange={(value) => setTheme(value as Theme)}
                        >
                            <div className="flex items-start space-x-2 mb-2">
                                <RadioGroupItem value="light" id="theme-light" className="mt-0.5" />
                                <Label htmlFor="theme-light" className="cursor-pointer flex-1">
                                    <div className="flex items-center gap-2">
                                        <Sun className="h-4 w-4" />
                                        <span className="font-medium">Light</span>
                                    </div>
                                </Label>
                            </div>
                            <div className="flex items-start space-x-2 mb-2">
                                <RadioGroupItem value="dark" id="theme-dark" className="mt-0.5" />
                                <Label htmlFor="theme-dark" className="cursor-pointer flex-1">
                                    <div className="flex items-center gap-2">
                                        <Moon className="h-4 w-4" />
                                        <span className="font-medium">Dark</span>
                                    </div>
                                </Label>
                            </div>
                            <div className="flex items-start space-x-2">
                                <RadioGroupItem value="system" id="theme-system" className="mt-0.5" />
                                <Label htmlFor="theme-system" className="cursor-pointer flex-1">
                                    <div className="flex items-center gap-2">
                                        <Monitor className="h-4 w-4" />
                                        <span className="font-medium">System</span>
                                    </div>
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>

                    {/* Default File Name */}
                    <div>
                        <Label className="text-sm font-semibold mb-2 block transition-colors duration-200">
                            Default File Name
                        </Label>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2 transition-colors duration-200">
                            Default name for new schema files
                        </p>
                        <div className="flex gap-0">
                            <input
                                type="text"
                                value={fileNameParts.name}
                                onChange={(e) => handleFileNameChange(e.target.value)}
                                placeholder="schema"
                                className="flex-1 px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-l text-zinc-900 dark:text-zinc-100 transition-colors duration-200"
                            />
                            <select
                                disabled
                                value={fileNameParts.ext}
                                className="px-3 py-2 text-sm bg-zinc-100 dark:bg-zinc-800 border border-l-0 border-zinc-300 dark:border-zinc-700 rounded-r text-zinc-600 dark:text-zinc-400 cursor-not-allowed transition-colors duration-200"
                            >
                                <option value=".prisma">.prisma</option>
                            </select>
                        </div>
                    </div>

                    {/* Default Zip Name */}
                    <div>
                        <Label className="text-sm font-semibold mb-2 block transition-colors duration-200">
                            Default Zip Name
                        </Label>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2 transition-colors duration-200">
                            Default name for exported zip archives
                        </p>
                        <div className="flex gap-0">
                            <input
                                type="text"
                                value={zipNameParts.name}
                                onChange={(e) => handleZipNameChange(e.target.value)}
                                placeholder="prisma-schema"
                                className="flex-1 px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-l text-zinc-900 dark:text-zinc-100 transition-colors duration-200"
                            />
                            <select
                                disabled
                                value={zipNameParts.ext}
                                className="px-3 py-2 text-sm bg-zinc-100 dark:bg-zinc-800 border border-l-0 border-zinc-300 dark:border-zinc-700 rounded-r text-zinc-600 dark:text-zinc-400 cursor-not-allowed transition-colors duration-200"
                            >
                                <option value=".zip">.zip</option>
                            </select>
                        </div>
                    </div>

                    {/* Default Relation Mode */}
                    <div>
                        <Label className="text-sm font-semibold mb-3 block transition-colors duration-200">
                            Default Relation Mode
                        </Label>
                        <RadioGroup
                            value={defaultRelationMode}
                            onValueChange={(value) => setDefaultRelationMode(value as RelationMode)}
                        >
                            <div className="flex items-start space-x-2 mb-2">
                                <RadioGroupItem value="implicit" id="relation-implicit" className="mt-0.5" />
                                <Label htmlFor="relation-implicit" className="cursor-pointer flex-1">
                                    <span className="font-medium block">Implicit</span>
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400 block transition-colors duration-200">
                                        Prisma manages the relation table automatically
                                    </span>
                                </Label>
                            </div>
                            <div className="flex items-start space-x-2">
                                <RadioGroupItem value="explicit" id="relation-explicit" className="mt-0.5" />
                                <Label htmlFor="relation-explicit" className="cursor-pointer flex-1">
                                    <span className="font-medium block">Explicit</span>
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400 block transition-colors duration-200">
                                        Create a junction table model for additional metadata
                                    </span>
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave}>
                        Save
                    </Button>
                </div>
            </div>
        </div>
    );
}

