import { IDisplay } from "./display";
import { PpuState } from "../ppu-state";
import { BgFifo } from "./bg-fifo";
import { SpriteFifo } from "./sprite-fifo";
import { Pixel } from "./pixel";

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
        const bgPixel = this.bgPixelFifo.shift();
        const spritePixel = this.spritePixelFifo.shift();
        
        let color = 0;
        if (!this.ppuState.firstFrameAfterLcdEnable) {
            const pixel = this.mixPixels(bgPixel, spritePixel);
            color = this.getFinalPixel(pixel);
        }

        this.display.setPixel(this.ppuState.scanline, this._pixelX++, color);
        
        if (this._pixelX === 160) {
            return true;
        }
        return false;
    }

    private mixPixels(bgPixel: Pixel, spritePixel: Pixel): Pixel {
        if (!this.ppuState.spriteEnable || spritePixel.color === 0 || (spritePixel.spriteBgHasPriority && bgPixel.color !== 0)) {
            return this.ppuState.bgWindowEnable ? bgPixel : PIXEL_BG0;
        }
        return spritePixel;
    }

    private getFinalPixel(pixel: Pixel): number {
        const palette = pixel.isSprite ? 
            (pixel.spritePalette ? this.ppuState.obp1 : this.ppuState.obp0) :
            this.ppuState.bgp;
        return (palette >> (pixel.color << 1)) & 0b11;
    }
}