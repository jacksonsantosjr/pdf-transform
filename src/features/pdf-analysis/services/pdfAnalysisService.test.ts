import { describe, it, expect, vi, beforeEach } from "vitest";
import { analyzePDF, formatFileSize, formatPdfDate } from "./pdfAnalysisService";

// Mock do módulo utils/pdfWorker antes das importações
vi.mock("../../../utils/pdfWorker", () => ({
    pdfjs: {
        getDocument: vi.fn(),
        GlobalWorkerOptions: {},
        OPS: {
            paintImageXObject: 1,
            paintJpegXObject: 2,
            paintImageXObjectRepeat: 3
        }
    }
}));

import { pdfjs } from "../../../utils/pdfWorker";

describe("pdfAnalysisService", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("formatFileSize", () => {
        it("deve formatar bytes corretamente", () => {
            expect(formatFileSize(500)).toBe("500 B");
            expect(formatFileSize(1024)).toBe("1.0 KB");
            expect(formatFileSize(1048576)).toBe("1.00 MB");
        });
    });

    describe("formatPdfDate", () => {
        it("deve formatar data do PDF corretamente", () => {
            expect(formatPdfDate("D:20230101120000")).toBe("01/01/2023 12:00");
            expect(formatPdfDate("Invalid")).toBe("Invalid");
        });

        it("deve formatar datas no padrão PDF corretamente", () => {
            // Formato D:YYYYMMDDHHmmSS...
            const pdfDate = "D:20231225143000";
            expect(formatPdfDate(pdfDate)).toBe("25/12/2023 14:30");
        });

        it("deve remover prefixo D: se presente", () => {
            const pdfDate = "202401011000";
            expect(formatPdfDate(pdfDate)).toBe("01/01/2024 10:00");
        });
    });

    describe("analyzePDF", () => {
        const mockFile = new File(["dummy content"], "test.pdf", { type: "application/pdf" });
        // Mock arrayBuffer pois JSDOM/Vitest pode não implementar
        Object.defineProperty(mockFile, 'arrayBuffer', {
            value: vi.fn().mockResolvedValue(new ArrayBuffer(10))
        });

        const mockOnProgress = vi.fn();

        it("deve analisar PDF com sucesso", async () => {
            const getDocumentMock = pdfjs.getDocument as any;
            getDocumentMock.mockImplementationOnce(() => ({
                promise: Promise.resolve({
                    numPages: 1,
                    getMetadata: () => Promise.resolve({ info: { Title: "Test PDF" } }),
                    getPage: () => Promise.resolve({
                        getTextContent: () => Promise.resolve({ items: [{ str: "Test content" }] }),
                        getViewport: () => ({ width: 100, height: 100 }),
                        getOperatorList: () => Promise.resolve({ fnArray: [] })
                    })
                })
            }));

            const result = await analyzePDF(mockFile, mockOnProgress);
            expect(result).toBeDefined();
            expect(result.metadata["Título"]).toBe("Test PDF");
            expect(mockOnProgress).toHaveBeenCalled();
        });

        it("deve relatar erro se getDocument falhar", async () => {
            const getDocumentMock = pdfjs.getDocument as any;
            getDocumentMock.mockImplementationOnce(() => ({
                promise: Promise.reject(new Error("Falha ao abrir PDF"))
            }));

            await expect(analyzePDF(mockFile, mockOnProgress)).rejects.toThrow("Falha ao abrir PDF");
        });
    });
});

