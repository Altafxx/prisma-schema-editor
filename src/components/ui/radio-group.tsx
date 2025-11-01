"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface RadioGroupContextValue {
    value: string;
    onValueChange: (value: string) => void;
    disabled?: boolean;
}

const RadioGroupContext = React.createContext<RadioGroupContextValue | undefined>(undefined);

export interface RadioGroupProps {
    value: string;
    onValueChange: (value: string) => void;
    children: React.ReactNode;
    className?: string;
    disabled?: boolean;
}

export function RadioGroup({ value, onValueChange, children, className, disabled }: RadioGroupProps) {
    return (
        <RadioGroupContext.Provider value={{ value, onValueChange, disabled }}>
            <div className={cn("space-y-2", className)}>{children}</div>
        </RadioGroupContext.Provider>
    );
}

export interface RadioGroupItemProps {
    value: string;
    id: string;
    className?: string;
    disabled?: boolean;
}

export const RadioGroupItem = React.forwardRef<HTMLButtonElement, RadioGroupItemProps>(
    ({ value, id, className, disabled: itemDisabled, ...props }, ref) => {
        const context = React.useContext(RadioGroupContext);
        if (!context) {
            throw new Error("RadioGroupItem must be used within RadioGroup");
        }

        const isChecked = context.value === value;
        const disabled = itemDisabled || context.disabled;

        return (
            <button
                ref={ref}
                type="button"
                role="radio"
                aria-checked={isChecked}
                id={id}
                onClick={() => !disabled && context.onValueChange(value)}
                disabled={disabled}
                className={cn(
                    "aspect-square h-4 w-4 rounded-full border border-primary text-primary focus:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                    isChecked && "border-primary bg-primary",
                    className
                )}
                {...props}
            >
                {isChecked && (
                    <div className="flex items-center justify-center h-full">
                        <div className="h-2 w-2 rounded-full bg-white" />
                    </div>
                )}
            </button>
        );
    }
);
RadioGroupItem.displayName = "RadioGroupItem";

