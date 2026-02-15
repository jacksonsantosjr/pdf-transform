import * as pdfjs from 'pdfjs-dist';

// Importa a URL do worker diretamente do pacote pdfjs-dist para garantir compatibilidade com o Vite
// @ts-ignore - Importação de recurso estático do Vite
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

if (typeof window !== 'undefined') {
    pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;
}

export { pdfjs };

