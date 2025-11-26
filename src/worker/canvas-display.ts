import type { IDisplay } from "@/core/ppu/rendering";

export class CanvasDisplay implements IDisplay {
    private readonly ctx: OffscreenCanvasRenderingContext2D;
    private readonly imageData: ImageData;
    private readonly frameBuffer: Uint8ClampedArray;
    private readonly colorBuffer: Uint8Array;

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

    renderFrame(frameData: Uint8Array): void {
        for (let x = 0; x < 160; x++) {
            for (let y = 0; y < 144; y++) {
                const offset = ((y * 160) << 2) + (x << 2);
                const colorOffset = frameData[y * 160 + x] * 3;
                this.frameBuffer[offset] = this.colorBuffer[colorOffset];
                this.frameBuffer[offset + 1] = this.colorBuffer[colorOffset + 1];
                this.frameBuffer[offset + 2] = this.colorBuffer[colorOffset + 2];
                this.frameBuffer[offset + 3] = 255;
            }
        }
        this.ctx.putImageData(this.imageData, 0, 0);
    }

    setPalette(palette: [number, number, number][]): void {
        let i = 0;
        for (const [r, g, b] of palette) {
            this.colorBuffer[i++] = r;
            this.colorBuffer[i++] = g;
            this.colorBuffer[i++] = b;
        }
    }

    clear(): void {
        this.renderFrame(new Uint8Array(160*144));
    }
}