import type { OamSprite } from "../oam/types";
import type { Pixel } from "./types";

const SPRITE_PIXEL_ZERO: Pixel = { color: 0, isSprite: true } as const;

export class SpriteFifo {
    protected buffer: Uint8Array = new Uint8Array(8);
    protected head = 0;
    protected size = 0;

    get length() {
        return this.size;
    }

    shift(): number {
        if (this.size === 0) {
            return 0;
        }

        const pixel = this.buffer[this.head];
        this.head = (this.head + 1) & 7;
        this.size--;
        return pixel;
    }

    discard() {
        if (this.size === 0) {
            return 0;
        }

        this.head = (this.head + 1) & 7;
        this.size--;
    }

    clear() {
        this.head = 0;
        this.size = 0;
    }

    setTileRow(sprite: OamSprite, tileDataHigh: number, tileDataLow: number) {
        const start = sprite.x < 8 ? sprite.x - 1 : 7;

        if (!sprite.flipX) {
            if (start < 7) {
                let arrayIndex = 0;
                for (let i = start; i >= 0; i--) {
                    this.setPixel(sprite, tileDataHigh, tileDataLow, i, arrayIndex++);
                }
                return;
            }

            // unroll loop if we know we have 8 pixels to push
            this.setPixel(sprite, tileDataHigh, tileDataLow, 7, 0);
            this.setPixel(sprite, tileDataHigh, tileDataLow, 6, 1);
            this.setPixel(sprite, tileDataHigh, tileDataLow, 5, 2);
            this.setPixel(sprite, tileDataHigh, tileDataLow, 4, 3);
            this.setPixel(sprite, tileDataHigh, tileDataLow, 3, 4);
            this.setPixel(sprite, tileDataHigh, tileDataLow, 2, 5);
            this.setPixel(sprite, tileDataHigh, tileDataLow, 1, 6);
            this.setPixel(sprite, tileDataHigh, tileDataLow, 0, 7);
        } else {
            if (start < 7) {
                let arrayIndex = 0;
                for (let i = 7 - start; i <= 7; i++) {
                    this.setPixel(sprite, tileDataHigh, tileDataLow, i, arrayIndex++);
                }
                return;
            }

            // unroll loop if we know we have 8 pixels to push
            this.setPixel(sprite, tileDataHigh, tileDataLow, 0, 0);
            this.setPixel(sprite, tileDataHigh, tileDataLow, 1, 1);
            this.setPixel(sprite, tileDataHigh, tileDataLow, 2, 2);
            this.setPixel(sprite, tileDataHigh, tileDataLow, 3, 3);
            this.setPixel(sprite, tileDataHigh, tileDataLow, 4, 4);
            this.setPixel(sprite, tileDataHigh, tileDataLow, 5, 5);
            this.setPixel(sprite, tileDataHigh, tileDataLow, 6, 6);
            this.setPixel(sprite, tileDataHigh, tileDataLow, 7, 7);
        }
    }

    private setPixel(sprite: OamSprite, tileDataHigh: number, tileDataLow: number, bit: number, index: number) {
        const colorBit1 = (tileDataHigh >> bit) & 1;
        const colorBit0 = (tileDataLow >> bit) & 1;
        const color = (colorBit1 << 1) | colorBit0;
        const physicalIndex = (this.head + index) & 7;

        if (this.size > index) {
            if (color === 0) {
                return;
            }
                
            const existingPixel = this.buffer[physicalIndex];
            const existingColor = existingPixel & 0b11;
            const existingBgHasPriority = (existingPixel >> 3) === 1;

            if (existingColor === 0 || (existingBgHasPriority && !sprite.bgHasPriority)) {
                this.buffer[physicalIndex] = this.packPixel(sprite, color);
            }
            return;
        }

        this.buffer[physicalIndex] = this.packPixel(sprite, color);
        this.size++;
    }

    private packPixel(sprite: OamSprite, color: number): number {
        const priority = sprite.bgHasPriority ? 1 : 0;
        return color | (sprite.dmgPalette << 2) | (priority << 3);
    }

    static unpackPixel(pixel: number): Pixel {
        return {
            color: pixel & 0b11,
            isSprite: true,
            spritePalette: (pixel >> 2) & 1,
            spriteBgHasPriority: pixel >> 3 === 1,
        };
    }

    static getBgPriority(pixel: number){
        return pixel >> 3 === 1;
    }
}