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
        this.fifo.clear();
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
        let fetcherX: number, fetcherY: number, tileMapAddress: number;

        if (this._windowMode) {
            fetcherX = this._fetcherTileX;
            fetcherY = this.ppuState.windowLineCounter;
            tileMapAddress = this.ppuState.windowTileMapAddress;
        } else {
            fetcherX = ((this.ppuState.scx >> 3) + this._fetcherTileX) & 0x1f;
            fetcherY = (this.ppuState.scy + this.ppuState.ly) & 0xff;
            tileMapAddress = this.ppuState.bgTileMapAddress;
        }

        const tileAddress = tileMapAddress + ((fetcherY >> 3) << 5) + fetcherX;
        this.fetchedTileId = this.vram.read(tileAddress);
    }

    private fetchTileDataLow() {
        const tileDataAddress = this.getTileDataAddress(false);
        this.fetchedTileDataLow = this.vram.read(tileDataAddress);
    }

    private fetchTileDataHigh() {
        const tileDataAddress = this.getTileDataAddress(true);
        this.fetchedTileDataHigh = this.vram.read(tileDataAddress);
    }

    private getTileDataAddress(high: boolean) {
        let tileDataAddress = this.ppuState.useBgWindow8000AdressingMode ? 0x8000 : 0x9000;
        
        // Get Y position within the tile (0-7)
        const tileY = this._windowMode ? this.ppuState.windowLineCounter & 7 : (this.ppuState.ly + this.ppuState.scy) & 7;
        
        // Each row takes 2 bytes
        const rowOffset = tileY << 1;
        
        // Add 1 if getting high byte
        const byteOffset = high ? 1 : 0;
        let tileNumber = this.fetchedTileId;
        if (!this.ppuState.useBgWindow8000AdressingMode) {
            // Signed tile numbers
            tileNumber = tileNumber << 24 >> 24;
        }
        
        return tileDataAddress + (tileNumber << 4) + rowOffset + byteOffset;
    }

    private pushBgToFifo() {
        // Only push if FIFO is empty
        if (!this.fifo.isEmpty()) {
            return false;
        }

        // Get 8 pixels from the current tile data
        for (let i = 7; i >= 0; i--) {
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
