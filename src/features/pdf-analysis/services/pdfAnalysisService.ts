
import { extractFieldsFromPages } from "../../field-extraction/utils/fieldExtractor";
import { PageInfo, PDFAnalysis, PDFType, SuitabilityRating } from "../types/pdfAnalysis.types";

export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(2) + " MB";
}

export function formatPdfDate(dateStr: string): string {
    if (!dateStr || dateStr === "N/A") return "N/A";
    try {
        const cleaned = dateStr.replace(/^D:/, "");
        const year = cleaned.slice(0, 4);
        const month = cleaned.slice(4, 6);
        const day = cleaned.slice(6, 8);
        const hour = cleaned.slice(8, 10) || "00";
        const min = cleaned.slice(10, 12) || "00";

        if (
            year && month && day &&
            !isNaN(Number(year)) &&
            !isNaN(Number(month)) &&
            !isNaN(Number(day))
        ) {
            return `${day}/${month}/${year} ${hour}:${min}`;
        }
        return dateStr;
    } catch {
        return dateStr;
    }
}

import { pdfjs } from "../../../utils/pdfWorker";

export async function analyzePDF(
    file: File,
    onProgress: (progress: number, message: string) => void
): Promise<PDFAnalysis> {
    if (!pdfjs) {
        throw new Error(
            "Motor PDF.js não inicializado corretamente."
        );
    }

    onProgress(5, "Carregando arquivo...");
    const arrayBuffer = await file.arrayBuffer();

    onProgress(10, "Abrindo documento PDF...");
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) })
        .promise;

    onProgress(15, "Extraindo metadados...");
    const meta = await pdf.getMetadata().catch(() => ({ info: {} }));
    const info = (meta?.info || {}) as Record<string, string>;

    const metadata: Record<string, string> = {
        Título: info.Title || "N/A",
        Autor: info.Author || "N/A",
        Assunto: info.Subject || "N/A",
        Criador: info.Creator || "N/A",
        Produtor: info.Producer || "N/A",
        "Data de Criação": formatPdfDate(info.CreationDate || ""),
        "Última Modificação": formatPdfDate(info.ModDate || ""),
        "Palavras-chave": info.Keywords || "N/A",
    };

    const pages: PageInfo[] = [];
    let totalChars = 0;
    let totalWords = 0;
    let hasAnyText = false;
    let hasAnyImages = false;

    for (let i = 1; i <= pdf.numPages; i++) {
        const pct = 15 + (i / pdf.numPages) * 75;
        onProgress(pct, `Analisando página ${i} de ${pdf.numPages}...`);

        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const viewport = page.getViewport({ scale: 1 });

        const textItems = textContent.items
            .filter((item: any) => item.str)
            .map((item: any) => item.str);
        const text = textItems.join(" ").trim();
        const charCount = text.replace(/\s/g, "").length;
        const wordCount = text
            .split(/\s+/)
            .filter((w: string) => w.length > 0).length;

        let imageCount = 0;
        try {
            const opList = await page.getOperatorList();
            const OPS = (pdfjs as any).OPS;
            if (OPS) {
                for (const fn of opList.fnArray) {
                    if (
                        fn === OPS.paintImageXObject ||
                        fn === OPS.paintJpegXObject ||
                        fn === OPS.paintImageXObjectRepeat
                    ) {
                        imageCount++;
                    }
                }
            }
        } catch {
            /* ignore */
        }

        const pageHasText = charCount > 10;
        const pageHasImages = imageCount > 0;

        pages.push({
            pageNumber: i,
            width: Math.round(viewport.width * 0.3528),
            height: Math.round(viewport.height * 0.3528),
            characterCount: charCount,
            wordCount,
            hasText: pageHasText,
            hasImages: pageHasImages,
            imageCount,
            textPreview: text.slice(0, 300) + (text.length > 300 ? "..." : ""),
            fullText: text,
        });

        totalChars += charCount;
        totalWords += wordCount;
        if (pageHasText) hasAnyText = true;
        if (pageHasImages) hasAnyImages = true;
    }

    onProgress(92, "Classificando tipo de PDF...");

    const textPagesCount = pages.filter((p) => p.hasText).length;
    const scannedPagesCount = pages.filter(
        (p) => !p.hasText && p.hasImages
    ).length;

    let pdfType: PDFType;
    if (pages.length === 0 || (totalChars === 0 && !hasAnyImages)) {
        pdfType = "empty";
    } else if (scannedPagesCount === 0 && textPagesCount > 0) {
        pdfType = "native-text";
    } else if (textPagesCount === 0 && scannedPagesCount > 0) {
        pdfType = "scanned-image";
    } else if (textPagesCount > 0 && scannedPagesCount > 0) {
        pdfType = "mixed";
    } else {
        pdfType = "empty";
    }

    onProgress(93, "Extraindo campos inteligentes...");

    // Smart field extraction
    const pagesTextData = pages.map((p) => ({
        pageNumber: p.pageNumber,
        text: p.fullText,
    }));
    const extractedFields = extractFieldsFromPages(pagesTextData);

    onProgress(96, "Calculando adequação...");

    const reasons: string[] = [];
    const recommendations: string[] = [];
    let score: number;

    switch (pdfType) {
        case "native-text":
            score = 95;
            reasons.push("PDF contém texto nativo selecionável");
            reasons.push("Texto pode ser copiado e extraído diretamente");
            reasons.push(
                `${totalWords.toLocaleString("pt-BR")} palavras detectadas em ${textPagesCount} página(s)`
            );
            if (hasAnyImages) {
                reasons.push("Imagens incorporadas detectadas (não afetam a extração)");
            }
            break;
        case "scanned-image":
            score = 12;
            reasons.push("PDF contém apenas imagens (digitalizado/escaneado)");
            reasons.push("Texto NÃO é selecionável ou pesquisável");
            reasons.push("Extração direta de texto não é possível");
            recommendations.push(
                "Converter para PDF com texto nativo via reconhecimento óptico (OCR)"
            );
            recommendations.push(
                "O processo de OCR identificará e reconhecerá o texto nas imagens"
            );
            break;
        case "mixed":
            score = Math.round(20 + (textPagesCount / pages.length) * 60);
            reasons.push("PDF contém mistura de texto nativo e páginas digitalizadas");
            reasons.push(
                `${textPagesCount} de ${pages.length} páginas contêm texto extraível`
            );
            reasons.push(
                `${scannedPagesCount} página(s) são imagens sem texto selecionável`
            );
            recommendations.push(
                "Converter via OCR para tornar todas as páginas pesquisáveis"
            );
            break;
        case "empty":
            score = 0;
            reasons.push("Nenhum conteúdo detectável no PDF");
            reasons.push("Não foi encontrado texto nem imagens");
            recommendations.push(
                "Verifique se o arquivo PDF é válido e não está corrompido"
            );
            break;
    }

    const filledMeta = Object.values(metadata).filter(
        (v) => v && v !== "N/A"
    ).length;
    if (filledMeta >= 5) {
        score = Math.min(100, score + 3);
        reasons.push("Metadados do documento bem preenchidos");
    }

    let level: SuitabilityRating["level"];
    if (score >= 80) level = "excellent";
    else if (score >= 60) level = "good";
    else if (score >= 40) level = "fair";
    else level = "poor";

    onProgress(100, "Análise concluída!");

    return {
        fileName: file.name,
        fileSize: file.size,
        pageCount: pdf.numPages,
        metadata,
        pages,
        pdfType,
        suitability: { score, level, reasons, recommendations },
        totalCharacters: totalChars,
        totalWords: totalWords,
        hasText: hasAnyText,
        hasImages: hasAnyImages,
        pdfVersion: info.PDFFormatVersion || "N/A",
        extractedFields,
    };
}
