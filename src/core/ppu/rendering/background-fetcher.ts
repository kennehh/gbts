import { Memory } from "../../memory/memory";
import { OamSprite } from "../oam/oam-scanner";
import { Pixel, PixelFifo } from "./pixel-fifo";
import { PpuState } from "../ppu-state";

enum PixelFetcherState {
    Sleep,
    FetchTileNumber,
    FetchTileDataLow,
    FetchTileDataHigh,
    PushToFifo
}

export class BackgroundFetcher {
    pixelsToDiscard = 0;

    private stepCycles = 0;
    private state = PixelFetcherState.FetchTileNumber;

    private fetchedTileId = 0;
    private fetchedTileDataLow = 0;
    private fetchedTileDataHigh = 0;
    private fetcherTileX = 0;
    
    private _windowMode = false;


    get windowMode() {
        return this._windowMode;
    }
    
    constructor(
        private readonly ppuState: PpuState,
        private readonly vram: Memory,
        private readonly fifo: PixelFifo
    ) { }

    tick() {
        if (this.state === PixelFetcherState.Sleep) {
            return;
        }

        this.stepCycles++;

        if (this.state !== PixelFetcherState.PushToFifo) {
            this.handleFetchStates();
        } else {
            this.handlePushState();
        }
    }

    reset(windowMode: boolean = false) {
        this.resetFetchedTileState();
        this.fetcherTileX = 0;
        this.state = PixelFetcherState.FetchTileNumber;
        this._windowMode = windowMode;
    }

    pause() {
        this.state = PixelFetcherState.Sleep;
    }

    resume() {
        this.state = PixelFetcherState.FetchTileNumber;
    }

    private handlePushState() {
        if (!this.pushBgToFifo()) {
            return;
        }
    
        if (this.fetcherTileX <= 20) {
            this.fetcherTileX++;
            this.state = PixelFetcherState.FetchTileNumber;
        } else {
            this.state = PixelFetcherState.Sleep;
        }
    }

    private resetFetchedTileState() {
        this.fetchedTileId = 0;
        this.fetchedTileDataLow = 0;
        this.fetchedTileDataHigh = 0;
        this.stepCycles = 0;
    }

    private handleFetchStates() {
        if (this.stepCycles < 2) {
            return;
        }

        switch (this.state) {
            case PixelFetcherState.FetchTileNumber:
                this.fetchTileNumber();
                this.state = PixelFetcherState.FetchTileDataLow;
                break;
            case PixelFetcherState.FetchTileDataLow:
                this.fetchTileDataLow();
                this.state = PixelFetcherState.FetchTileDataHigh;
                break;
            case PixelFetcherState.FetchTileDataHigh:
                this.fetchTileDataHigh();
                this.state = PixelFetcherState.PushToFifo;
                break;
            default:
                throw new Error(`Invalid pixel fetcher state: ${this.state}`);
        }
        
        this.stepCycles = 0;
    }

    private fetchTileNumber() {
        let tileMapBaseAddress: number;
        let offset = this.fetcherTileX;

        if (this._windowMode) {
            tileMapBaseAddress = this.ppuState.windowTileMapAddress;
            offset += (this.ppuState.windowLineCounter >> 3) << 5;
        } else {
            tileMapBaseAddress = this.ppuState.bgTileMapAddress;
            offset += this.ppuState.scx >> 3;
            offset &= 0x1f;
            offset += ((this.ppuState.scanline + this.ppuState.scy) >> 3) << 5;
            offset &= 0x3ff;
        }

        const tileMapAddress = tileMapBaseAddress + offset;
        this.fetchedTileId = this.vram.read(tileMapAddress);
    }

    private fetchTileDataLow() {
        const tileDataAddress = this.getTileDataAddress();
        this.fetchedTileDataLow = this.vram.read(tileDataAddress);
    }

    private fetchTileDataHigh() {
        const tileDataAddress = this.getTileDataAddress() + 1;
        this.fetchedTileDataHigh = this.vram.read(tileDataAddress);
    }

    private getTileDataAddress() {
        let offset: number, tileId: number, tileDataBaseAddress: number;

        if (this._windowMode) {
            offset = (this.ppuState.windowLineCounter & 0x7) << 1;
        } else {
            offset = ((this.ppuState.scanline + this.ppuState.scy) & 0x7) << 1;
        }
        
        if (this.ppuState.useBgWindow8000AdressingMode) {
            tileId = this.fetchedTileId;
            tileDataBaseAddress = 0x8000;
        } else {
            // Signed tile id
            tileId = this.fetchedTileId << 24 >> 24;
            tileDataBaseAddress = 0x9000;
        }

        return tileDataBaseAddress + offset + (tileId << 4);
    }

    private pushBgToFifo() {
        // Only push if FIFO is empty
        if (this.fifo.length > 0) {
            return false;
        }

        if (this.pixelsToDiscard > 0) {
            const pixelStart = 7 - this.pixelsToDiscard;
            this.pixelsToDiscard = 0;
            
            for (let i = pixelStart; i >= 0; i--) {
                this.pushPixelToFifo(i);
            }
            return true;
        }

        // unroll loop if we know we have 8 pixels to push
        this.pushPixelToFifo(7);
        this.pushPixelToFifo(6);
        this.pushPixelToFifo(5);
        this.pushPixelToFifo(4);
        this.pushPixelToFifo(3);
        this.pushPixelToFifo(2);
        this.pushPixelToFifo(1);
        this.pushPixelToFifo(0);

        return true;
    }

    private pushPixelToFifo(index: number) {
        const colorBit1 = (this.fetchedTileDataHigh >> index) & 1;
        const colorBit0 = (this.fetchedTileDataLow >> index) & 1;
        const color = (colorBit1 << 1) | colorBit0;

        this.fifo.push({
            color,
            isSprite: false
        });
    }
}
