
/**
 * Utilitário de Keep-Alive de nível industrial.
 * Utiliza um Web Worker para gerar pulsos de processamento que NÃO são limitados
 * pelo navegador quando a aba perde o foco.
 */

class BackgroundKeepAlive {
    private audioCtx: AudioContext | null = null;
    private timerWorker: Worker | null = null;
    private isActive: boolean = false;

    /**
     * Inicia o mecanismo de persistência
     */
    public start() {
        if (this.isActive) return;

        try {
            // 1. Inicia o AudioContext (ajuda na prioridade do processo)
            if (!this.audioCtx) {
                this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
            if (this.audioCtx.state === 'suspended') {
                this.audioCtx.resume();
            }

            // 2. Cria um Worker via Blob para não precisar de arquivo externo
            // Workers NÃO sofrem o mesmo throttling de timers que a main thread
            const workerCode = `
                let timer = null;
                self.onmessage = function(e) {
                    if (e.data === 'start') {
                        timer = setInterval(() => {
                            self.postMessage('pulse');
                        }, 200); // Pulso a cada 200ms
                    } else if (e.data === 'stop') {
                        if (timer) clearInterval(timer);
                    }
                };
            `;
            const blob = new Blob([workerCode], { type: 'application/javascript' });
            this.timerWorker = new Worker(URL.createObjectURL(blob));

            // Quando o worker envia um pulso, a main thread é "acordada" para 
            // processar o evento de mensagem.
            this.timerWorker.onmessage = () => {
                // Tenta manter o AudioContext ativo
                if (this.audioCtx && this.audioCtx.state === 'suspended') {
                    this.audioCtx.resume();
                }
                // Log de debug discreto
                if (Math.random() > 0.95) {
                    console.debug('Background persistence pulse received from worker');
                }
            };

            this.timerWorker.postMessage('start');
            this.isActive = true;
            console.log('Background Keep-Alive V3: Ativado (High-Priority Worker)');
        } catch (err) {
            console.warn('Erro ao iniciar Keep-Alive V3:', err);
        }
    }

    /**
     * Interrompe o mecanismo
     */
    public stop() {
        if (!this.isActive) return;

        try {
            if (this.timerWorker) {
                this.timerWorker.postMessage('stop');
                this.timerWorker.terminate();
                this.timerWorker = null;
            }
            this.isActive = false;
            console.log('Background Keep-Alive: Desativado');
        } catch (err) {
            console.warn('Erro ao parar Keep-Alive:', err);
        }
    }
}

export const backgroundKeepAlive = new BackgroundKeepAlive();
