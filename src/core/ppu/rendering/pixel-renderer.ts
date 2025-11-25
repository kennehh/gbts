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
            let color = 0;
            let palette = this.ppuState.bgpLookup;

            if (this.ppuState.bgWindowEnable) {
                color = this.bgPixelFifo.shift();
            } else {
                this.bgPixelFifo.discard();
            }

            if (this.ppuState.spriteEnable) {
                const spritePixel = this.spritePixelFifo.shift();
                const spriteColor = spritePixel & 0b11;

                if (spriteColor !== 0 && (color === 0 || (spritePixel >> 3) === 0)) {
                    // bg doesn't have priority
                    color = spriteColor;
                    const obp = (spritePixel >> 2) & 1;
                    palette = obp === 1 ? this.ppuState.obp1Lookup : this.ppuState.obp0Lookup;
                }
            } else {
                this.spritePixelFifo.discard();
            }

            finalColor = palette[color];
        }

        this.display.setPixel(this.ppuState.scanline, this.pixelX++, finalColor);

        const scanlineFinished = this.pixelX === 160
        return scanlineFinished;
    }
}
