import { Memory } from "../memory/memory";
import { OamSprite } from "./oam-scanner";
import { Pixel, PixelFifo } from "./pixel-fifo";
import { PpuState } from "./ppu-state";

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
    private _fetcherTileX = 0;
    
    private _windowMode = false;

    get fetcherTileX() {
        return this._fetcherTileX;
    }

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
        this._fetcherTileX = 0;
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
    
        if (this._fetcherTileX <= 20) {
            this._fetcherTileX++;
            this.state = PixelFetcherState.FetchTileNumber;
        } else {
            this.state = PixelFetcherState.Sleep;
        }        
        
        this.resetFetchedTileState();
        return;
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
        let offset = this._fetcherTileX;

        if (this._windowMode) {
            tileMapBaseAddress = this.ppuState.windowTileMapAddress;
            offset += (this.ppuState.windowLineCounter >> 3) << 5;
        } else {
            tileMapBaseAddress = this.ppuState.bgTileMapAddress;
            offset += this.ppuState.scx >> 3;
            offset &= 0x1f;
            offset += ((this.ppuState.ly + this.ppuState.scy) >> 3) << 5;
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
        const tileDataBaseAddress = this.ppuState.useBgWindow8000AdressingMode ? 0x8000 : 0x9000;
        let offset: number;

        if (this._windowMode) {
            offset = (this.ppuState.windowLineCounter & 0x7) << 1;
        } else {
            offset = ((this.ppuState.ly + this.ppuState.scy) & 0x7) << 1;
        }

        let tileId = this.fetchedTileId;
        if (!this.ppuState.useBgWindow8000AdressingMode) {
            // Signed tile id
            tileId = tileId << 24 >> 24;
        }

        return tileDataBaseAddress + offset + (tileId << 4);
    }

    private pushBgToFifo() {
        // Only push if FIFO is empty
        if (!this.fifo.isEmpty()) {
            return false;
        }

        const pixelStart = 7 - this.pixelsToDiscard;
        this.pixelsToDiscard = 0;
        
        // Get 8 pixels from the current tile data
        for (let i = pixelStart; i >= 0; i--) {
            // Get color bits from the high and low bytes
            // TODO: Handle CGB tile flipping
            const colorBit1 = (this.fetchedTileDataHigh >> i) & 1;
            const colorBit0 = (this.fetchedTileDataLow >> i) & 1;
            const color = (colorBit1 << 1) | colorBit0;

            // Create new pixel
            const pixel: Pixel = {
                color,
                isSprite: false
            };

            this.fifo.push(pixel);
        }

        return true;
    }
}
