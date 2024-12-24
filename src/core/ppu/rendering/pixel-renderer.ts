import { IDisplay } from "./display";
import { PpuState } from "../ppu-state";
import { BgFifo } from "./bg-fifo";
import { SpriteFifo } from "./sprite-fifo";
import { Pixel } from "./pixel";

const PIXEL_BG0: Pixel = { color: 0, isSprite: false } as const;

export class PixelRenderer {
    get pixelX() {
        return this._pixelX;
    }

    private _pixelX = 0;
    private _finishedScanline = false;

    constructor(
        private readonly ppuState: PpuState,
        private readonly display: IDisplay,
        private readonly bgPixelFifo: BgFifo,
        private readonly spritePixelFifo: SpriteFifo
    ) { }

    get finishedScanline() {
        return this._finishedScanline;
    }

    reset() {
        this._pixelX = 0;
        this._finishedScanline = false;
    }

    tick() {
        const bgPixel = this.bgPixelFifo.shift();
        const spritePixel = this.spritePixelFifo.shift();
        
        let color = 0;
        if (!this.ppuState.firstFrameAfterLcdEnable) {
            const finalPixel = this.mixPixels(bgPixel, spritePixel);
            color = this.getFinalPixel(finalPixel);
        }

        this.display.setPixel(this.ppuState.scanline, this._pixelX, color);
        this._pixelX++;
        
        if (this._pixelX === 160) {
            this._finishedScanline = true;
        }
    }

    private mixPixels(bgPixel: Pixel, spritePixel: Pixel): Pixel {
        if (!this.ppuState.spriteEnable || spritePixel.color === 0 || (spritePixel.spriteBgHasPriority && bgPixel.color !== 0)) {
            return this.ppuState.bgWindowEnable ? bgPixel : PIXEL_BG0;
        }
        return spritePixel;
    }

    private getFinalPixel(pixel: Pixel): number {
        let palette = this.ppuState.bgp;
        if (pixel.isSprite) {
            palette = pixel.spritePalette ? this.ppuState.obp1 : this.ppuState.obp0;
        }
        return (palette >> (pixel.color << 1)) & 0b11;
    }
    
    checkWindowTrigger() {
        return  this.ppuState.windowEnabled && 
                this.ppuState.scanlineReachedWindow && 
               (this._pixelX >= this.ppuState.wx - 7);
    }
}