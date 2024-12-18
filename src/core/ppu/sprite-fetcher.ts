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

export class SpriteFetcher {
    spriteBuffer: OamSprite[] = [];

    private stepCycles = 0;
    private state = PixelFetcherState.FetchTileNumber;

    private fetchedTileId = 0;
    private fetchedTileDataLow = 0;
    private fetchedTileDataHigh = 0;
    private lastPixelX = -1;

    private currentSprite: OamSprite | null = null;

    constructor(
        private readonly ppuState: PpuState,
        private readonly vram: Memory,
        private readonly fifo: PixelFifo
    ) { }

    foundSpriteAt(pixelX: number) {
        if (pixelX === this.lastPixelX) {
            return false;
        }

        this.lastPixelX = pixelX;

        const sprite = this.findNextSprite(pixelX);
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
        this.lastPixelX = -1;
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
    
    private findNextSprite(pixelX: number) {
        const x = pixelX + 8;
        for (const sprite of this.spriteBuffer) {
            if (!sprite.fetched && sprite.x <= x) {
                sprite.fetched = true;
                return sprite;
            }
        }        
        return null;
    }

    private handlePushState() {
        this.pushSpriteToFifo();
        this.resetFetchedSpriteState();
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
        const tileNumber = this.currentSprite!.tileIndex;
        if (this.ppuState.spriteHeight === 16) {
            this.fetchedTileId = tileNumber & 0xfe;

            const spriteY = this.ppuState.ly - this.currentSprite!.y - 16;
            if (spriteY >= 8) {
                this.fetchedTileId |= 1;
            }
        } else {
            this.fetchedTileId = tileNumber;
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
        
        const line = this.ppuState.ly - sprite.y - 16;
        let offset = line & (this.ppuState.spriteHeight - 1);
        
        if (sprite.flipY) {
            offset = this.ppuState.spriteHeight - 1 - offset;
        }

        return tileDataAddress + (offset << 1) + (this.fetchedTileId << 4);
    }

    private pushSpriteToFifo() {
        const sprite = this.currentSprite!;
        const remainingBits = 7 - this.fifo.length;

        if (!sprite.flipX) {
            for (let i = remainingBits; i >= 0; i--) {
                this.pushPixelToFifo(i);
            }
        } else {
            for (let i = 0; i <= remainingBits; i++) {
                this.pushPixelToFifo(i);
            }
        }
    }

    private pushPixelToFifo(index: number) {
        const sprite = this.currentSprite!;

        const colorBit1 = (this.fetchedTileDataHigh >> index) & 1;
        const colorBit0 = (this.fetchedTileDataLow >> index) & 1;
        const color = (colorBit1 << 1) | colorBit0;

        const pixel: Pixel = {
            color,
            isSprite: true,
            spritePalette: sprite.dmgPalette,
            bgSpritePriority: sprite.priority
        };

        this.fifo.push(pixel);
    }
}