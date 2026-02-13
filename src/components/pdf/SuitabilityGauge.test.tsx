import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SuitabilityGauge } from "./SuitabilityGauge";

describe("SuitabilityGauge", () => {
    it("deve renderizar o score corretamente", () => {
        render(<SuitabilityGauge score={85} level="excellent" isDark={false} />);
        expect(screen.getByText("85")).toBeInTheDocument();
        expect(screen.getByText("Excelente")).toBeInTheDocument();
    });

    it("deve renderizar labels corretos para cada nível", () => {
        const { rerender } = render(<SuitabilityGauge score={70} level="good" isDark={false} />);
        expect(screen.getByText("Bom")).toBeInTheDocument();

        rerender(<SuitabilityGauge score={50} level="fair" isDark={false} />);
        expect(screen.getByText("Regular")).toBeInTheDocument();

        rerender(<SuitabilityGauge score={20} level="poor" isDark={false} />);
        expect(screen.getByText("Inadequado")).toBeInTheDocument();
    });

    it("deve aplicar estilos de dark mode quando isDark é true", () => {
        const { container } = render(<SuitabilityGauge score={85} level="excellent" isDark={true} />);
        const scoreElement = screen.getByText("85");

        // Verifica classe de texto branco no score
        expect(scoreElement).toHaveClass("text-white");

        // Verifica classe de stroke mais escuro no círculo de fundo
        const bgCircle = container.querySelector("circle.stroke-gray-700\\/50");
        expect(bgCircle).toBeInTheDocument();
    });

    it("deve aplicar estilos de light mode quando isDark é false", () => {
        const { container } = render(<SuitabilityGauge score={85} level="excellent" isDark={false} />);
        const scoreElement = screen.getByText("85");

        expect(scoreElement).toHaveClass("text-gray-900");

        const bgCircle = container.querySelector("circle.stroke-gray-200");
        expect(bgCircle).toBeInTheDocument();
    });
});
