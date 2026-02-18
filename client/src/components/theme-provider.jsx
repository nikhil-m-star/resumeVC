import { createContext, useContext, useEffect, useState } from "react"

const initialState = {
    theme: "system",
    resolvedTheme: "dark",
    setTheme: () => null,
}

const ThemeProviderContext = createContext(initialState)

export function ThemeProvider({
    children,
    defaultTheme = "system",
    storageKey = "vite-ui-theme",
    ...props
}) {
    const [theme, setTheme] = useState(
        () => localStorage.getItem(storageKey) || defaultTheme
    )
    const [resolvedTheme, setResolvedTheme] = useState("dark")

    useEffect(() => {
        const root = window.document.documentElement
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
        const applyTheme = () => {
            root.classList.remove("light", "dark")

            if (theme === "system") {
                const systemTheme = mediaQuery.matches ? "dark" : "light"
                root.classList.add(systemTheme)
                setResolvedTheme(systemTheme)
                return
            }

            root.classList.add(theme)
            setResolvedTheme(theme)
        }

        applyTheme()
        if (theme !== "system") {
            return
        }

        mediaQuery.addEventListener("change", applyTheme)
        return () => mediaQuery.removeEventListener("change", applyTheme)
    }, [theme])

    const value = {
        theme,
        resolvedTheme,
        setTheme: (theme) => {
            localStorage.setItem(storageKey, theme)
            setTheme(theme)
        },
    }

    return (
        <ThemeProviderContext.Provider {...props} value={value}>
            {children}
        </ThemeProviderContext.Provider>
    )
}

export const useTheme = () => {
    const context = useContext(ThemeProviderContext)

    if (context === undefined)
        throw new Error("useTheme must be used within a ThemeProvider")

    return context
}
