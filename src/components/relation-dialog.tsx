"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { X, ArrowLeftRight } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

export type RelationType = "1-1" | "1-M" | "M-M";
export type RelationMode = "implicit" | "explicit";

export interface RelationOptions {
    type: RelationType;
    mode: RelationMode;
    junctionOrder?: "AonB" | "BonA"; // For explicit M:M, choose junction table name order
    nullable?: {
        source?: boolean; // For 1:1, nullable on source side
        target?: boolean; // For 1:1, nullable on target side
        // For 1:M, the "one" side will be nullable (automatically determined)
    };
}

interface RelationDialogProps {
    open: boolean;
    sourceModel: string;
    sourceField: string;
    targetModel: string;
    targetField: string;
    onSelect: (options: RelationOptions) => void;
    onCancel: () => void;
    onReverse?: () => void; // Callback to reverse the connection direction
}

export function RelationDialog({
    open,
    sourceModel,
    sourceField,
    targetModel,
    targetField,
    onSelect,
    onCancel,
    onReverse,
}: RelationDialogProps) {
    const [selectedType, setSelectedType] = React.useState<RelationType | null>(null);
    const [selectedMode, setSelectedMode] = React.useState<RelationMode>("implicit");
    const [junctionOrder, setJunctionOrder] = React.useState<"AonB" | "BonA">("AonB");
    const [nullableSource, setNullableSource] = React.useState(false); // For 1:1, nullable on source side
    const [nullableTarget, setNullableTarget] = React.useState(false); // For 1:1, nullable on target side

    if (!open) return null;

    const handleTypeSelect = (type: RelationType) => {
        setSelectedType(type);
        // Reset nullable options when switching types (user can choose for 1:1 and 1:M)
        if (type === "1-1" || type === "1-M") {
            // Keep current state or reset - let user decide
            // Don't auto-set for 1:M anymore
        } else {
            // For M:M, reset nullable options
            setNullableSource(false);
            setNullableTarget(false);
        }
    };

    const handleConfirm = () => {
        console.log("RelationDialog handleConfirm called", { selectedType, selectedMode, junctionOrder });
        if (selectedType) {
            const options: RelationOptions = {
                type: selectedType,
                mode: selectedMode,
                ...(selectedType === "M-M" && selectedMode === "explicit" ? { junctionOrder } : {}),
            };

            // Add nullable options for 1:1 and 1:M
            if (selectedType === "1-1") {
                if (nullableSource || nullableTarget) {
                    options.nullable = {
                        source: nullableSource,
                        target: nullableTarget,
                    };
                }
            } else if (selectedType === "1-M") {
                // For 1:M, include nullable if user selected it
                if (nullableSource) {
                    options.nullable = {
                        source: true, // The "one" side (source) is nullable
                    };
                }
            }

            console.log("Calling onSelect with:", options);
            onSelect(options);
        } else {
            console.warn("No relation type selected");
        }
    };

    // No longer needed - sections always show but are disabled when not applicable

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 dark:bg-black/70">
            <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-700 p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                        Select Relationship Type
                    </h3>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onCancel}
                        className="h-6 w-6"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <div className="mb-4 flex items-center gap-2">
                    <div className="text-sm text-zinc-600 dark:text-zinc-400 flex-1">
                        Connecting{" "}
                        {selectedType === "M-M" ? (
                            <>
                                <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">{sourceModel}</span> to <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">{targetModel}</span>
                            </>
                        ) : selectedType === "1-M" ? (
                            <>
                                <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">{sourceModel}.{sourceField}</span> to <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">{targetModel}</span>
                            </>
                        ) : (
                            <>
                                <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">{sourceModel}.{sourceField}</span> to <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">{targetModel}.{targetField}</span>
                            </>
                        )}
                    </div>
                    {onReverse && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onReverse}
                            className="h-8 w-8"
                            title="Reverse connection direction"
                        >
                            <ArrowLeftRight className="h-4 w-4" />
                        </Button>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                    {/* Left side - Relationship Types */}
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold mb-2 block">Relationship Type</Label>
                        <Button
                            variant={selectedType === "1-1" ? "default" : "outline"}
                            className="w-full justify-start h-auto py-3 text-left overflow-hidden"
                            onClick={() => handleTypeSelect("1-1")}
                        >
                            <div className="flex flex-col items-start gap-1 w-full min-w-0 overflow-hidden">
                                <span className="font-semibold whitespace-nowrap">One-to-One (1:1)</span>
                                <span className="text-xs text-zinc-500 dark:text-zinc-400 break-words w-full">
                                    Each record in {sourceModel} relates to exactly one record in {targetModel}
                                </span>
                            </div>
                        </Button>

                        <Button
                            variant={selectedType === "1-M" ? "default" : "outline"}
                            className="w-full justify-start h-auto py-3 text-left overflow-hidden"
                            onClick={() => handleTypeSelect("1-M")}
                        >
                            <div className="flex flex-col items-start gap-1 w-full min-w-0 overflow-hidden">
                                <span className="font-semibold whitespace-nowrap">One-to-Many (1:M)</span>
                                <span className="text-xs text-zinc-500 dark:text-zinc-400 break-words w-full">
                                    Each record in {sourceModel} can relate to many records in {targetModel}
                                </span>
                            </div>
                        </Button>

                        <Button
                            variant={selectedType === "M-M" ? "default" : "outline"}
                            className="w-full justify-start h-auto py-3 text-left overflow-hidden"
                            onClick={() => handleTypeSelect("M-M")}
                        >
                            <div className="flex flex-col items-start gap-1 w-full min-w-0 overflow-hidden">
                                <span className="font-semibold whitespace-nowrap">Many-to-Many (M:M)</span>
                                <span className="text-xs text-zinc-500 dark:text-zinc-400 break-words w-full">
                                    Records in {sourceModel} can relate to many records in {targetModel} and vice versa
                                </span>
                            </div>
                        </Button>
                    </div>

                    {/* Right side - Nullable, Relation Mode and Junction Table Name */}
                    <div className="space-y-4">
                        {/* Nullable - shown above Relation Mode */}
                        <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                            <Label className="text-sm font-semibold mb-2 block">Nullable</Label>
                            {selectedType === "1-1" ? (
                                // For 1:1, allow selecting which side is nullable or both
                                <div className="space-y-3">
                                    <div className="flex items-start space-x-2">
                                        <button
                                            type="button"
                                            onClick={() => !(!selectedType || (selectedType !== "1-1" && selectedType !== "1-M")) && setNullableSource(!nullableSource)}
                                            disabled={!selectedType || (selectedType !== "1-1" && selectedType !== "1-M")}
                                            className={`mt-0.5 w-5 h-5 rounded border-2 transition-colors flex items-center justify-center ${nullableSource
                                                ? "bg-blue-500 border-blue-500"
                                                : "bg-white dark:bg-zinc-700 border-zinc-300 dark:border-zinc-600"
                                                } ${!selectedType || (selectedType !== "1-1" && selectedType !== "1-M")
                                                    ? "opacity-50 cursor-not-allowed"
                                                    : "cursor-pointer"
                                                }`}
                                        >
                                            {nullableSource && (
                                                <svg className="w-3 h-3 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path d="M5 13l4 4L19 7"></path>
                                                </svg>
                                            )}
                                        </button>
                                        <Label
                                            className={!selectedType || (selectedType !== "1-1" && selectedType !== "1-M") ? "cursor-not-allowed opacity-50 flex-1" : "cursor-pointer flex-1"}
                                            onClick={() => !(!selectedType || (selectedType !== "1-1" && selectedType !== "1-M")) && setNullableSource(!nullableSource)}
                                        >
                                            <span className="font-medium block">{sourceModel}</span>
                                            <span className="text-xs text-zinc-500 dark:text-zinc-400 block">
                                                {sourceModel}.{sourceField} is nullable
                                            </span>
                                        </Label>
                                    </div>
                                    <div className="flex items-start space-x-2">
                                        <button
                                            type="button"
                                            onClick={() => !(!selectedType || (selectedType !== "1-1" && selectedType !== "1-M")) && setNullableTarget(!nullableTarget)}
                                            disabled={!selectedType || (selectedType !== "1-1" && selectedType !== "1-M")}
                                            className={`mt-0.5 w-5 h-5 rounded border-2 transition-colors flex items-center justify-center ${nullableTarget
                                                ? "bg-blue-500 border-blue-500"
                                                : "bg-white dark:bg-zinc-700 border-zinc-300 dark:border-zinc-600"
                                                } ${!selectedType || (selectedType !== "1-1" && selectedType !== "1-M")
                                                    ? "opacity-50 cursor-not-allowed"
                                                    : "cursor-pointer"
                                                }`}
                                        >
                                            {nullableTarget && (
                                                <svg className="w-3 h-3 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path d="M5 13l4 4L19 7"></path>
                                                </svg>
                                            )}
                                        </button>
                                        <Label
                                            className={!selectedType || (selectedType !== "1-1" && selectedType !== "1-M") ? "cursor-not-allowed opacity-50 flex-1" : "cursor-pointer flex-1"}
                                            onClick={() => !(!selectedType || (selectedType !== "1-1" && selectedType !== "1-M")) && setNullableTarget(!nullableTarget)}
                                        >
                                            <span className="font-medium block">{targetModel}</span>
                                            <span className="text-xs text-zinc-500 dark:text-zinc-400 block">
                                                {targetModel}.{targetField} is nullable
                                            </span>
                                        </Label>
                                    </div>
                                </div>
                            ) : selectedType === "1-M" ? (
                                // For 1:M, allow user to toggle nullable for the "one" side
                                <div className="flex items-start space-x-2">
                                    <button
                                        type="button"
                                        onClick={() => setNullableSource(!nullableSource)}
                                        className={`mt-0.5 w-5 h-5 rounded border-2 transition-colors flex items-center justify-center cursor-pointer ${nullableSource
                                            ? "bg-blue-500 border-blue-500"
                                            : "bg-white dark:bg-zinc-700 border-zinc-300 dark:border-zinc-600"
                                            }`}
                                    >
                                        {nullableSource && (
                                            <svg className="w-3 h-3 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                                <path d="M5 13l4 4L19 7"></path>
                                            </svg>
                                        )}
                                    </button>
                                    <Label
                                        className="cursor-pointer flex-1"
                                        onClick={() => setNullableSource(!nullableSource)}
                                    >
                                        <span className="font-medium block">{sourceModel} (One side)</span>
                                        <span className="text-xs text-zinc-500 dark:text-zinc-400 block">
                                            Make the "one" side nullable
                                        </span>
                                    </Label>
                                </div>
                            ) : (
                                // Disabled when no type selected or M:M selected
                                <div className="flex items-start space-x-2">
                                    <div className="mt-0.5 w-5 h-5 rounded border-2 bg-white dark:bg-zinc-700 border-zinc-300 dark:border-zinc-600 opacity-50"></div>
                                    <Label
                                        className="cursor-not-allowed opacity-50 flex-1"
                                    >
                                        <span className="font-medium block">Not applicable</span>
                                        <span className="text-xs text-zinc-500 dark:text-zinc-400 block">
                                            Nullable option is only available for 1:1 and 1:M relations
                                        </span>
                                    </Label>
                                </div>
                            )}
                        </div>

                        {/* Relation Mode - always shown */}
                        <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                            <Label className="text-sm font-semibold mb-2 block">Relation Mode</Label>
                            <RadioGroup
                                value={selectedMode}
                                onValueChange={(value) => setSelectedMode(value as RelationMode)}
                                disabled={!selectedType || selectedType === "1-1" || selectedType === "1-M"}
                            >
                                <div className="flex items-start space-x-2 mb-2">
                                    <RadioGroupItem
                                        value="implicit"
                                        id="implicit"
                                        disabled={!selectedType || selectedType === "1-1" || selectedType === "1-M"}
                                        className="mt-0.5"
                                    />
                                    <Label
                                        htmlFor="implicit"
                                        className={!selectedType || selectedType === "1-1" || selectedType === "1-M" ? "cursor-not-allowed opacity-50 flex-1" : "cursor-pointer flex-1"}
                                    >
                                        <span className="font-medium block">Implicit</span>
                                        <span className="text-xs text-zinc-500 dark:text-zinc-400 block">
                                            Prisma manages the relation table automatically
                                        </span>
                                    </Label>
                                </div>
                                <div className="flex items-start space-x-2">
                                    <RadioGroupItem
                                        value="explicit"
                                        id="explicit"
                                        disabled={!selectedType || selectedType === "1-1" || selectedType === "1-M"}
                                        className="mt-0.5"
                                    />
                                    <Label
                                        htmlFor="explicit"
                                        className={!selectedType || selectedType === "1-1" || selectedType === "1-M" ? "cursor-not-allowed opacity-50 flex-1" : "cursor-pointer flex-1"}
                                    >
                                        <span className="font-medium block">Explicit</span>
                                        <span className="text-xs text-zinc-500 dark:text-zinc-400 block">
                                            Create a junction table model for additional metadata
                                        </span>
                                    </Label>
                                </div>
                            </RadioGroup>
                        </div>

                        {/* Junction Table Name - always shown */}
                        <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                            <Label className="text-sm font-semibold mb-2 block">Junction Table Name</Label>
                            <RadioGroup
                                value={junctionOrder}
                                onValueChange={(value) => setJunctionOrder(value as "AonB" | "BonA")}
                                disabled={selectedType !== "M-M" || selectedMode !== "explicit"}
                            >
                                <div className="flex items-start space-x-2 mb-2">
                                    <RadioGroupItem
                                        value="AonB"
                                        id="aonb"
                                        disabled={selectedType !== "M-M" || selectedMode !== "explicit"}
                                        className="mt-0.5"
                                    />
                                    <Label
                                        htmlFor="aonb"
                                        className={selectedType !== "M-M" || selectedMode !== "explicit" ? "cursor-not-allowed opacity-50 flex-1" : "cursor-pointer flex-1"}
                                    >
                                        <span className="font-medium font-mono block">{sourceModel}On{targetModel}</span>
                                        <span className="text-xs text-zinc-500 dark:text-zinc-400 block">
                                            {sourceModel} comes first
                                        </span>
                                    </Label>
                                </div>
                                <div className="flex items-start space-x-2">
                                    <RadioGroupItem
                                        value="BonA"
                                        id="bona"
                                        disabled={selectedType !== "M-M" || selectedMode !== "explicit"}
                                        className="mt-0.5"
                                    />
                                    <Label
                                        htmlFor="bona"
                                        className={selectedType !== "M-M" || selectedMode !== "explicit" ? "cursor-not-allowed opacity-50 flex-1" : "cursor-pointer flex-1"}
                                    >
                                        <span className="font-medium font-mono block">{targetModel}On{sourceModel}</span>
                                        <span className="text-xs text-zinc-500 dark:text-zinc-400 block">
                                            {targetModel} comes first
                                        </span>
                                    </Label>
                                </div>
                            </RadioGroup>
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-2">
                    <Button variant="ghost" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={!selectedType}
                    >
                        Confirm
                    </Button>
                </div>
            </div>
        </div>
    );
}

