
/**
 * Utilitário de Keep-Alive V4 (Definitivo)
 * Utiliza o ScriptProcessorNode para forçar a comunicação constante entre 
 * a thread de áudio e a thread principal, impedindo o throttling agressivo
 * de CPU do Chrome em abas em segundo plano.
 */

class BackgroundKeepAlive {
    private audioCtx: AudioContext | null = null;
    private processor: ScriptProcessorNode | null = null;
    private source: OscillatorNode | null = null;
    private isActive: boolean = false;

    /**
     * Inicia o mecanismo de persistência via Processamento de Áudio
     */
    public start() {
        if (this.isActive) return;

        try {
            const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
            if (!AudioContextClass) {
                console.warn('Web Audio API não suportada');
                return;
            }

            this.audioCtx = new AudioContextClass();

            // Usamos um buffer pequeno para forçar callbacks frequentes na main thread
            // O ScriptProcessorNode (embora deprecated) é extremamente eficaz para manter a main thread viva
            this.processor = this.audioCtx.createScriptProcessor(4096, 1, 1);

            // O callback de processamento é executado na main thread.
            // Se o navegador tentar suspender a thread principal, o áudio vai "pipocar" ou parar,
            // mas como é áudio em tempo real, o navegador tende a manter a prioridade alta.
            this.processor.onaudioprocess = () => {
                // Heartbeat para manter a Main Thread ocupada e ativa
                if (Math.random() > 0.99) {
                    // Log silencioso apenas para monitoramento interno
                    // console.debug('Audio heartbeat keeping main thread awake');
                }
            };

            this.source = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();

            // Volume zero (silêncio absoluto) mas com fluxo de dados ativo
            gain.gain.setValueAtTime(0, this.audioCtx.currentTime);

            this.source.connect(this.processor);
            this.processor.connect(gain);
            gain.connect(this.audioCtx.destination);

            this.source.start();
            this.isActive = true;

            // Tenta também o Wake Lock API (Bloqueio de suspensão de tela/processo)
            if ('wakeLock' in navigator) {
                (navigator as any).wakeLock.request('screen').catch(() => {
                    // Silencioso: o wakeLock pode falhar se o usuário não interagiu
                });
            }

            console.log('Background Keep-Alive V4: Ativado (Real-time Audio Persistence)');
        } catch (err) {
            console.warn('Erro ao iniciar Keep-Alive V4:', err);
        }
    }

    /**
     * Interrompe o mecanismo
     */
    public stop() {
        if (!this.isActive) return;

        try {
            if (this.source) {
                this.source.stop();
                this.source.disconnect();
                this.source = null;
            }
            if (this.processor) {
                this.processor.disconnect();
                this.processor = null;
            }
            if (this.audioCtx) {
                this.audioCtx.close();
                this.audioCtx = null;
            }
            this.isActive = false;
            console.log('Background Keep-Alive: Desativado');
        } catch (err) {
            console.warn('Erro ao parar Keep-Alive:', err);
        }
    }
}

export const backgroundKeepAlive = new BackgroundKeepAlive();
