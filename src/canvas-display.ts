import { IDisplay } from './core/ppu/display';

export class CanvasDisplay implements IDisplay {
    // private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private imageData: ImageData;
    private frameBuffer: Uint8ClampedArray;
    
    // Game Boy colors (from lightest to darkest)
    private readonly colors = [
        [155, 188, 15], // Light green
        [139, 172, 15], // Medium green
        [48, 98, 48],   // Dark green
        [15, 56, 15],   // Darkest green
    ];

    constructor(parent: HTMLElement, scale: number = 2) {
        // Create canvas element
        const canvas = document.createElement('canvas');
        canvas.width = 160;  // Game Boy native width
        canvas.height = 144; // Game Boy native height
        
        // Scale the canvas display size (not the internal resolution)
        canvas.style.width = `${160 * scale}px`;
        canvas.style.height = `${144 * scale}px`;
        canvas.style.imageRendering = 'pixelated'; // Sharp pixels when scaled
        canvas.style.backgroundColor = '#000';     // Black background

        // Add to parent element
        parent.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Could not get 2D context');
        }
        this.ctx = ctx;
        this.imageData = this.ctx.createImageData(160, 144);
        this.frameBuffer = this.imageData.data;
    }

    setPixel(y: number, x: number, colorId: number): void {
        if (x < 0 || x >= 160 || y < 0 || y >= 144) {
            return;
        }

        const color = this.colors[colorId];
        const offset = (y * 160 + x) << 2;

        this.frameBuffer[offset] = color[0];     // R
        this.frameBuffer[offset + 1] = color[1]; // G
        this.frameBuffer[offset + 2] = color[2]; // B
        this.frameBuffer[offset + 3] = 255;      // A
    }

    renderFrame(): void {
        this.ctx.putImageData(this.imageData, 0, 0);
    }

    // Optional: Clear the display
    clear(): void {
        this.frameBuffer.fill(0);
        this.renderFrame();
    }

    // Optional: Change color palette
    setPalette(palette: [number, number, number][]): void {
        if (palette.length !== 4) {
            throw new Error('Palette must contain exactly 4 colors');
        }
        this.colors.splice(0, 4, ...palette);
    }
}
