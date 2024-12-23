import { Memory } from "../../memory/memory";
import { OamSprite } from "../oam/oam-scanner";
import { Pixel, SpritePixelFifo } from "./pixel-fifo";
import { PpuState } from "../ppu-state";
import { SpriteOrderedList } from "../oam/sprite-ordered-list";

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
        private readonly fifo: SpritePixelFifo
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
        this.pushSpriteToFifo();
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

    private pushSpriteToFifo() {
        const sprite = this.currentSprite!;
        const start = sprite.x < 8 ? sprite.x - 1 : 7;

        if (!sprite.flipX) {
            if (start < 7) {
                let xPosition = 0;
                for (let i = start; i >= 0; i--) {
                    this.pushPixelToFifo(i, xPosition);
                    xPosition++;
                }
                return;
            }

            // unroll loop if we know we have 8 pixels to push
            this.pushPixelToFifo(7, 0);
            this.pushPixelToFifo(6, 1);
            this.pushPixelToFifo(5, 2);
            this.pushPixelToFifo(4, 3);
            this.pushPixelToFifo(3, 4);
            this.pushPixelToFifo(2, 5);
            this.pushPixelToFifo(1, 6);
            this.pushPixelToFifo(0, 7);

        } else {
            if (start < 7) {
                let xPosition = 0;
                for (let i = 7 - start; i <= 7; i++) {
                    this.pushPixelToFifo(i, xPosition);
                    xPosition++;
                }
                return;
            }

            // unroll loop if we know we have 8 pixels to push
            this.pushPixelToFifo(0, 0);
            this.pushPixelToFifo(1, 1);
            this.pushPixelToFifo(2, 2);
            this.pushPixelToFifo(3, 3);
            this.pushPixelToFifo(4, 4);
            this.pushPixelToFifo(5, 5);
            this.pushPixelToFifo(6, 6);
            this.pushPixelToFifo(7, 7);
        }
    }

    private pushPixelToFifo(index: number, xPosition: number) {
        const sprite = this.currentSprite!;

        const colorBit1 = (this.fetchedTileDataHigh >> index) & 1;
        const colorBit0 = (this.fetchedTileDataLow >> index) & 1;
        const color = (colorBit1 << 1) | colorBit0;

        this.fifo.pushSpritePixel({
            color,
            isSprite: true,
            spritePalette: sprite.dmgPalette,
            spriteBgHasPriority: sprite.priority
        }, xPosition);
    }
}
