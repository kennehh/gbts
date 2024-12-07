import { Memory } from "../memory/memory";
import { PpuState } from "./ppu-state";

enum PixelFetcherState {
    FetchTileNumber,
    FetchTileDataLow,
    FetchTileDataHigh,
    PushToFifo
}

export class PixelFetcher {
    private tCycles = 0;
    private state = PixelFetcherState.FetchTileNumber;

    private currentTileNumber = 0;
    private tileByteLow = 0;
    private tileByteHigh = 0;


    constructor(
        private readonly ppuState: PpuState,
        private readonly vram: Memory,
        private readonly spriteBuffer: OamEntry[]
    ) { }

    tick() {
        this.tCycles++;

        const execute = (this.tCycles & 0x1) === 0;
        if (!execute) {
            return;
        }

        switch (this.state) {
            case PixelFetcherState.FetchTileNumber:
                this.fetchTileNumber();
                break;
            case PixelFetcherState.FetchTileDataLow:
                this.fetchTileDataLow();
                break;
            case PixelFetcherState.FetchTileDataHigh:
                this.fetchTileDataHigh();
                break;
            case PixelFetcherState.PushToFifo:
                this.pushToFifo();
                break;
        }

        
    }

    private fetchTileNumber() {
        const lcdc = this.ppuState.lcdc;
        const scx = this.ppuState.scx;
        const scy = this.ppuState.scy;
        const ly = this.ppuState.ly;
        const wx = this.ppuState.wx;
        const wy = this.ppuState.wy;
        const windowLineCounter = this.ppuState.windowLineCounter;

        const isWindow = this.ppuState.isWindow;
        const tileMapBase = isWindow ? (lcdc & 0x40 ? 0x9C00 : 0x9800) : (lcdc & 0x08 ? 0x9C00 : 0x9800);

        const xPos = this.ppuState.xPos;
        const xOffset = isWindow ? ((xPos - wx) >> 3) & 0x1F : ((xPos + scx) >> 3) & 0x1F;
        const yOffset = isWindow ? (windowLineCounter >> 3) * 32 : (((ly + scy) & 0xFF) >> 3) * 32;

        const tileIndex = (xOffset + yOffset) & 0x3FF;
        const tileAddress = tileMapBase + tileIndex;

        this.ppuState.tileNo = this.vram.readByte(tileAddress);
        this.state = PixelFetcherState.FetchTileDataLow;
    }
}