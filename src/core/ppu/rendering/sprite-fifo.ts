import { OamSprite } from "../oam/oam-scanner";
import { Pixel } from "./pixel";

const SPRITE_PIXEL_ZERO: Pixel = { color: 0, isSprite: true } as const;

export class SpriteFifo {
    protected buffer: Uint8Array = new Uint8Array(8);
    protected head = 0;
    protected size = 0;

    get length() {
        return this.size;
    }

    shift(): Pixel {
        if (this.size === 0) {
            return SPRITE_PIXEL_ZERO;
        }

        const pixel = this.buffer[this.head];
        this.head = (this.head + 1) & 7;
        this.size--;
        return this.unpackPixel(pixel);
    }

    clear() {
        this.head = 0;
        this.size = 0;
    }

    setTileRow(sprite: OamSprite, tileDataHigh: number, tileDataLow: number) {
        const start = sprite.x < 8 ? sprite.x - 1 : 7;
        const existingPixelCount = this.size;
        this.size = 8;

        if (!sprite.flipX) {
            if (start < 7) {
                let arrayIndex = 0;
                for (let i = start; i >= 0; i--) {
                    this.setPixel(existingPixelCount, sprite, tileDataHigh, tileDataLow, i, arrayIndex++);
                }
                return;
            }

            // unroll loop if we know we have 8 pixels to push
            this.setPixel(existingPixelCount, sprite, tileDataHigh, tileDataLow, 7, 0);
            this.setPixel(existingPixelCount, sprite, tileDataHigh, tileDataLow, 6, 1);
            this.setPixel(existingPixelCount, sprite, tileDataHigh, tileDataLow, 5, 2);
            this.setPixel(existingPixelCount, sprite, tileDataHigh, tileDataLow, 4, 3);
            this.setPixel(existingPixelCount, sprite, tileDataHigh, tileDataLow, 3, 4);
            this.setPixel(existingPixelCount, sprite, tileDataHigh, tileDataLow, 2, 5);
            this.setPixel(existingPixelCount, sprite, tileDataHigh, tileDataLow, 1, 6);
            this.setPixel(existingPixelCount, sprite, tileDataHigh, tileDataLow, 0, 7);
        } else {
            if (start < 7) {
                let arrayIndex = 0;
                for (let i = 7 - start; i <= 7; i++) {
                    this.setPixel(existingPixelCount, sprite, tileDataHigh, tileDataLow, i, arrayIndex++);
                }
                return;
            }

            // unroll loop if we know we have 8 pixels to push
            this.setPixel(existingPixelCount, sprite, tileDataHigh, tileDataLow, 0, 0);
            this.setPixel(existingPixelCount, sprite, tileDataHigh, tileDataLow, 1, 1);
            this.setPixel(existingPixelCount, sprite, tileDataHigh, tileDataLow, 2, 2);
            this.setPixel(existingPixelCount, sprite, tileDataHigh, tileDataLow, 3, 3);
            this.setPixel(existingPixelCount, sprite, tileDataHigh, tileDataLow, 4, 4);
            this.setPixel(existingPixelCount, sprite, tileDataHigh, tileDataLow, 5, 5);
            this.setPixel(existingPixelCount, sprite, tileDataHigh, tileDataLow, 6, 6);
            this.setPixel(existingPixelCount, sprite, tileDataHigh, tileDataLow, 7, 7);
        }
    }

    private setPixel(existingPixelCount: number, sprite: OamSprite, tileDataHigh: number, tileDataLow: number, bit: number, index: number) {
        const colorBit1 = (tileDataHigh >> bit) & 1;
        const colorBit0 = (tileDataLow >> bit) & 1;
        const color = (colorBit1 << 1) | colorBit0;
        const physicalIndex = (this.head + index) & 7;

        if (existingPixelCount > index) {
            const existingPixel = this.buffer[physicalIndex] & 0b11;
            if (color !== 0 && existingPixel === 0) {
                this.buffer[physicalIndex] = this.packPixel(sprite, color);
            }
            return;
        }

        this.buffer[physicalIndex] = this.packPixel(sprite, color);
    }

    private packPixel(sprite: OamSprite, color: number) {
        const priority = sprite.priority ? 1 : 0;
        return color | (sprite.dmgPalette << 2) | (priority << 3);
    }

    private unpackPixel(pixel: number): Pixel {
        return {
            color: pixel & 0b11,
            isSprite: true,
            spritePalette: (pixel >> 2) & 1,
            spriteBgHasPriority: pixel >> 3 === 1,
        };
    }
}