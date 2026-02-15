import * as pdfjs from 'pdfjs-dist';

// Importa a URL do worker diretamente do pacote pdfjs-dist
// @ts-ignore
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

if (typeof window !== 'undefined') {
    console.log('PDF.js Worker URL:', pdfjsWorker);
    pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;
}

export { pdfjs };


