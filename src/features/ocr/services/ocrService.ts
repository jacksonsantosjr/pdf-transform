
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createOCRWorker } from "../../../utils/ocrWorker";
import { pdfjs } from "../../../utils/pdfWorker";
import { backgroundKeepAlive } from "../../../utils/backgroundKeepAlive";

export async function convertToNativeTextPDF(
    file: File,
    onProgress: (progress: number, message: string) => void,
    abortSignal?: AbortSignal
): Promise<Blob> {

    if (!pdfjs) {
        throw new Error("PDF.js não disponível.");
    }

    // Inicia o mecanismo para evitar throttling em segundo plano
    backgroundKeepAlive.start();

    try {
        onProgress(2, "Carregando arquivo PDF...");
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) })
            .promise;

        onProgress(5, "Inicializando motor OCR...");
        // Inicializa o worker do Tesseract
        let worker;
        try {
            worker = await createOCRWorker((_m: any) => {
                // Logger interno do worker
            });
        } catch (e: any) {
            throw new Error(`Falha ao iniciar OCR: ${e.message}. Verifique se os arquivos do worker estão acessíveis.`);
        }

        onProgress(8, "Preparando novo documento...");
        const newPdf = await PDFDocument.create();
        const font = await newPdf.embedFont(StandardFonts.Helvetica);

        for (let i = 1; i <= pdf.numPages; i++) {
            // Verifica se o processamento foi cancelado
            if (abortSignal?.aborted) {
                throw new Error("Conversão cancelada");
            }

            const base = 10 + ((i - 1) / pdf.numPages) * 85;

            onProgress(base, `Renderizando página ${i} de ${pdf.numPages}...`);

            const page = await pdf.getPage(i);
            const origViewport = page.getViewport({ scale: 1 });
            const renderViewport = page.getViewport({ scale: 2.0 }); // Escala otimizada para velocidade/qualidade

            // Check if page already has text
            const textContent = await page.getTextContent();
            const existingText = textContent.items
                .map((item: any) => item.str)
                .join(" ")
                .trim();
            const pageHasText = existingText.replace(/\s/g, "").length > 20;

            // Render to canvas with high performance settings
            const canvas = document.createElement("canvas");
            canvas.width = renderViewport.width;
            canvas.height = renderViewport.height;
            const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
            if (!ctx) throw new Error("Canvas não disponível");

            await page.render({ canvasContext: ctx, viewport: renderViewport, canvas } as any).promise;

            let finalText: string;

            if (pageHasText) {
                onProgress(
                    base + 5,
                    `Página ${i}: texto nativo detectado, pulando OCR...`
                );
                finalText = existingText;
            } else {
                onProgress(base + 2, `OCR página ${i} de ${pdf.numPages}...`);

                // Reconhece o texto usando o worker criado (processamento pesado paralelo)
                const result = await worker.recognize(canvas);
                finalText = result.data.text;
            }

            // Create new page
            const pageW = origViewport.width;
            const pageH = origViewport.height;
            const newPage = newPdf.addPage([pageW, pageH]);

            // Embed page image as JPEG using direct blob instead of dataURL (faster and less memory)
            const imgBlob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.85));
            const imgBytes = await imgBlob.arrayBuffer();
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

            // Clean up immediately
            canvas.width = 0;
            canvas.height = 0;
            (canvas as any) = null;
        }

        // Termina o worker após o uso para liberar memória
        if (worker) {
            await worker.terminate();
        }

        onProgress(97, "Finalizando documento PDF...");
        const pdfBytes = await newPdf.save();

        onProgress(100, "Conversão concluída com sucesso!");
        return new Blob([pdfBytes as BlobPart], { type: "application/pdf" });
    } finally {
        // Garante que o Keep-Alive seja interrompido ao final do processo
        backgroundKeepAlive.stop();
    }
}
