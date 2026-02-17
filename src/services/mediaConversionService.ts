import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

// --- Interface for Conversion Service ---
export interface IMediaConverter {
  load(): Promise<void>;
  convertVideoToAudio(file: File): Promise<Blob>;
  isLoaded: boolean;
}

// --- 1. Web Implementation (WASM) - Current ---
class WebMediaConverter implements IMediaConverter {
  private ffmpeg: FFmpeg;
  public isLoaded: boolean = false;

  constructor() {
    this.ffmpeg = new FFmpeg();
    this.ffmpeg.on('log', ({ message }) => console.log(`[FFmpeg Web]: ${message}`));
  }

  async load(): Promise<void> {
    if (this.isLoaded) return;
    
    try {
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
        await this.ffmpeg.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });
        this.isLoaded = true;
        console.log("✅ Web Converter Loaded (WASM)");
    } catch (error) {
        console.error("❌ Failed to load Web Converter", error);
        throw error;
    }
  }

  async convertVideoToAudio(file: File): Promise<Blob> {
    if (!this.isLoaded) await this.load();

    const inputName = 'input.mp4';
    const outputName = 'output.mp3';

    // 1. Write file to virtual file system
    await this.ffmpeg.writeFile(inputName, await fetchFile(file));

    // 2. Run conversion
    // Note: This runs on the Browser CPU.
    await this.ffmpeg.exec(['-i', inputName, '-vn', '-acodec', 'libmp3lame', outputName]);

    // 3. Read result
    const data = await this.ffmpeg.readFile(outputName);
    return new Blob([data], { type: 'audio/mp3' });
  }
}

// --- Factory ---
// Automatically chooses the best engine
export const mediaConverter = new WebMediaConverter();

// Future Logic:
// export const mediaConverter = window.isElectron ? new NativeMediaConverter() : new WebMediaConverter();
