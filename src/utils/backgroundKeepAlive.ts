
/**
 * Utilitário de Keep-Alive V5 (Modo Sobrevivência)
 * Utiliza múltiplas técnicas redundantes para garantir que o navegador 
 * trate a aba como um reprodutor de mídia de alta prioridade.
 */

class BackgroundKeepAlive {
    private audioCtx: AudioContext | null = null;
    private oscillator: OscillatorNode | null = null;
    private wakeLock: any = null;
    private isActive: boolean = false;
    private keepAliveInterval: any = null;

    /**
     * Inicia o modo de sobrevivência em background
     */
    public async start() {
        if (this.isActive) return;
        this.isActive = true;

        console.log('Background Keep-Alive V5: Iniciando modo de alta prioridade...');

        try {
            // 1. Web Audio API - Loop de Áudio "Invisível"
            const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) {
                this.audioCtx = new AudioContextClass();
                if (this.audioCtx) {
                    this.oscillator = this.audioCtx.createOscillator();
                    const gain = this.audioCtx.createGain();

                    // Frequência inaudível (15Hz), volume imperceptível (quase zero)
                    this.oscillator.frequency.setValueAtTime(15, this.audioCtx.currentTime);
                    gain.gain.setValueAtTime(0.0001, this.audioCtx.currentTime);

                    this.oscillator.connect(gain);
                    gain.connect(this.audioCtx.destination);
                    this.oscillator.start();

                    if (this.audioCtx.state === 'suspended') {
                        await this.audioCtx.resume();
                    }
                }
            }

            // 2. Screen Wake Lock (Evita suspensão do sistema operacional)
            if ('wakeLock' in navigator) {
                try {
                    this.wakeLock = await (navigator as any).wakeLock.request('screen');
                    if (this.wakeLock) {
                        this.wakeLock.addEventListener('release', () => {
                            if (this.isActive) this.reacquireWakeLock();
                        });
                    }
                } catch (err) {
                    console.warn('WakeLock negado:', err);
                }
            }

            // 3. Heartbeat de Timers (Força a Main Thread a acordar)
            this.keepAliveInterval = setInterval(() => {
                if (!this.isActive) return;
                window.postMessage('bg-heartbeat', '*');
                if (this.audioCtx && this.audioCtx.state === 'suspended') {
                    this.audioCtx.resume();
                }
            }, 100);

        } catch (err) {
            console.error('Falha ao iniciar Keep-Alive V5:', err);
        }
    }

    private async reacquireWakeLock() {
        if (this.isActive && 'wakeLock' in navigator) {
            try {
                this.wakeLock = await (navigator as any).wakeLock.request('screen');
            } catch (err) {
                /* silenciar */
            }
        }
    }

    /**
     * Interrompe o mecanismo e libera recursos
     */
    public stop() {
        if (!this.isActive) return;
        this.isActive = false;

        try {
            if (this.keepAliveInterval) {
                clearInterval(this.keepAliveInterval);
                this.keepAliveInterval = null;
            }
            if (this.oscillator) {
                try { this.oscillator.stop(); } catch (e) { }
                this.oscillator.disconnect();
                this.oscillator = null;
            }
            if (this.audioCtx) {
                this.audioCtx.close();
                this.audioCtx = null;
            }
            if (this.wakeLock) {
                try { this.wakeLock.release(); } catch (e) { }
                this.wakeLock = null;
            }
            console.log('Background Keep-Alive: Desativado');
        } catch (err) {
            console.warn('Erro ao parar Keep-Alive:', err);
        }
    }
}

export const backgroundKeepAlive = new BackgroundKeepAlive();
