
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createOCRWorker, Tesseract } from "../../../utils/ocrWorker";
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

    // Inicia o mecanismo extremo para evitar throttling em segundo plano (V5)
    await backgroundKeepAlive.start();

    try {
        onProgress(2, "Carregando arquivo PDF...");
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) })
            .promise;

        onProgress(5, "Inicializando motor OCR paralelo...");

        // Inicializa o Scheduler para processamento multicore (Paralelismo Real)
        const scheduler = Tesseract.createScheduler();
        const numWorkers = Math.min(navigator.hardwareConcurrency || 2, 3);

        try {
            for (let w = 0; w < numWorkers; w++) {
                const worker = await createOCRWorker();
                scheduler.addWorker(worker);
            }
        } catch (e: any) {
            throw new Error(`Falha ao iniciar OCR: ${e.message}`);
        }

        onProgress(8, "Preparando novo documento...");
        const newPdf = await PDFDocument.create();
        const font = await newPdf.embedFont(StandardFonts.Helvetica);

        // Processamento em Lotes (Batches) para máxima velocidade
        const batchSize = numWorkers;
        for (let i = 1; i <= pdf.numPages; i += batchSize) {
            if (abortSignal?.aborted) throw new Error("Conversão cancelada");

            const currentBatch = [];
            for (let j = 0; j < batchSize && (i + j) <= pdf.numPages; j++) {
                currentBatch.push(i + j);
            }

            onProgress(
                10 + (i / pdf.numPages) * 85,
                `OCR Paralelo: processando páginas ${currentBatch[0]}-${currentBatch[currentBatch.length - 1]} de ${pdf.numPages}...`
            );

            // 1. Renderização e OCR em Paralelo
            const batchResults = await Promise.all(currentBatch.map(async (pageNum) => {
                const page = await pdf.getPage(pageNum);
                // Escala 1.5x é o "sweet spot" para OCR rápido e preciso
                const viewport = page.getViewport({ scale: 1.5 });

                const canvas = document.createElement("canvas");
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
                if (!ctx) throw new Error("Canvas context falhou");

                await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;

                // Verificação rápida de texto nativo
                const tc = await page.getTextContent();
                const existingText = tc.items.map((it: any) => it.str).join(" ").trim();
                const hasNativeText = existingText.replace(/\s/g, "").length > 20;

                let text = "";
                if (hasNativeText) {
                    text = existingText;
                } else {
                    // Manda para o pool de workers
                    const res = await (scheduler as any).addJob('recognize', canvas);
                    text = res.data.text;
                }

                return { text, canvas, viewport, pageNum };
            }));

            // 2. Comita resultados no PDF (Sequencial para preservar ordem)
            for (const res of batchResults) {
                const { text, canvas, viewport } = res;
                const newPage = newPdf.addPage([viewport.width, viewport.height]);

                // Embed da imagem JPEG otimizada
                const imgBlob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.75));
                const imgBytes = await imgBlob.arrayBuffer();
                const jpgImage = await newPdf.embedJpg(new Uint8Array(imgBytes));

                newPage.drawImage(jpgImage, { x: 0, y: 0, width: viewport.width, height: viewport.height });

                if (text.trim()) {
                    const cleanText = text.replace(/[^\x20-\x7E\xA0-\xFF\n]/g, "").trim();
                    if (cleanText) {
                        newPage.drawText(cleanText, {
                            x: 10, y: viewport.height - 20, size: 8, font, color: rgb(0, 0, 0), opacity: 0.01
                        });
                    }
                }

                // Limpeza de memória imediata
                canvas.width = 0;
                canvas.height = 0;
            }
        }

        // Finaliza o Scheduler
        await scheduler.terminate();

        onProgress(97, "Finalizando documento PDF...");
        const pdfBytes = await newPdf.save();

        onProgress(100, "Conversão concluída com sucesso!");
        return new Blob([pdfBytes as BlobPart], { type: "application/pdf" });
    } finally {
        backgroundKeepAlive.stop();
    }
}
