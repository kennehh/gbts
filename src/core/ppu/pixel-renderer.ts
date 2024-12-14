import { Memory } from "../memory/memory";
import { IDisplay } from "./display";
import { Pixel, PixelFifo } from "./pixel-fifo";
import { PpuState } from "./ppu-state";

export class PixelRenderer {
    private pixelX = 0;
    private _finishedScanline = false;

    constructor(
        private readonly ppuState: PpuState,
        private readonly display: IDisplay,
        private readonly bgPixelFifo: PixelFifo,
        private readonly spritePixelFifo: PixelFifo
    ) { }

    get finishedScanline() {
        return this._finishedScanline;
    }

    reset() {
        this.pixelX = 0;
        this._finishedScanline = false;
    }

    tick() {
        if (this._finishedScanline) {
            return;
        }
        if (this.bgPixelFifo.isEmpty()) {
            return;
        }
        if (this.checkWindowTrigger()) {
            this.bgPixelFifo.clear();
            return;
        }
                
        const bgPixel = this.bgPixelFifo.shift()!;
        const spritePixel = this.spritePixelFifo.shift();
        
        const finalPixel = this.mixPixels(bgPixel, spritePixel);
        const color = this.getFinalPixel(finalPixel);

        this.display.setPixel(this.ppuState.ly, this.pixelX, color);
        this.pixelX++;
        if (this.pixelX === 160) {
            this._finishedScanline = true;
        }
    }

    private mixPixels(bgPixel: Pixel, spritePixel: Pixel | null): Pixel {
        if (spritePixel == null) {
            return bgPixel;
        }
        if (spritePixel.color === 0) {
            return bgPixel;
        }
        if (this.ppuState.bgWindowPriority && bgPixel?.color !== 0) {
            return bgPixel;
        }
        return spritePixel!;
    }

    private getFinalPixel(pixel: Pixel): number {
        // For sprite pixels, use the appropriate sprite palette (OBP0 or OBP1)
        if (pixel.isSprite) {
            const palette = pixel.spritePalette ? this.ppuState.obp1 : this.ppuState.obp0;
            // Color 0 is transparent for sprites, but this should be handled before getFinalPixel
            // in mixPixels
            return (palette >> (pixel.color << 1)) & 0b11;
        }
        
        // For background pixels, use the background palette (BGP)
        const palette = this.ppuState.bgp;
        return (palette >> (pixel.color << 1)) & 0b11;
    }
    

    private checkWindowTrigger() {
        if (this.ppuState.fetcherWindowMode) {
            return false;
        }
        if (!this.ppuState.windowEnabled) {
            return false;
        }
        if (!this.ppuState.windowWasVisible) {
            return false;
        }
        if (this.pixelX < this.ppuState.wx - 7) {
            return false;
        }
        this.ppuState.fetcherWindowMode = true;
        return true;
    }
}