import { Memory } from "../../memory/memory";
import { OamSprite } from "../oam/oam-scanner";
import { PpuState } from "../ppu-state";
import { SpriteOrderedList } from "../oam/sprite-ordered-list";
import { SpriteFifo } from "./sprite-fifo";

enum PixelFetcherState {
    Sleep,
    FetchTileNumber,
    FetchTileDataLow,
    FetchTileDataHigh,
    PushToFifo
}

export class SpriteFetcher {
    sprites: SpriteOrderedList | null = null;

    private stepCycles = 0;
    private state = PixelFetcherState.FetchTileNumber;

    private fetchedTileId = 0;
    private fetchedTileDataLow = 0;
    private fetchedTileDataHigh = 0;

    private currentSprite: OamSprite | null = null;

    constructor(
        private readonly ppuState: PpuState,
        private readonly vram: Memory,
        private readonly fifo: SpriteFifo
    ) { }

    foundSpriteAt(pixelX: number) {
        if (this.sprites!.length === 0 || this.state !== PixelFetcherState.Sleep) {
            return false;
        }

        const sprite = this.sprites!.findNext(pixelX);

        if (sprite != null) {
            this.currentSprite = sprite;
            this.state = PixelFetcherState.FetchTileNumber;
            return true;
        }
        
        return false;
    }

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

    reset() {
        this.resetFetchedSpriteState();
        this.state = PixelFetcherState.Sleep;
    }
    
    get fetchingSprite() {
        return this.state !== PixelFetcherState.Sleep;
    }

    private resetFetchedSpriteState() {
        this.currentSprite = null;
        this.fetchedTileId = 0;
        this.fetchedTileDataLow = 0;
        this.fetchedTileDataHigh = 0;
        this.stepCycles = 0;
    }

    private handlePushState() {
        this.fifo.setTileRow(this.currentSprite!, this.fetchedTileDataHigh, this.fetchedTileDataLow);
        this.state = PixelFetcherState.Sleep;
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
        const sprite = this.currentSprite!;
        this.fetchedTileId = sprite.tileIndex;
        
        if (this.ppuState.spriteHeight === 16) {
            this.fetchedTileId &= 0xfe;

            const spriteY = this.ppuState.scanline - sprite.y - 16;
            if (spriteY >= 8) {
                this.fetchedTileId |= 1;
            }
        }
    }

    private fetchTileDataLow() {
        const tileDataAddress = this.getSpriteTileDataAddress();
        this.fetchedTileDataLow = this.vram.read(tileDataAddress);
    }

    private fetchTileDataHigh() {
        const tileDataAddress = this.getSpriteTileDataAddress() + 1;
        this.fetchedTileDataHigh = this.vram.read(tileDataAddress);
    }

    private getSpriteTileDataAddress() {
        const tileDataAddress = 0x8000;
        const sprite = this.currentSprite!;
        
        const line = this.ppuState.scanline - sprite.y - 16;
        let offset = line & (this.ppuState.spriteHeight - 1);
        
        if (sprite.flipY) {
            offset = this.ppuState.spriteHeight - 1 - offset;
        }

        return tileDataAddress + (offset << 1) + (this.fetchedTileId << 4);
    }
}
