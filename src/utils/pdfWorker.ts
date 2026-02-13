import * as pdfjs from 'pdfjs-dist';

// Configura o worker para carregar via URL (compatível com Vite)
// O ?worker instrui o Vite a processar como Web Worker
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker?worker';

// Define a fonte do worker globalmente
// @ts-ignore - Propriedade GlobalWorkerOptions pode não estar tipada corretamente em algumas versões
if (typeof window !== 'undefined' && 'Worker' in window) {
    pdfjs.GlobalWorkerOptions.workerPort = new pdfjsWorker();
}

export { pdfjs };
