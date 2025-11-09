import { Memory } from "../../memory/memory";
import { OamSprite } from "../oam/oam-scanner";
import { PpuState } from "../ppu-state";
import { SpriteOrderedList } from "../oam/sprite-ordered-list";
import { SpriteFifo } from "./sprite-fifo";

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

export class SpriteFetcher {
    sprites: SpriteOrderedList | null = null;

    private state = PixelFetcherState.Sleep;

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
        if (!this.ppuState.spriteEnable || this.sprites!.length === 0 || this.state !== PixelFetcherState.Sleep) {
            return false;
        }

        const sprite = this.sprites!.findNext(pixelX);

        if (sprite != null) {
            this.currentSprite = sprite;
            this.state = PixelFetcherState.FetchTileNumber0;
            return true;
        }
        
        return false;
    }

    tick() {
        if (this.state === PixelFetcherState.Sleep) {
            return;
        }

        if (!this.ppuState.spriteEnable) {
            this.state = PixelFetcherState.Sleep;
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
        }
    }

    reset() {
        this.state = PixelFetcherState.Sleep;
    }
    
    get fetchingSprite() {
        return this.state !== PixelFetcherState.Sleep;
    }

    private handlePushState() {
        this.fifo.setTileRow(this.currentSprite!, this.fetchedTileDataHigh, this.fetchedTileDataLow);
        this.state = PixelFetcherState.Sleep;
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
