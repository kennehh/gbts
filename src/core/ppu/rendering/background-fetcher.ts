import { Memory } from "../../memory/memory";
import { PpuState } from "../ppu-state";
import { BgFifo } from "./bg-fifo";

const enum PixelFetcherState {
    Sleep = 0,
    FetchTileNumber0 = 1,
    FetchTileNumber1 = 2,
    FetchTileDataLow0 = 3,
    FetchTileDataLow1 = 4,
    FetchTileDataHigh0 = 5,
    FetchTileDataHigh1 = 6,
    PushToFifo = 7
}

export class BackgroundFetcher {
    pixelsToDiscard = 0;

    private state = PixelFetcherState.FetchTileNumber0;

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
        private readonly fifo: BgFifo
    ) { }

    tick() {
        if (this.state === PixelFetcherState.Sleep) {
            return;
        }

        switch (this.state) {
            case PixelFetcherState.FetchTileNumber0:
            case PixelFetcherState.FetchTileDataLow0:
            case PixelFetcherState.FetchTileDataHigh0:
                this.state++;
                break;
            case PixelFetcherState.FetchTileNumber1:
                this.fetchTileNumber();
                this.state = PixelFetcherState.FetchTileDataLow0;
                break;
            case PixelFetcherState.FetchTileDataLow1:
                this.fetchTileDataLow();
                this.state = PixelFetcherState.FetchTileDataHigh0;
                break;
            case PixelFetcherState.FetchTileDataHigh1:
                this.fetchTileDataHigh();
                this.state = PixelFetcherState.PushToFifo;
                break;
            case PixelFetcherState.PushToFifo:
                this.handlePushState();
                break;
            default:
                throw new Error(`Invalid pixel fetcher state: ${this.state}`);
        }
    }

    reset(windowMode: boolean = false) {
        this.fetcherTileX = 0;
        this.state = PixelFetcherState.FetchTileNumber0;
        this._windowMode = windowMode;
    }

    pause() {
        this.state = PixelFetcherState.Sleep;
    }

    resume() {
        this.state = PixelFetcherState.FetchTileNumber0;
    }

    private handlePushState() {
        if (!this.pushBgToFifo()) {
            return;
        }
    
        if (this.fetcherTileX <= 20) {
            this.fetcherTileX++;
            this.state = PixelFetcherState.FetchTileNumber0;
        } else {
            this.state = PixelFetcherState.Sleep;
        }
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

        this.fifo.setTileRow(this.fetchedTileDataHigh, this.fetchedTileDataLow, this.pixelsToDiscard);
        this.pixelsToDiscard = 0;

        return true;
    }
}
