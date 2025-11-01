"use client";

import * as React from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ModeToggle() {
    const themeContext = useTheme();
    const [mounted, setMounted] = React.useState(false);

    // Avoid hydration mismatch
    React.useEffect(() => {
        setMounted(true);
    }, []);


    if (!mounted) {
        return (
            <Button variant="outline" size="icon" className="h-8 w-8">
                <Sun className="h-[1.2rem] w-[1.2rem]" />
                <span className="sr-only">Toggle theme</span>
            </Button>
        );
    }

    if (!themeContext) {
        console.error('ThemeContext not available after mount!');
        return (
            <Button variant="outline" size="icon" className="h-8 w-8">
                <Sun className="h-[1.2rem] w-[1.2rem]" />
                <span className="sr-only">Toggle theme</span>
            </Button>
        );
    }

    const { setTheme: originalSetTheme, theme } = themeContext;

    // Workaround: manually update localStorage and HTML class since next-themes isn't applying the class
    const handleSetTheme = React.useCallback((newTheme: string) => {
        // Call the original setTheme
        originalSetTheme(newTheme);

        // Manually update localStorage
        if (typeof window !== "undefined") {
            localStorage.setItem("theme", newTheme);

            // Manually update HTML class based on resolved theme
            const root = document.documentElement;
            root.classList.remove("light", "dark");

            if (newTheme === "system") {
                // Check system preference
                const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
                if (systemPrefersDark) {
                    root.classList.add("dark");
                } else {
                    root.classList.add("light");
                }
            } else if (newTheme === "dark") {
                root.classList.add("dark");
            } else {
                root.classList.add("light");
            }
        }
    }, [originalSetTheme]);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8 relative">
                    <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
                    <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
                    <span className="sr-only">Toggle theme</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[120px]">
                <DropdownMenuItem
                    onClick={(e) => {
                        e.preventDefault();
                        handleSetTheme("light");
                    }}
                    className={theme === "light" ? "bg-accent" : ""}
                >
                    <Sun className="mr-2 h-4 w-4" />
                    <span>Light</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={(e) => {
                        e.preventDefault();
                        handleSetTheme("dark");
                    }}
                    className={theme === "dark" ? "bg-accent" : ""}
                >
                    <Moon className="mr-2 h-4 w-4" />
                    <span>Dark</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={(e) => {
                        e.preventDefault();
                        handleSetTheme("system");
                    }}
                    className={theme === "system" ? "bg-accent" : ""}
                >
                    <Monitor className="mr-2 h-4 w-4" />
                    <span>System</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

