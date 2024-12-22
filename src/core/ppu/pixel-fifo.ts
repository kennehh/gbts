import { log } from "console";

export type Pixel = {
    color: number;
    isSprite: boolean;
    spriteBgHasPriority?: boolean;
    spritePalette?: number;
}

const FIFO_CAPACITY = 8;
const FIFO_MASK = FIFO_CAPACITY - 1;
const BG_PIXEL_ZERO: Pixel = { color: 0, isSprite: false } as const;
const SPRITE_PIXEL_ZERO: Pixel = { color: 0, isSprite: true } as const;


export class PixelFifo {
    protected buffer: Pixel[] = new Array(FIFO_CAPACITY).fill(this.defaultPixel);
    protected head = 0;
    protected tail = 0;
    protected length = 0;

    protected get defaultPixel(): Pixel {
        return BG_PIXEL_ZERO;
    }

    shift(): Pixel {
        if (this.isEmpty()) {
            return this.defaultPixel;
        }

        const pixel = this.buffer[this.head];
        this.head = (this.head + 1) & FIFO_MASK;
        this.length--;
        return pixel;
    }
    
    push(color: number, isSprite: boolean, spriteBgHasPriority?: boolean, spritePalette?: number) {
        if (this.isFull()) {
            return;
        }

        const pixel = this.buffer[this.tail];
        pixel.color = color;
        pixel.isSprite = isSprite;
        pixel.spriteBgHasPriority = spriteBgHasPriority;
        pixel.spritePalette = spritePalette;

        this.tail = (this.tail + 1) & FIFO_MASK;
        this.length++;
    }

    isEmpty(): boolean {
        return this.length === 0;
    }

    isFull(): boolean {
        return this.length === FIFO_CAPACITY;
    }

    clear() {
        this.head = 0;
        this.tail = 0;
        this.length = 0;
    }
}

export class SpritePixelFifo extends PixelFifo {
    protected override get defaultPixel(): Pixel {
        return SPRITE_PIXEL_ZERO;
    }

    pushSpritePixel(index: number, color: number, isSprite: boolean, spriteBgHasPriority: boolean, spritePalette: number) {
        if (this.length > index) {
            const physicalIndex = (this.head + index) & FIFO_MASK;
            const existingPixel = this.buffer[physicalIndex];

            if (color !== 0 && existingPixel.color === 0) {
                existingPixel.color = color;
                existingPixel.isSprite = isSprite;
                existingPixel.spriteBgHasPriority = spriteBgHasPriority;
                existingPixel.spritePalette = spritePalette;
            }

            return;
        }

        super.push(color, isSprite, spriteBgHasPriority, spritePalette);
    }
}
