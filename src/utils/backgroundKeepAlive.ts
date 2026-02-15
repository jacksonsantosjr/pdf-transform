
/**
 * Utilitário para evitar que o navegador "suspenda" ou reduza a prioridade da aba
 * enquanto processos pesados (como OCR) estão rodando em segundo plano.
 * 
 * Ele utiliza a técnica de áudio silencioso em loop, sinalizando ao navegador 
 * que a tarefa é prioritária.
 */

class BackgroundKeepAlive {
    private audioCtx: AudioContext | null = null;
    private oscillator: OscillatorNode | null = null;
    private gainNode: GainNode | null = null;
    private isActive: boolean = false;

    /**
     * Inicia o áudio silencioso
     */
    public start() {
        if (this.isActive) return;

        try {
            // Cria contexto de áudio se não existir
            if (!this.audioCtx) {
                this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            }

            // Garante que o contexto está rodando (pode ser bloqueado se não houver interação prévia)
            if (this.audioCtx.state === 'suspended') {
                this.audioCtx.resume();
            }

            // Cria oscilador de frequência inaudível
            this.oscillator = this.audioCtx.createOscillator();
            this.oscillator.frequency.setValueAtTime(440, this.audioCtx.currentTime);

            // Cria controle de volume (zero para silêncio absoluto)
            this.gainNode = this.audioCtx.createGain();
            this.gainNode.gain.setValueAtTime(0, this.audioCtx.currentTime);

            this.oscillator.connect(this.gainNode);
            this.gainNode.connect(this.audioCtx.destination);

            this.oscillator.start();
            this.isActive = true;
            console.log('Background Keep-Alive: Ativado');
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
            if (this.oscillator) {
                this.oscillator.stop();
                this.oscillator.disconnect();
            }
            if (this.gainNode) {
                this.gainNode.disconnect();
            }
            this.isActive = false;
            console.log('Background Keep-Alive: Desativado');
        } catch (err) {
            console.warn('Erro ao parar Keep-Alive:', err);
        }
    }
}

export const backgroundKeepAlive = new BackgroundKeepAlive();
