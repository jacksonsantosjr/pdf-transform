import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTheme } from "./useTheme";

// Helper para mockar matchMedia globalmente
const mockMatchMedia = (matches: boolean) => {
    Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: vi.fn().mockImplementation((query) => ({
            matches,
            media: query,
            onchange: null,
            addListener: vi.fn(), // depreciado
            removeListener: vi.fn(), // depreciado
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })),
    });
};

describe("useTheme", () => {
    beforeEach(() => {
        localStorage.clear();
        document.documentElement.className = "";
        mockMatchMedia(false); // Default light
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("deve inicializar como light por padrão (sem preferência salva ou de sistema)", () => {
        const { result } = renderHook(() => useTheme());
        expect(result.current.isDark).toBe(false);
        expect(document.documentElement.classList.contains("dark")).toBe(false);
        expect(localStorage.getItem("pdf-analyzer-theme")).toBe("light");
    });

    it("deve inicializar como dark se preferência do sistema for dark", () => {
        mockMatchMedia(true);
        const { result } = renderHook(() => useTheme());
        expect(result.current.isDark).toBe(true);
        expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    it("deve respeitar localStorage ignorando preferência do sistema", () => {
        // Sistema diz Dark, mas LocalStorage diz Light
        mockMatchMedia(true);
        localStorage.setItem("pdf-analyzer-theme", "light");

        const { result } = renderHook(() => useTheme());
        expect(result.current.isDark).toBe(false);
        expect(document.documentElement.classList.contains("dark")).toBe(false);
    });

    it("deve alternar o tema corretamente via toggle", () => {
        const { result } = renderHook(() => useTheme());

        let isDark = result.current.isDark;
        expect(isDark).toBe(false);

        // Toggle para dark
        act(() => {
            result.current.toggle();
        });

        isDark = result.current.isDark;
        expect(isDark).toBe(true);
        expect(document.documentElement.classList.contains("dark")).toBe(true);
        expect(localStorage.getItem("pdf-analyzer-theme")).toBe("dark");

        // Toggle de volta para light
        act(() => {
            result.current.toggle();
        });

        isDark = result.current.isDark;
        expect(isDark).toBe(false);
        expect(document.documentElement.classList.contains("dark")).toBe(false);
        expect(localStorage.getItem("pdf-analyzer-theme")).toBe("light");
    });
});
