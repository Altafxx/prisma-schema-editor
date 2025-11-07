"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Monitor } from "lucide-react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
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
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useSettingsStore } from "@/store/settings-store";
import { useTheme } from "next-themes";
import type { Theme, GridPattern } from "@/store/settings-store";
import type { RelationMode } from "./relation-dialog";
import { toast } from "sonner";

// Fix for displayName error - assign displayName to Slider component
if (typeof Slider !== "undefined" && !(Slider as any).displayName) {
    (Slider as any).displayName = "Slider";
}

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
    const [gridPattern, setGridPattern] = React.useState<GridPattern>(settings.gridPattern);
    const [gridOpacity, setGridOpacity] = React.useState(settings.gridOpacity);
    const [hideExtension, setHideExtension] = React.useState(settings.hideExtension);

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
            setGridPattern(settings.gridPattern);
            setGridOpacity(settings.gridOpacity);
            setHideExtension(settings.hideExtension);
        }
    }, [open, settings]);

    // Update full filename when name part changes
    const handleFileNameChange = (name: string) => {
        setDefaultFileName(name ? `${name}.prisma` : ".prisma");
    };

    const handleZipNameChange = (name: string) => {
        setDefaultZipName(name ? `${name}.zip` : ".zip");
    };

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
            gridPattern,
            gridOpacity,
            hideExtension,
        });

        // Update theme if it changed
        const themeChanged = theme !== currentTheme;
        if (themeChanged && mounted) {
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

        // Show toast notification
        if (themeChanged) {
            const themeLabels: Record<string, string> = {
                light: "Light",
                dark: "Dark",
                system: "System",
            };
            toast.success("Theme changed", {
                description: `Theme set to ${themeLabels[theme] || theme}.`,
            });
        } else {
            toast.success("Settings saved", {
                description: "Your settings have been saved successfully.",
            });
        }

        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Settings</DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                    {/* Left Section */}
                    <div className="space-y-8">
                        {/* Appearance Category */}
                        <div>
                            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4 pb-2 border-b border-zinc-200 dark:border-zinc-700 transition-colors duration-200">
                                Appearance
                            </h4>
                            <div className="space-y-6">
                                {/* Theme Selection */}
                                <div>
                                    <Label className="text-sm font-semibold mb-3 block transition-colors duration-200">
                                        Theme
                                    </Label>
                                    <RadioGroup
                                        value={theme}
                                        onValueChange={(value) => setTheme(value as Theme)}
                                        className="flex flex-col gap-3"
                                    >
                                        <div className="flex items-start space-x-2">
                                            <RadioGroupItem value="light" id="theme-light" className="mt-0.5" />
                                            <Label htmlFor="theme-light" className="cursor-pointer flex-1">
                                                <div className="flex items-center gap-2">
                                                    <Sun className="h-4 w-4" />
                                                    <span className="font-medium">Light</span>
                                                </div>
                                            </Label>
                                        </div>
                                        <div className="flex items-start space-x-2">
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

                                {/* Hide Extension */}
                                <div>
                                    <div className="flex items-start space-x-2">
                                        <Checkbox
                                            id="hide-extension"
                                            checked={hideExtension}
                                            onCheckedChange={(checked) => setHideExtension(checked === true)}
                                            className="mt-0.5"
                                        />
                                        <Label htmlFor="hide-extension" className="cursor-pointer flex-1">
                                            <span className="font-medium block">Hide File Extensions</span>
                                            <span className="text-xs text-zinc-500 dark:text-zinc-400 block transition-colors duration-200">
                                                Hide file extensions in the sidebar (extensions are shown at 50% opacity by default)
                                            </span>
                                        </Label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Files Category */}
                        <div>
                            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4 pb-2 border-b border-zinc-200 dark:border-zinc-700 transition-colors duration-200">
                                Files
                            </h4>
                            <div className="space-y-6">
                                {/* Default File Name */}
                                <div>
                                    <Label className="text-sm font-semibold mb-2 block transition-colors duration-200">
                                        Default File Name
                                    </Label>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2 transition-colors duration-200">
                                        Default name for new schema files
                                    </p>
                                    <div className="flex gap-2">
                                        <Input
                                            type="text"
                                            value={fileNameParts.name}
                                            onChange={(e) => handleFileNameChange(e.target.value)}
                                            placeholder="schema"
                                            className="flex-1 rounded-l rounded-r-0 border-r-0"
                                        />
                                        <Select value={fileNameParts.ext} disabled>
                                            <SelectTrigger className="rounded-l-0 rounded-r border-l-0 w-auto min-w-[100px]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value=".prisma">.prisma</SelectItem>
                                            </SelectContent>
                                        </Select>
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
                                    <div className="flex gap-2">
                                        <Input
                                            type="text"
                                            value={zipNameParts.name}
                                            onChange={(e) => handleZipNameChange(e.target.value)}
                                            placeholder="prisma-schema"
                                            className="flex-1 rounded-l rounded-r-0 border-r-0"
                                        />
                                        <Select value={zipNameParts.ext} disabled>
                                            <SelectTrigger className="rounded-l-0 rounded-r border-l-0 w-auto min-w-[80px]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value=".zip">.zip</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Section */}
                    <div className="space-y-8">
                        {/* Canvas Category */}
                        <div>
                            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4 pb-2 border-b border-zinc-200 dark:border-zinc-700 transition-colors duration-200">
                                Canvas
                            </h4>
                            <div className="space-y-6">
                                {/* Grid Pattern */}
                                <div>
                                    <Label className="text-sm font-semibold mb-3 block transition-colors duration-200">
                                        Grid Pattern
                                    </Label>
                                    <RadioGroup
                                        value={gridPattern}
                                        onValueChange={(value) => setGridPattern(value as GridPattern)}
                                        className="flex flex-col gap-3"
                                    >
                                        <div className="flex items-start space-x-2">
                                            <RadioGroupItem value="dots" id="grid-dots" className="mt-0.5" />
                                            <Label htmlFor="grid-dots" className="cursor-pointer flex-1">
                                                <span className="font-medium block">Dots</span>
                                                <span className="text-xs text-zinc-500 dark:text-zinc-400 block transition-colors duration-200">
                                                    Display dot pattern on the canvas
                                                </span>
                                            </Label>
                                        </div>
                                        <div className="flex items-start space-x-2">
                                            <RadioGroupItem value="lines" id="grid-lines" className="mt-0.5" />
                                            <Label htmlFor="grid-lines" className="cursor-pointer flex-1">
                                                <span className="font-medium block">Lines</span>
                                                <span className="text-xs text-zinc-500 dark:text-zinc-400 block transition-colors duration-200">
                                                    Display grid lines on the canvas
                                                </span>
                                            </Label>
                                        </div>
                                        <div className="flex items-start space-x-2">
                                            <RadioGroupItem value="none" id="grid-none" className="mt-0.5" />
                                            <Label htmlFor="grid-none" className="cursor-pointer flex-1">
                                                <span className="font-medium block">None</span>
                                                <span className="text-xs text-zinc-500 dark:text-zinc-400 block transition-colors duration-200">
                                                    No background pattern
                                                </span>
                                            </Label>
                                        </div>
                                    </RadioGroup>
                                </div>

                                {/* Grid Opacity */}
                                {gridPattern !== "none" && (
                                    <div>
                                        <Label className="text-sm font-semibold mb-2 block transition-colors duration-200">
                                            Grid Opacity
                                        </Label>
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2 transition-colors duration-200">
                                            Adjust the opacity of the grid pattern
                                        </p>
                                        <div className="flex items-center gap-3">
                                            <Slider
                                                value={[gridOpacity * 100]}
                                                onValueChange={(value) => setGridOpacity(value[0] / 100)}
                                                min={0}
                                                max={100}
                                                step={1}
                                                className="flex-1"
                                            />
                                            <div className="w-16 text-right">
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    step="1"
                                                    value={Math.round(gridOpacity * 100)}
                                                    onChange={(e) => {
                                                        const value = parseInt(e.target.value) || 0;
                                                        setGridOpacity(Math.max(0, Math.min(100, value)) / 100);
                                                    }}
                                                    className="w-full text-right"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Schema Category */}
                        <div>
                            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4 pb-2 border-b border-zinc-200 dark:border-zinc-700 transition-colors duration-200">
                                Schema
                            </h4>
                            <div className="space-y-6">
                                {/* Default Relation Mode */}
                                <div>
                                    <Label className="text-sm font-semibold mb-3 block transition-colors duration-200">
                                        Default Relation Mode
                                    </Label>
                                    <RadioGroup
                                        value={defaultRelationMode}
                                        onValueChange={(value) => setDefaultRelationMode(value as RelationMode)}
                                        className="flex flex-col gap-3"
                                    >
                                        <div className="flex items-start space-x-2">
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
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave}>
                        Save
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

