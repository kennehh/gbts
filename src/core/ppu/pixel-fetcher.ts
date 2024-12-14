import { Memory } from "../memory/memory";
import { OamSprite } from "./oam-scanner";
import { Pixel, PixelFifo } from "./pixel-fifo";
import { PpuState } from "./ppu-state";

enum PixelFetcherState {
    FetchTileNumber,
    FetchTileDataLow,
    FetchTileDataHigh,
    PushToFifo
}

export class PixelFetcher {
    private stepCycles = 0;
    private state = PixelFetcherState.FetchTileNumber;
    private finishedScanline = false;

    private fetchedTileId = 0;
    private fetchedTileDataLow = 0;
    private fetchedTileDataHigh = 0;
    private currentTileX = 0;
    private currentPixelX = 0;
    
    private windowMode = false;

    private spriteBuffer: OamSprite[] = [];
    private currentSprite: OamSprite | null = null;
    private spriteFetchInProgress = false;
    
    constructor(
        private readonly ppuState: PpuState,
        private readonly vram: Memory,
        private readonly bgPixelFifo: PixelFifo,
        private readonly spritePixelFifo: PixelFifo
    ) { }

    tick() {
        if (this.finishedScanline) {
            return;
        }

        // if (!this.spriteFetchInProgress && this.ppuState.spriteEnable) {
        //     const sprite = this.findNextSprite();
        //     if (sprite != null) {
        //         this.currentSprite = sprite;
        //         this.spriteFetchInProgress = true;
        //     }
        // }

        this.stepCycles++;

        if (this.state !== PixelFetcherState.PushToFifo) {
            this.handleFetchStates();
        } else {
            this.handlePushState();
        }
    }

    reset(spriteBuffer: OamSprite[] | null = null) {
        this.finishedScanline = false;
        this.currentTileX = 0;
        this.currentPixelX = 0;
        this.state = PixelFetcherState.FetchTileNumber;
        this.spriteBuffer = spriteBuffer ?? [];
        this.currentSprite = null;
        this.spriteFetchInProgress = false;
        this.windowMode = false;
    }

    resetForWindow() {
        this.reset();
        this.windowMode = true;
    }

    private findNextSprite() {
        const xPosition = this.currentPixelX;

        for (const sprite of this.spriteBuffer) {
            if (sprite.fetched) {
                continue;
            }

            const spriteLeft = sprite.x;
            const spriteRight = sprite.x + 8;

            if (this.currentPixelX >= spriteLeft && xPosition < spriteRight) {
                return sprite;
            }
        }
        
        return null;
    }

    private handlePushState() {
        if (!this.pushBgToFifo()) {
            return false;
        }
    
        if (this.currentTileX <= 20) {
            this.currentTileX++;
            this.currentPixelX += 8;
        } else {            
            this.currentTileX = 0;
            this.currentPixelX = 0;
            this.finishedScanline = true;
        }
    
        this.state = PixelFetcherState.FetchTileNumber;
        this.stepCycles = 0;
        return false;
    }

    private handleFetchStates() {
        if (this.stepCycles < 2) {
            return;
        }

        if (this.spriteFetchInProgress) {
            this.handleSpriteFetchStates();
        } else {
            this.handleBgFetchStates();
        }
        
        this.stepCycles = 0;
    }

    private handleBgFetchStates() {
        switch (this.state) {
            case PixelFetcherState.FetchTileNumber:
                this.fetchBgTileNumber();
                this.state = PixelFetcherState.FetchTileDataLow;
                break;
            case PixelFetcherState.FetchTileDataLow:
                this.fetchBgTileDataLow();
                this.state = PixelFetcherState.FetchTileDataHigh;
                break;
            case PixelFetcherState.FetchTileDataHigh:
                this.fetchBgTileDataHigh();
                this.state = PixelFetcherState.PushToFifo;
                break;
            default:
                throw new Error(`Invalid pixel fetcher state: ${this.state}`);
        }
    }

    private handleSpriteFetchStates() {
        switch (this.state) {
            case PixelFetcherState.FetchTileNumber:
                this.fetchSpriteTileNumber();
                this.state = PixelFetcherState.FetchTileDataLow;
                break;
            case PixelFetcherState.FetchTileDataLow:
                this.fetchSpriteTileDataLow();
                this.state = PixelFetcherState.FetchTileDataHigh;
                break;
            case PixelFetcherState.FetchTileDataHigh:
                this.fetchSpriteTileDataHigh();
                this.state = PixelFetcherState.PushToFifo;
                break;
            default:
                throw new Error(`Invalid pixel fetcher state: ${this.state}`);
        }
    }

    private fetchSpriteTileNumber() {
        const tileNumber = this.currentSprite!.tileIndex;
        if (this.ppuState.spriteHeight === 16) {
            this.fetchedTileId = tileNumber & 0xfe;

            const spriteY = this.ppuState.ly - this.currentSprite!.y - 16;
            if (spriteY >= 8) {
                this.fetchedTileId |= 1;
            }
        }
    }

    private fetchSpriteTileDataLow() {
        const tileDataAddress = this.getSpriteTileDataAddress(false);
        this.fetchedTileDataLow = this.vram.read(tileDataAddress);
    }

    private fetchSpriteTileDataHigh() {
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

    private fetchBgTileNumber() {
        let fetcherX: number, fetcherY: number, tileMapAddress: number;

        if (this.windowMode) {
            fetcherX = this.currentTileX;
            fetcherY = this.ppuState.windowLineCounter;
            tileMapAddress = this.ppuState.windowTileMapAddress;
        } else {
            fetcherX = ((this.ppuState.scx >> 3) + this.currentTileX) & 0x1f;
            fetcherY = (this.ppuState.scy + this.ppuState.ly) & 0xff;
            tileMapAddress = this.ppuState.bgTileMapAddress;
        }

        const tileAddress = tileMapAddress + ((fetcherY >> 3) << 5) + fetcherX;
        this.fetchedTileId = this.vram.read(tileAddress);
    }

    private fetchBgTileDataLow() {
        const tileDataAddress = this.getBgTileDataAddress(false);
        this.fetchedTileDataLow = this.vram.read(tileDataAddress);
    }

    private fetchBgTileDataHigh() {
        const tileDataAddress = this.getBgTileDataAddress(true);
        this.fetchedTileDataHigh = this.vram.read(tileDataAddress);
    }

    private getBgTileDataAddress(high: boolean) {
        let tileDataAddress = this.ppuState.useBgWindow8000AdressingMode ? 0x8000 : 0x9000;
        
        // Get Y position within the tile (0-7)
        const tileY = this.windowMode ? 
            this.ppuState.windowLineCounter & 7 :
            (this.ppuState.ly + this.ppuState.scy) & 7;
        
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

    private pushSpriteToFifo() {
        for (let i = 7; i >= 0; i--) {
            const bitIndex = this.currentSprite!.flipX ? 7 - i : i;
            const colorBit1 = (this.fetchedTileDataHigh >> bitIndex) & 1;
            const colorBit0 = (this.fetchedTileDataLow >> bitIndex) & 1;
            const color = (colorBit1 << 1) | colorBit0;

        }
    }

    private pushBgToFifo() {
        // Only push if FIFO is empty
        if (!this.bgPixelFifo.isEmpty()) {
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
                priority: 0,
                isSprite: false
            };

            this.bgPixelFifo.push(pixel);
        }

        return true;
    }
}
