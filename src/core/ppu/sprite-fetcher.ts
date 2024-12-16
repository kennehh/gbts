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
    private lastFetcherTileX = -1;

    private currentSprite: OamSprite | null = null;
    
    constructor(
        private readonly ppuState: PpuState,
        private readonly vram: Memory,
        private readonly fifo: PixelFifo
    ) { }

    foundSpriteAt(tileX: number) {
        if (tileX === this.lastFetcherTileX) {
            return false;
        }

        this.lastFetcherTileX = tileX;

        const sprite = this.findNextSprite(tileX);
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
        this.lastFetcherTileX = -1;
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
    
    private findNextSprite(tileX: number) {
        const x = (tileX << 3);

        for (const sprite of this.spriteBuffer) {
            if (sprite.fetched || sprite.x > x) {
                continue;
            }
            sprite.fetched = true;
            return sprite;
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
        const tileDataAddress = this.getSpriteTileDataAddress(false);
        this.fetchedTileDataLow = this.vram.read(tileDataAddress);
    }

    private fetchTileDataHigh() {
        const tileDataAddress = this.getSpriteTileDataAddress(true);
        this.fetchedTileDataHigh = this.vram.read(tileDataAddress);
    }

    private getSpriteTileDataAddress(high: boolean) {
        const tileDataAddress = 0x8000;
        
        // Get Y position within the tile (0-7)
        let spriteY = this.ppuState.ly - this.currentSprite!.y - 16;
        
        if (this.currentSprite!.flipY) {
            spriteY = this.ppuState.spriteHeight - 1 - spriteY;
        }

        if (this.ppuState.spriteHeight === 16) {
            // only grab the current half of the sprite
            spriteY &= 0x7;
        }

        // Each row takes 2 bytes
        const rowOffset = spriteY << 1;
        
        // Add 1 if getting high byte
        const byteOffset = high ? 1 : 0;
        
        return tileDataAddress + (this.fetchedTileId << 4) + rowOffset + byteOffset;
    }

    private pushSpriteToFifo() {
        const sprite = this.currentSprite!;
        const pixelsToSkip = this.fifo.length;
        const start = 7 - pixelsToSkip;

        for (let i = start; i >= 0; i--) {
            const bitPos = sprite.flipX ? start : i;
            const colorBit1 = (this.fetchedTileDataHigh >> bitPos) & 1;
            const colorBit0 = (this.fetchedTileDataLow >> bitPos) & 1;
            const color = (colorBit1 << 1) | colorBit0;

            const pixel: Pixel = {
                color,
                isSprite: true,
                spritePalette: sprite.dmgPalette,
                spritePriority: sprite.priority
            };

            this.fifo.push(pixel);
        }
    }
}
