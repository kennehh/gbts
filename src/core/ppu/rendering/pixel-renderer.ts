import { PpuState } from "../ppu-state";
import { BgFifo } from "./bg-fifo";
import { SpriteFifo } from "./sprite-fifo";
import type { IDisplay } from "./types";

export class PixelRenderer {
    pixelX = 0;

    constructor(
        private readonly ppuState: PpuState,
        private readonly display: IDisplay,
        private readonly bgPixelFifo: BgFifo,
        private readonly spritePixelFifo: SpriteFifo
    ) { }

    reset() {
        this.pixelX = 0;
    }

    checkWindowTrigger() {
        return  this.ppuState.windowEnabled && 
                this.ppuState.scanlineReachedWindow && 
               (this.pixelX >= this.ppuState.wx - 7);
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

            if (spritePixel === 0 || ((spritePixel >> 3) === 1 && bgPixel !== 0)) {
                // blank pixel or BG has priority
                color = this.ppuState.bgWindowEnable ? bgPixel : 0;
                palette = this.ppuState.bgpLookup;
            } else {
                color = spritePixel & 0b11;
                palette = (spritePixel >> 2) & 1 ? this.ppuState.obp1Lookup : this.ppuState.obp0Lookup;
            }

            finalColor = palette[color];
        }

        this.display.setPixel(this.ppuState.scanline, this.pixelX++, finalColor);
        
        if (this.pixelX === 160) {
            return true;
        }
        return false;
    }
}
