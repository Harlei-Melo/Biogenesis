import { useEffect, useRef, useCallback } from 'react';

/**
 * AudioManager — procedural ambient sound using Web Audio API.
 *
 * No external .mp3 files needed! Generates:
 *  • Fase 0 (Atmosfera): Wind/rain-like filtered noise
 *  • Fase 1 (Oceano): Deep underwater drone
 *  • Transition: Short splash burst
 *
 * All sounds are synthesized from oscillators and noise nodes.
 * Respects browser autoplay policy — requires a user gesture to start.
 */

interface AudioManagerProps {
    faseAtual: number;
}

export function AudioManager({ faseAtual }: AudioManagerProps) {
    const ctxRef = useRef<AudioContext | null>(null);
    const gainRef = useRef<GainNode | null>(null);
    const activeNodesRef = useRef<AudioNode[]>([]);
    const startedRef = useRef(false);
    const prevFaseRef = useRef(-1);

    // Initialize AudioContext on first user gesture
    const ensureContext = useCallback(() => {
        if (ctxRef.current) return ctxRef.current;
        const ctx = new AudioContext();
        const masterGain = ctx.createGain();
        masterGain.gain.value = 0;
        masterGain.connect(ctx.destination);
        ctxRef.current = ctx;
        gainRef.current = masterGain;
        return ctx;
    }, []);

    // Stop all currently playing nodes
    const stopAll = useCallback(() => {
        for (const node of activeNodesRef.current) {
            try {
                if (node instanceof OscillatorNode || node instanceof AudioBufferSourceNode) {
                    node.stop();
                }
                node.disconnect();
            } catch { /* ignore */ }
        }
        activeNodesRef.current = [];
    }, []);

    // === UNDERWATER DRONE (Fase 1) ===
    const startUnderwaterDrone = useCallback(() => {
        const ctx = ctxRef.current;
        const master = gainRef.current;
        if (!ctx || !master) return;

        // Deep oscillator layers
        const freqs = [55, 82.5, 110]; // Low bass tones
        for (const freq of freqs) {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;

            const oscGain = ctx.createGain();
            oscGain.gain.value = 0.08;

            // Subtle detuning LFO
            const detune = ctx.createOscillator();
            detune.type = 'sine';
            detune.frequency.value = 0.05 + Math.random() * 0.1;
            const detuneGain = ctx.createGain();
            detuneGain.gain.value = 3;
            detune.connect(detuneGain);
            detuneGain.connect(osc.frequency);

            osc.connect(oscGain);
            oscGain.connect(master);
            osc.start();
            detune.start();

            activeNodesRef.current.push(osc, oscGain, detune, detuneGain);
        }

        // Filtered noise for "water movement"
        const bufferSize = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let last = 0;
        for (let i = 0; i < bufferSize; i++) {
            const w = Math.random() * 2 - 1;
            last = (last + 0.02 * w) / 1.02;
            data[i] = last * 2;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;

        const lpf = ctx.createBiquadFilter();
        lpf.type = 'lowpass';
        lpf.frequency.value = 200;
        lpf.Q.value = 1;

        const noiseGain = ctx.createGain();
        noiseGain.gain.value = 0.06;

        noise.connect(lpf);
        lpf.connect(noiseGain);
        noiseGain.connect(master);
        noise.start();

        activeNodesRef.current.push(noise, lpf, noiseGain);

        // Fade in
        master.gain.setTargetAtTime(0.2, ctx.currentTime, 2.0);
    }, []);

    // === SPLASH BURST (transition) ===
    const playSplash = useCallback(() => {
        const ctx = ctxRef.current;
        const master = gainRef.current;
        if (!ctx || !master) return;

        // Short burst of white noise with high-pass → splash feel
        const bufLen = ctx.sampleRate * 0.8;
        const buffer = ctx.createBuffer(1, bufLen, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufLen; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.15));
        }
        const src = ctx.createBufferSource();
        src.buffer = buffer;

        const hpf = ctx.createBiquadFilter();
        hpf.type = 'highpass';
        hpf.frequency.value = 800;

        const splashGain = ctx.createGain();
        splashGain.gain.value = 0.4;

        src.connect(hpf);
        hpf.connect(splashGain);
        splashGain.connect(ctx.destination); // Direct to output, bypasses master fade
        src.start();

        // Auto-cleanup
        src.onended = () => {
            src.disconnect();
            hpf.disconnect();
            splashGain.disconnect();
        };
    }, []);

    // === PANGEA DRONE (Fase 2) ===
    const startPangeaDrone = useCallback(() => {
        const ctx = ctxRef.current;
        const master = gainRef.current;
        if (!ctx || !master) return;

        // Vento e Floresta usando Pink Noise
        const bufferSize = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
            b6 = white * 0.115926;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;

        const lpf = ctx.createBiquadFilter();
        lpf.type = 'lowpass';
        lpf.frequency.value = 600; // Abafado pra rugidos longíquos

        const noiseGain = ctx.createGain();
        noiseGain.gain.value = 0.2;

        noise.connect(lpf);
        lpf.connect(noiseGain);
        noiseGain.connect(master);
        noise.start();

        activeNodesRef.current.push(noise, lpf, noiseGain);
        master.gain.setTargetAtTime(0.3, ctx.currentTime, 2.0);
    }, []);

    // Start audio on first click/touch (browser autoplay policy)
    // Movido para ca para nao usar variavel antes de inicializada
    useEffect(() => {
        const start = () => {
            if (startedRef.current) return;
            startedRef.current = true;
            ensureContext();

            // Força a rodar o primeiro state do som (comeca o drone)
            prevFaseRef.current = -1;
            setTimeout(() => {
                // Removemos o startWindDrone, o som no espaço é vácuo/silêncio.
                if (faseAtual === 1) startUnderwaterDrone();
                else if (faseAtual === 2) startPangeaDrone();
                prevFaseRef.current = faseAtual;
            }, 100);

            // Remove listeners after first interaction
            document.removeEventListener('click', start);
            document.removeEventListener('touchstart', start);
        };
        document.addEventListener('click', start);
        document.addEventListener('touchstart', start);
        return () => {
            document.removeEventListener('click', start);
            document.removeEventListener('touchstart', start);
        };
    }, [ensureContext, faseAtual, startUnderwaterDrone]);

    // React to phase changes
    useEffect(() => {
        if (!startedRef.current || !ctxRef.current) return;
        if (faseAtual === prevFaseRef.current) return;

        const ctx = ctxRef.current;
        const master = gainRef.current;
        if (!master) return;

        // Resume if suspended
        if (ctx.state === 'suspended') ctx.resume();

        // Fade out current
        master.gain.setTargetAtTime(0, ctx.currentTime, 0.5);

        // Wait for fade out, then switch
        setTimeout(() => {
            stopAll();

            if (faseAtual === 1) {
                // Sempre toca o splash pra avisar que entrou no oceano!
                playSplash();
                startUnderwaterDrone();
            } else if (faseAtual === 2) {
                startPangeaDrone();
            }

            prevFaseRef.current = faseAtual;
        }, 800);
    }, [faseAtual, stopAll, startUnderwaterDrone, startPangeaDrone, playSplash]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopAll();
            ctxRef.current?.close();
        };
    }, [stopAll]);

    return null; // Invisible component — audio only
}
