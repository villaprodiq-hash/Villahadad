import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { toast } from 'sonner';

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

// --- 2. Native Implementation (Electron/M1) - FUTURE ---
// This will be enabled when we migrate to Electron
class NativeMediaConverter implements IMediaConverter {
  public isLoaded: boolean = true; // Native binary is always "there"

  async load(): Promise<void> {
    // Check connection to Electron backend
    return Promise.resolve();
  }

  async convertVideoToAudio(file: File): Promise<Blob> {
    console.log("🚀 Using Native M1 Acceleration...");
    
    // In the future, this calls the main process:
    // return window.electronAPI.convertMedia(file.path, 'mp3');
    
    // For now, allow fallback or throw error if accidentally used in web
    throw new Error("Native mode not yet available in Browser environment");
  }
}

// --- Factory ---
// Automatically chooses the best engine
export const mediaConverter = new WebMediaConverter();

// Future Logic:
// export const mediaConverter = window.isElectron ? new NativeMediaConverter() : new WebMediaConverter();
