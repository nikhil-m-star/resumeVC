import { Moon, Sun } from "lucide-react"
import { useTheme } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

export function ModeToggle({ className }) {
    const { setTheme, theme } = useTheme()
    const isDark = theme !== "light"

    return (
        <button
            type="button"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className={cn("theme-toggle", className)}
            aria-label="Toggle theme"
        >
            {isDark ? <Sun className="icon-sm" /> : <Moon className="icon-sm" />}
            <span className="sr-only">Toggle theme</span>
        </button>
    )
}
