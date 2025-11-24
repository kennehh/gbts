import { PpuState } from "../ppu-state";
import { BgFifo } from "./bg-fifo";
import { SpriteFifo } from "./sprite-fifo";
import { getSpriteBgHasPriority, getSpriteColor, getSpritePalette } from "./sprite-utils";
import type { IDisplay } from "./types";

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
        let finalColor = 0;

        if (!this.ppuState.firstFrameAfterLcdEnable) {
            const bgPixel = this.bgPixelFifo.shift();
            let spritePixel = 0;

            if (this.ppuState.spriteEnable) {
                spritePixel = this.spritePixelFifo.shift();
            } else {
                this.spritePixelFifo.discard();
            }

            let color = 0;
            let palette: Uint8Array;

            if (spritePixel === 0 || (getSpriteBgHasPriority(spritePixel) && bgPixel !== 0)) {
                color = this.ppuState.bgWindowEnable ? bgPixel : 0;
                palette = this.ppuState.bgpLookup;
            } else {
                color = getSpriteColor(spritePixel);
                palette = getSpritePalette(spritePixel) ? this.ppuState.obp1Lookup : this.ppuState.obp0Lookup;
            }

            finalColor = palette[color];
        }

        this.display.setPixel(this.ppuState.scanline, this._pixelX++, finalColor);
        
        if (this._pixelX === 160) {
            return true;
        }
        return false;
    }
}
