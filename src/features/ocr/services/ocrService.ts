
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

function getPdfjsLib(): any {
    return (window as any).pdfjsLib;
}

function getTesseract(): any {
    return (window as any).Tesseract;
}

export async function convertToNativeTextPDF(
    file: File,
    onProgress: (progress: number, message: string) => void
): Promise<Blob> {
    const pdfjs = getPdfjsLib();
    const tesseract = getTesseract();

    if (!pdfjs) {
        throw new Error("PDF.js não disponível. Verifique sua conexão.");
    }
    if (!tesseract) {
        throw new Error(
            "Tesseract.js (OCR) não disponível. Verifique sua conexão com a internet e recarregue a página."
        );
    }

    onProgress(2, "Carregando arquivo PDF...");
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) })
        .promise;

    onProgress(5, "Preparando novo documento...");
    const newPdf = await PDFDocument.create();
    const font = await newPdf.embedFont(StandardFonts.Helvetica);

    for (let i = 1; i <= pdf.numPages; i++) {
        const base = 5 + ((i - 1) / pdf.numPages) * 90;

        onProgress(base, `Renderizando página ${i} de ${pdf.numPages}...`);

        const page = await pdf.getPage(i);
        const origViewport = page.getViewport({ scale: 1 });
        const renderViewport = page.getViewport({ scale: 2.5 });

        // Check if page already has text
        const textContent = await page.getTextContent();
        const existingText = textContent.items
            .map((item: any) => item.str)
            .join(" ")
            .trim();
        const pageHasText = existingText.replace(/\s/g, "").length > 20;

        // Render to canvas
        const canvas = document.createElement("canvas");
        canvas.width = renderViewport.width;
        canvas.height = renderViewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas não disponível");

        await page.render({ canvasContext: ctx, viewport: renderViewport }).promise;

        let finalText: string;

        if (pageHasText) {
            onProgress(
                base + 8,
                `Página ${i}: texto nativo detectado, pulando OCR...`
            );
            finalText = existingText;
        } else {
            onProgress(base + 3, `OCR página ${i} de ${pdf.numPages}...`);
            const result = await tesseract.recognize(canvas, "por+eng", {
                logger: (m: any) => {
                    if (m.status === "recognizing text") {
                        const p = base + 3 + (m.progress * 85) / pdf.numPages;
                        onProgress(
                            Math.min(p, 95),
                            `OCR página ${i}: ${Math.round(m.progress * 100)}%`
                        );
                    } else if (m.status === "loading language traineddata") {
                        onProgress(base + 1, "Carregando modelo de idioma OCR...");
                    }
                },
            });
            finalText = result.data.text;
        }

        // Create new page
        const pageW = origViewport.width;
        const pageH = origViewport.height;
        const newPage = newPdf.addPage([pageW, pageH]);

        // Embed page image as JPEG
        const jpegDataUrl = canvas.toDataURL("image/jpeg", 0.88);
        const imgResp = await fetch(jpegDataUrl);
        const imgBytes = await imgResp.arrayBuffer();
        const jpgImage = await newPdf.embedJpg(new Uint8Array(imgBytes));

        newPage.drawImage(jpgImage, {
            x: 0,
            y: 0,
            width: pageW,
            height: pageH,
        });

        // Add invisible text layer
        if (finalText.trim()) {
            const fontSize = 8;
            const lines = finalText.split("\n").filter((l: string) => l.trim());
            let y = pageH - 15;

            for (const line of lines) {
                if (y < 10) break;
                try {
                    const cleanLine = line.replace(/[^\x20-\x7E\xA0-\xFF]/g, "").trim();
                    if (cleanLine) {
                        newPage.drawText(cleanLine, {
                            x: 10,
                            y,
                            size: fontSize,
                            font,
                            color: rgb(0, 0, 0),
                            opacity: 0.01,
                        });
                    }
                } catch {
                    /* skip */
                }
                y -= fontSize * 1.3;
            }
        }

        // Clean up
        canvas.width = 0;
        canvas.height = 0;
    }

    onProgress(97, "Finalizando documento PDF...");
    const pdfBytes = await newPdf.save();

    onProgress(100, "Conversão concluída com sucesso!");
    return new Blob([pdfBytes as BlobPart], { type: "application/pdf" });
}
