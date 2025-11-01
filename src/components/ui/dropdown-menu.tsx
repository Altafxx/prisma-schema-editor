"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface DropdownMenuContextValue {
    open: boolean;
    setOpen: (open: boolean) => void;
    triggerRef: React.RefObject<HTMLElement | null>;
}

const DropdownMenuContext = React.createContext<DropdownMenuContextValue | null>(
    null
);

interface DropdownMenuProps {
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

const DropdownMenu = ({ children, open: controlledOpen, onOpenChange }: DropdownMenuProps) => {
    const [internalOpen, setInternalOpen] = React.useState(false);
    const triggerRef = React.useRef<HTMLElement | null>(null);
    const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
    const setOpen = React.useCallback(
        (newOpen: boolean) => {
            if (controlledOpen === undefined) {
                setInternalOpen(newOpen);
            }
            onOpenChange?.(newOpen);
        },
        [controlledOpen, onOpenChange]
    );

    return (
        <DropdownMenuContext.Provider value={{ open, setOpen, triggerRef }}>
            <div className="relative">{children}</div>
        </DropdownMenuContext.Provider>
    );
};

interface DropdownMenuTriggerProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    asChild?: boolean;
}

const DropdownMenuTrigger = React.forwardRef<
    HTMLButtonElement,
    DropdownMenuTriggerProps
>(({ className, asChild, children, ...props }, ref) => {
    const context = React.useContext(DropdownMenuContext);
    if (!context) {
        throw new Error("DropdownMenuTrigger must be used within DropdownMenu");
    }

    const combinedRef = React.useCallback(
        (node: HTMLButtonElement | null) => {
            if (typeof ref === "function") {
                ref(node);
            } else if (ref) {
                ref.current = node;
            }
            if (context.triggerRef) {
                context.triggerRef.current = node;
            }
        },
        [ref, context.triggerRef]
    );

    if (asChild && React.isValidElement(children)) {
        return React.cloneElement(children as React.ReactElement, {
            ref: combinedRef,
            onClick: () => context.setOpen(!context.open),
        });
    }

    return (
        <button
            ref={combinedRef}
            className={className}
            onClick={() => context.setOpen(!context.open)}
            {...props}
        >
            {children}
        </button>
    );
});
DropdownMenuTrigger.displayName = "DropdownMenuTrigger";

interface DropdownMenuContentProps
    extends React.HTMLAttributes<HTMLDivElement> {
    align?: "start" | "end" | "center";
}

const DropdownMenuContent = React.forwardRef<
    HTMLDivElement,
    DropdownMenuContentProps
>(({ className, align = "start", children, ...props }, ref) => {
    const context = React.useContext(DropdownMenuContext);
    const [position, setPosition] = React.useState({ top: 0, left: 0 });

    if (!context) {
        throw new Error("DropdownMenuContent must be used within DropdownMenu");
    }

    // Calculate position based on trigger element
    React.useEffect(() => {
        if (context.open && context.triggerRef?.current) {
            const trigger = context.triggerRef.current;
            const rect = trigger.getBoundingClientRect();
            setPosition({
                top: rect.bottom + 4,
                left: align === "end" ? rect.right : rect.left,
            });
        }
    }, [context.open, context.triggerRef, align]);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const content = ref && "current" in ref ? ref.current : null;
            const trigger = context.triggerRef?.current;

            // Don't close if clicking inside the dropdown content
            if (content && content.contains(target)) {
                return;
            }

            // Close if click is outside both content and trigger
            if (!trigger || !trigger.contains(target)) {
                context.setOpen(false);
            }
        };

        if (context.open && typeof window !== "undefined") {
            // Use click event (bubbling phase) so menu item onClick fires first
            document.addEventListener("click", handleClickOutside);
        }

        return () => {
            if (typeof window !== "undefined") {
                document.removeEventListener("click", handleClickOutside);
            }
        };
    }, [context.open, context, ref]);

    if (!context.open) return null;

    // Use fixed positioning with very high z-index instead of portal
    // This avoids issues with React 19/Next.js 16 createPortal import
    return (
        <div
            ref={ref}
            className={cn(
                "fixed z-[9999] min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg",
                align === "end" && "ml-auto",
                align === "center" && "mx-auto",
                className
            )}
            style={{
                top: `${position.top}px`,
                ...(align === "end"
                    ? { right: `${typeof window !== "undefined" ? window.innerWidth - position.left : 0}px` }
                    : { left: `${position.left}px` }),
            }}
            {...props}
        >
            {children}
        </div>
    );
});
DropdownMenuContent.displayName = "DropdownMenuContent";

interface DropdownMenuItemProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> { }

const DropdownMenuItem = React.forwardRef<
    HTMLButtonElement,
    DropdownMenuItemProps
>(({ className, children, onClick, ...props }, ref) => {
    const context = React.useContext(DropdownMenuContext);

    return (
        <button
            ref={ref}
            className={cn(
                "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full text-left",
                className
            )}
            onClick={(e) => {
                // Call the onClick handler (e.g., setTheme) first
                if (onClick) {
                    onClick(e);
                }
                // Prevent the click from bubbling to document click handler AFTER onClick runs
                e.stopPropagation();
                // Close dropdown after a short delay to ensure setTheme completes
                setTimeout(() => {
                    context?.setOpen(false);
                }, 50);
            }}
            {...props}
        >
            {children}
        </button>
    );
});
DropdownMenuItem.displayName = "DropdownMenuItem";

export {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
};

