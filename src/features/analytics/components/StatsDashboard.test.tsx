import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StatsDashboard } from "./StatsDashboard";
import { PageInfo } from "../../pdf-analysis/types/pdfAnalysis.types";

const mockPages: PageInfo[] = [
    {
        pageNumber: 1,
        wordCount: 100,
        characterCount: 600,
        hasText: true,
        hasImages: false,
        imageCount: 0,
        width: 500,
        height: 800,
        textPreview: "Texto da página 1",
        fullText: "Texto da página 1 completo"
    },
    {
        pageNumber: 2,
        wordCount: 0,
        characterCount: 0,
        hasText: false,
        hasImages: true,
        imageCount: 2,
        width: 500,
        height: 800,
        textPreview: "",
        fullText: ""
    }
];

const mockSummary = {
    cpf: 1,
    cnpj: 0,
    email: 2,
    telefone: 0,
    data: 1,
    valor_monetario: 5,
    url: 0
};

describe("StatsDashboard", () => {
    it("deve renderizar métricas principais corretamente após expandir", () => {
        render(
            <StatsDashboard
                pages={mockPages}
                totalCharacters={600}
                totalWords={100}
                fileSize={1024 * 1024 * 2} // 2MB
                pageCount={2}
                hasText={true}
                hasImages={true}
                pdfType="mixed"
                extractionSummary={mockSummary}
                isDark={false}
                glassCard="bg-white"
                txt="text-gray-900"
                txt2="text-gray-700"
                txt3="text-gray-500"
            />
        );

        // Clica no header para expandir
        fireEvent.click(screen.getByText(/Dashboard de Estatísticas/i));

        // Palavras - Busca onde "100" está presente próximo a "Total Palavras"
        const wordsLabels = screen.getAllByText("Total Palavras");
        const wordsStat = wordsLabels.find(label => label.parentElement?.parentElement?.textContent?.includes("100"));
        expect(wordsStat).toBeDefined();

        // Imagens - Busca onde "2" está presente próximo a "Imagens"
        const imagesLabels = screen.getAllByText("Imagens");
        const imagesStat = imagesLabels.find(label => label.parentElement?.parentElement?.textContent?.includes("2"));
        expect(imagesStat).toBeDefined();

        // Caracteres - Busca onde "600" está presente próximo a "Caracteres"
        const charsLabels = screen.getAllByText("Caracteres");
        const charsStat = charsLabels.find(label => label.parentElement?.parentElement?.textContent?.includes("600"));
        expect(charsStat).toBeDefined();
    });

    it("deve renderizar a distribuição de campos extraídos após expandir", () => {
        render(
            <StatsDashboard
                pages={mockPages}
                totalCharacters={600}
                totalWords={100}
                fileSize={1024 * 1024}
                pageCount={2}
                hasText={true}
                hasImages={true}
                pdfType="mixed"
                extractionSummary={mockSummary}
                isDark={false}
                glassCard="bg-white"
                txt="text-gray-900"
                txt2="text-gray-700"
                txt3="text-gray-500"
            />
        );

        fireEvent.click(screen.getByText(/Dashboard de Estatísticas/i));

        // Verifica se a barra de campos (FieldsBarChart) renderiza os labels
        expect(screen.getByText("CPF")).toBeInTheDocument();
        expect(screen.getByText("E-mail")).toBeInTheDocument();
        expect(screen.getByText("Valor")).toBeInTheDocument();
        // CNPJ é 0, não deve aparecer (conforme filtro no componente)
        expect(screen.queryByText("CNPJ")).not.toBeInTheDocument();
    });

    it("deve renderizar mensagem de 'Sem dados' para campos vazios após expandir", () => {
        const emptySummary = {
            cpf: 0, cnpj: 0, email: 0, telefone: 0, data: 0, valor_monetario: 0, url: 0
        };

        render(
            <StatsDashboard
                pages={mockPages}
                totalCharacters={600}
                totalWords={100}
                fileSize={1024}
                pageCount={2}
                hasText={true}
                hasImages={true}
                pdfType="mixed"
                extractionSummary={emptySummary}
                isDark={false}
                glassCard="bg-white"
                txt="text-gray-900"
                txt2="text-gray-700"
                txt3="text-gray-500"
            />
        );

        fireEvent.click(screen.getByText(/Dashboard de Estatísticas/i));

        expect(screen.getByText("Nenhum campo estruturado detectado")).toBeInTheDocument();
    });
});
