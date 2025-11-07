"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface SidebarContextValue {
    open: boolean
    setOpen: (open: boolean) => void
    toggle: () => void
}

const SidebarContext = React.createContext<SidebarContextValue | undefined>(undefined)

function useSidebar() {
    const context = React.useContext(SidebarContext)
    if (!context) {
        throw new Error("useSidebar must be used within a SidebarProvider")
    }
    return context
}

interface SidebarProviderProps {
    children: React.ReactNode
    defaultOpen?: boolean
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

const SidebarProvider = ({
    children,
    defaultOpen = true,
    open: openProp,
    onOpenChange,
}: SidebarProviderProps) => {
    const [openState, setOpenState] = React.useState(defaultOpen)
    const open = openProp ?? openState
    const setOpen = React.useCallback(
        (value: boolean | ((value: boolean) => boolean)) => {
            const newValue = typeof value === "function" ? value(open) : value
            if (onOpenChange) {
                onOpenChange(newValue)
            } else {
                setOpenState(newValue)
            }
        },
        [open, onOpenChange]
    )

    const toggle = React.useCallback(() => {
        setOpen((prev) => !prev)
    }, [setOpen])

    return (
        <SidebarContext.Provider value={{ open, setOpen, toggle }}>
            {children}
        </SidebarContext.Provider>
    )
}

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
    side?: "left" | "right"
    collapsible?: "offcanvas" | "icon"
}

const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(
    ({ side = "left", collapsible = "offcanvas", className, children, ...props }, ref) => {
        const { open } = useSidebar()

        return (
            <div
                ref={ref}
                data-state={open ? "expanded" : "collapsed"}
                className={cn(
                    "flex flex-col transition-all duration-300 ease-in-out",
                    side === "left" ? "border-r" : "border-l",
                    collapsible === "offcanvas" && !open && "w-0 min-w-0 overflow-hidden",
                    collapsible === "offcanvas" && open && "w-64",
                    collapsible === "icon" && !open && "w-16",
                    collapsible === "icon" && open && "w-64",
                    className
                )}
                {...props}
            >
                {children}
            </div>
        )
    }
)
Sidebar.displayName = "Sidebar"

interface SidebarContentProps extends React.HTMLAttributes<HTMLDivElement> { }

const SidebarContent = React.forwardRef<HTMLDivElement, SidebarContentProps>(
    ({ className, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn("flex flex-col flex-1 overflow-hidden", className)}
                {...props}
            />
        )
    }
)
SidebarContent.displayName = "SidebarContent"

interface SidebarHeaderProps extends React.HTMLAttributes<HTMLDivElement> { }

const SidebarHeader = React.forwardRef<HTMLDivElement, SidebarHeaderProps>(
    ({ className, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn("flex items-center gap-2 px-4 py-4 bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-300 dark:border-zinc-700 min-h-[65px]", className)}
                {...props}
            />
        )
    }
)
SidebarHeader.displayName = "SidebarHeader"

interface SidebarTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> { }

const SidebarTrigger = React.forwardRef<HTMLButtonElement, SidebarTriggerProps>(
    ({ className, ...props }, ref) => {
        const { toggle, open } = useSidebar()
        return (
            <button
                ref={ref}
                onClick={toggle}
                className={cn(
                    "relative inline-flex items-center justify-center rounded-md p-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
                    className
                )}
                {...props}
            >
                {/* Close icon (X) */}
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={cn(
                        "absolute transition-all duration-300 ease-in-out",
                        open ? "opacity-100 rotate-0 scale-100" : "opacity-0 rotate-90 scale-0"
                    )}
                >
                    <path d="M18 6L6 18" />
                    <path d="M6 6l12 12" />
                </svg>
                {/* Hamburger icon */}
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={cn(
                        "absolute transition-all duration-300 ease-in-out",
                        open ? "opacity-0 -rotate-90 scale-0" : "opacity-100 rotate-0 scale-100"
                    )}
                >
                    <path d="M3 12h18" />
                    <path d="M3 6h18" />
                    <path d="M3 18h18" />
                </svg>
            </button>
        )
    }
)
SidebarTrigger.displayName = "SidebarTrigger"

export {
    Sidebar,
    SidebarContent,
    SidebarHeader,
    SidebarProvider,
    SidebarTrigger,
    useSidebar,
}

