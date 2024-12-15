import { IDisplay } from '../core/ppu/display';
import { FpsTracker } from './fps-tracker';

export class WorkerDisplay implements IDisplay {
    private readonly fpsTracker = new FpsTracker();
    
    private readonly ctx: OffscreenCanvasRenderingContext2D;
    private readonly imageData: ImageData;
    private readonly frameBuffer: Uint8ClampedArray;
    private readonly colorBuffer: Uint8Array;
    private dirty = false;

    constructor(canvas: OffscreenCanvas) {
        this.ctx = canvas.getContext('2d')!;
        this.ctx.imageSmoothingEnabled = false;

        this.imageData = new ImageData(160, 144);
        this.frameBuffer = this.imageData.data;
        
        this.colorBuffer = new Uint8Array(4 * 3);
        this.setPalette([
            [155, 188, 15],  // Lightest
            [139, 172, 15],  // Light
            [48, 98, 48],    // Dark
            [15, 56, 15]     // Darkest
        ]);
    }
    
    setPixel(y: number, x: number, colorId: number): void {
        if (x < 0 || x >= 160 || y < 0 || y >= 144) {
            return;
        }
        
        const offset = ((y * 160) << 2) + (x << 2);
        const colorOffset = colorId * 3;
        this.frameBuffer[offset] = this.colorBuffer[colorOffset];
        this.frameBuffer[offset + 1] = this.colorBuffer[colorOffset + 1];
        this.frameBuffer[offset + 2] = this.colorBuffer[colorOffset + 2];
        this.frameBuffer[offset + 3] = 255;
        this.dirty = true;
    }

    renderFrame(): void {
        if (!this.dirty) {
            return;
        }
        
        this.ctx.putImageData(this.imageData, 0, 0);
        this.dirty = false;

        this.fpsTracker.track();
        console.log(this.fpsTracker.getFormattedFps());
    }

    setPalette(palette: Array<[number, number, number]>): void {
        let i = 0;
        for (const [r, g, b] of palette) {
            this.colorBuffer[i++] = r;
            this.colorBuffer[i++] = g;
            this.colorBuffer[i++] = b;
        }
    }

    clear(): void {
        for (let y = 0; y < 144; y++) {
            for (let x = 0; x < 160; x++) {
                this.setPixel(y, x, 0);
            }
        }
        this.ctx.putImageData(this.imageData, 0, 0);
        this.dirty = false;
    }
}