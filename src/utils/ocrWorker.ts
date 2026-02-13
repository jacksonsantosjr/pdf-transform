import Tesseract from 'tesseract.js';

// Configuração para uso offline/local do Tesseract
// Precisamos garantir que os arquivos do worker e do core sejam carregados localmente
// Em um ambiente Vite, a melhor forma é importar o worker como URL

// Importa o worker como URL
import workerUrl from 'tesseract.js/dist/worker.min.js?url';
import coreUrl from 'tesseract.js-core/tesseract-core.wasm.js?url';

export const createOCRWorker = async (logger?: (m: any) => void) => {
    const worker = await Tesseract.createWorker("por+eng", 1, {
        workerPath: workerUrl,
        corePath: coreUrl,
        logger: logger,
        // O Tesseract precisa baixar o arquivo de linguagem (.traineddata)
        // Para funcionar 100% offline, precisaríamos baixar esses arquivos e servi-los localmente na pasta public
        // Por enquanto, vamos manter o download sob demanda, mas usando o worker local.
        // Se o usuário quiser 100% offline, teríamos que configurar langPath.
    });
    return worker;
};

export { Tesseract };
