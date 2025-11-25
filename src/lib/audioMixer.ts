// Audio mixing utilities using Web Audio API

export interface AudioMixerOptions {
    intro?: File;
    outro?: File;
    podcast: Blob;
    fadeDuration?: number; // in seconds
}

export class AudioMixer {
    private audioContext: AudioContext;
    private fadeDuration: number;

    constructor(fadeDuration: number = 2) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.fadeDuration = fadeDuration;
    }

    async mixAudio(options: AudioMixerOptions): Promise<Blob> {
        const { intro, outro, podcast, fadeDuration = this.fadeDuration } = options;

        // Load all audio buffers
        const buffers: AudioBuffer[] = [];

        if (intro) {
            buffers.push(await this.loadAudioFile(intro));
        }

        buffers.push(await this.loadAudioFile(podcast));

        if (outro) {
            buffers.push(await this.loadAudioFile(outro));
        }

        // Calculate total duration
        const totalDuration = buffers.reduce((sum, buffer) => sum + buffer.duration, 0);

        // Create offline context for rendering
        const offlineContext = new OfflineAudioContext(
            2, // stereo
            this.audioContext.sampleRate * totalDuration,
            this.audioContext.sampleRate
        );

        let currentTime = 0;

        // Process each buffer
        for (let i = 0; i < buffers.length; i++) {
            const buffer = buffers[i];
            const source = offlineContext.createBufferSource();
            const gainNode = offlineContext.createGain();

            source.buffer = buffer;
            source.connect(gainNode);
            gainNode.connect(offlineContext.destination);

            // Apply fade effects
            if (i === 0 && intro) {
                // Fade out at the end of intro
                const fadeStartTime = currentTime + buffer.duration - fadeDuration;
                gainNode.gain.setValueAtTime(1, fadeStartTime);
                gainNode.gain.linearRampToValueAtTime(0, fadeStartTime + fadeDuration);
            }

            if (i === buffers.length - 1 && outro) {
                // Fade in at the start of outro
                gainNode.gain.setValueAtTime(0, currentTime);
                gainNode.gain.linearRampToValueAtTime(1, currentTime + fadeDuration);
            }

            source.start(currentTime);
            currentTime += buffer.duration;
        }

        // Render the mixed audio
        const renderedBuffer = await offlineContext.startRendering();

        // Convert to WAV blob
        return this.audioBufferToWav(renderedBuffer);
    }

    private async loadAudioFile(file: File | Blob): Promise<AudioBuffer> {
        const arrayBuffer = await file.arrayBuffer();
        return await this.audioContext.decodeAudioData(arrayBuffer);
    }

    private audioBufferToWav(buffer: AudioBuffer): Blob {
        const length = buffer.length * buffer.numberOfChannels * 2;
        const arrayBuffer = new ArrayBuffer(44 + length);
        const view = new DataView(arrayBuffer);
        const channels: Float32Array[] = [];
        let offset = 0;
        let pos = 0;

        // Write WAV header
        const setUint16 = (data: number) => {
            view.setUint16(pos, data, true);
            pos += 2;
        };
        const setUint32 = (data: number) => {
            view.setUint32(pos, data, true);
            pos += 4;
        };

        // "RIFF" chunk descriptor
        setUint32(0x46464952); // "RIFF"
        setUint32(36 + length); // file length - 8
        setUint32(0x45564157); // "WAVE"

        // "fmt " sub-chunk
        setUint32(0x20746d66); // "fmt "
        setUint32(16); // subchunk1size
        setUint16(1); // audio format (1 = PCM)
        setUint16(buffer.numberOfChannels);
        setUint32(buffer.sampleRate);
        setUint32(buffer.sampleRate * 2 * buffer.numberOfChannels); // byte rate
        setUint16(buffer.numberOfChannels * 2); // block align
        setUint16(16); // bits per sample

        // "data" sub-chunk
        setUint32(0x61746164); // "data"
        setUint32(length);

        // Write interleaved data
        for (let i = 0; i < buffer.numberOfChannels; i++) {
            channels.push(buffer.getChannelData(i));
        }

        while (pos < arrayBuffer.byteLength) {
            for (let i = 0; i < buffer.numberOfChannels; i++) {
                let sample = Math.max(-1, Math.min(1, channels[i][offset]));
                sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
                view.setInt16(pos, sample, true);
                pos += 2;
            }
            offset++;
        }

        return new Blob([arrayBuffer], { type: 'audio/wav' });
    }

    destroy() {
        this.audioContext.close();
    }
}
