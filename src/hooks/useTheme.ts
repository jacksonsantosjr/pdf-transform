
import { useState, useEffect } from "react";

export function useTheme() {
    const [isDark, setIsDark] = useState(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("pdf-analyzer-theme");
            if (saved) {
                return saved === "dark";
            }
            // Inicia sempre no modo claro por padrão, ignorando a preferência do sistema inicial
            return false;
        }
        return false;
    });

    useEffect(() => {
        const root = window.document.documentElement;
        if (isDark) {
            root.classList.add("dark");
            localStorage.setItem("pdf-analyzer-theme", "dark");
        } else {
            root.classList.remove("dark");
            localStorage.setItem("pdf-analyzer-theme", "light");
        }
    }, [isDark]);

    const toggle = () => setIsDark((prev) => !prev);

    return { isDark, toggle };
}
