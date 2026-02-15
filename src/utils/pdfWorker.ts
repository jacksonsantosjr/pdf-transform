import * as pdfjs from 'pdfjs-dist';

// @ts-ignore - Propriedade GlobalWorkerOptions pode não estar tipada corretamente em algumas versões
if (typeof window !== 'undefined' && 'Worker' in window) {
    // Configura o worker para carregar do arquivo estático na pasta public
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

export { pdfjs };
