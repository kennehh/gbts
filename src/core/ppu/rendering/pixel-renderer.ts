import { PpuState } from "../ppu-state";
import { BgFifo } from "./bg-fifo";
import { SpriteFifo } from "./sprite-fifo";
import type { IDisplay, Pixel } from "./types";

const PIXEL_BG0: Pixel = { color: 0, isSprite: false } as const;

export class PixelRenderer {
    private _pixelX = 0;
    get pixelX() {
        return this._pixelX;
    }

    constructor(
        private readonly ppuState: PpuState,
        private readonly display: IDisplay,
        private readonly bgPixelFifo: BgFifo,
        private readonly spritePixelFifo: SpriteFifo
    ) { }

    reset() {
        this._pixelX = 0;
    }

    checkWindowTrigger() {
        return  this.ppuState.windowEnabled && 
                this.ppuState.scanlineReachedWindow && 
               (this._pixelX >= this.ppuState.wx - 7);
    }

    tick() {
        let color = 0;

        if (!this.ppuState.firstFrameAfterLcdEnable) {
            const bgPixel = this.bgPixelFifo.shift();
            let spritePixel = 0;

            if (!this.ppuState.spriteEnable) {
                this.spritePixelFifo.discard();
            } else {
                spritePixel = this.spritePixelFifo.shift();
            }

            const pixel = this.mixPixels(bgPixel, spritePixel);
            color = this.getFinalPixel(pixel);
        }

        this.display.setPixel(this.ppuState.scanline, this._pixelX++, color);
        
        if (this._pixelX === 160) {
            return true;
        }
        return false;
    }

    private mixPixels(bgPixel: number, spritePixel: number): Pixel {
        if (spritePixel === 0) {
            return this.ppuState.bgWindowEnable ? { color: bgPixel } : PIXEL_BG0;
        }

        if (SpriteFifo.getBgPriority(spritePixel) && bgPixel !== 0) {
            return this.ppuState.bgWindowEnable ? { color: bgPixel } : PIXEL_BG0;
        }

        return SpriteFifo.unpackPixel(spritePixel);
    }

    private getFinalPixel(pixel: Pixel): number {
        let palette = this.ppuState.bgp;
        if (pixel.isSprite) {
            palette = pixel.spritePalette ? this.ppuState.obp1 : this.ppuState.obp0;
        }
        return (palette >> (pixel.color << 1)) & 0b11;
    }
}