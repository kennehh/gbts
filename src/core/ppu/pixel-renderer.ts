import { Memory } from "../memory/memory";
import { IDisplay } from "./display";
import { Pixel, PixelFifo } from "./pixel-fifo";
import { PpuState } from "./ppu-state";

export class PixelRenderer {
    get pixelX() {
        return this.__pixelX;
    }

    private __pixelX = 0;
    private _finishedScanline = false;
    private _windowTriggered = false;
    private static bg0Pixel: Pixel = { color: 0, isSprite: false };

    constructor(
        private readonly ppuState: PpuState,
        private readonly display: IDisplay,
        private readonly bgPixelFifo: PixelFifo,
        private readonly spritePixelFifo: PixelFifo
    ) { }

    get finishedScanline() {
        return this._finishedScanline;
    }

    get windowTriggered() {
        return this._windowTriggered
    }

    reset() {
        this.__pixelX = 0;
        this._finishedScanline = false;
        this._windowTriggered = false;
    }

    tick() {
        if (this._finishedScanline) {
            return;
        }
        if (this.bgPixelFifo.isEmpty()) {
            return;
        }
        if (this.checkWindowTrigger()) {
            this._windowTriggered = true;
            return;
        }
                
        const bgPixel = this.bgPixelFifo.shift()!;
        const spritePixel = this.spritePixelFifo.shift();
        
        const finalPixel = this.mixPixels(bgPixel, spritePixel);
        const color = this.getFinalPixel(finalPixel);

        this.display.setPixel(this.ppuState.ly, this.__pixelX, color);
        this.__pixelX++;
        
        if (this.__pixelX === 160) {
            this._finishedScanline = true;
        }
    }

    private mixPixels(bgPixel: Pixel, spritePixel: Pixel | null): Pixel {
        if (!this.ppuState.spriteEnable || spritePixel === null || spritePixel.color === 0) {
            return this.ppuState.bgWindowEnable ? bgPixel : PixelRenderer.bg0Pixel;
        }

        if (spritePixel.bgSpritePriority && bgPixel.color !== 0) {
            return this.ppuState.bgWindowEnable ? bgPixel : PixelRenderer.bg0Pixel;
        }

        return spritePixel;
    }

    private getFinalPixel(pixel: Pixel): number {
        let palette: number;

        if (pixel.isSprite) {
            palette = pixel.spritePalette ? this.ppuState.obp1 : this.ppuState.obp0;
        } else {
            palette = this.ppuState.bgp;
        }

        return (palette >> (pixel.color << 1)) & 0b11;
    }
    

    private checkWindowTrigger() {
        if (this._windowTriggered) {
            return false;
        }
        if (!this.ppuState.windowEnabled) {
            return false;
        }
        if (!this.ppuState.windowWasVisible) {
            return false;
        }
        if (this.__pixelX < this.ppuState.wx - 7) {
            return false;
        }
    
        this._windowTriggered = true;
        return true;
    }
}