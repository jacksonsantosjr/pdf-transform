
/**
 * Utilitário para evitar que o navegador "suspenda" ou reduza a prioridade da aba
 * enquanto processos pesados (como OCR) estão rodando em segundo plano.
 * 
 * Ele utiliza a técnica de áudio silencioso em loop, sinalizando ao navegador 
 * que a tarefa é prioritária.
 */

class BackgroundKeepAlive {
    private audioCtx: AudioContext | null = null;
    private timer: any = null;
    private isActive: boolean = false;

    /**
     * Inicia o áudio rítmico silencioso
     */
    public start() {
        if (this.isActive) return;

        try {
            if (!this.audioCtx) {
                this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            }

            if (this.audioCtx.state === 'suspended') {
                this.audioCtx.resume();
            }

            this.isActive = true;

            // Cria um "pulso" rítmico. Navegadores costumam dar mais prioridade 
            // a sons dinâmicos/rítmicos do que a sons estáticos.
            this.timer = setInterval(() => {
                if (!this.audioCtx || this.audioCtx.state === 'closed') return;

                const osc = this.audioCtx.createOscillator();
                const gain = this.audioCtx.createGain();

                osc.frequency.setValueAtTime(1, this.audioCtx.currentTime); // Frequência infra-sônica
                gain.gain.setValueAtTime(0.00001, this.audioCtx.currentTime); // Praticamente silêncio
                gain.gain.exponentialRampToValueAtTime(0.000001, this.audioCtx.currentTime + 0.1);

                osc.connect(gain);
                gain.connect(this.audioCtx.destination);

                osc.start();
                osc.stop(this.audioCtx.currentTime + 0.1);

                // Heartbeat para debug em background (visível no console)
                console.debug('Background Keep-Alive Heartbeat: Ativo');
            }, 500);

            console.log('Background Keep-Alive V2: Ativado (Rítmico)');
        } catch (err) {
            console.warn('Erro ao iniciar Keep-Alive:', err);
        }
    }

    /**
     * Interrompe o áudio silencioso
     */
    public stop() {
        if (!this.isActive) return;

        try {
            if (this.timer) {
                clearInterval(this.timer);
                this.timer = null;
            }
            this.isActive = false;
            console.log('Background Keep-Alive: Desativado');
        } catch (err) {
            console.warn('Erro ao parar Keep-Alive:', err);
        }
    }
}

export const backgroundKeepAlive = new BackgroundKeepAlive();
