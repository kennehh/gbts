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
    protected buffer: Pixel[] = new Array(FIFO_CAPACITY);
    protected head = 0;
    protected tail = 0;
    protected size = 0;

    get length() {
        return this.size;
    }

    protected get defaultPixel(): Pixel {
        return BG_PIXEL_ZERO;
    }

    shift(): Pixel {
        if (this.size === 0) {
            return this.defaultPixel;
        }

        const pixel = this.buffer[this.head];
        this.head = (this.head + 1) & FIFO_MASK;
        this.size--;
        return pixel;
    }
    
    push(pixel: Pixel) {
        // Shouldn't happen, so we remove this check for performance
        // if (this.isFull()) {
        //     return;
        // }
        this.buffer[this.tail] = pixel;
        this.tail = (this.tail + 1) & FIFO_MASK;
        this.size++;
    }

    clear() {
        this.head = 0;
        this.tail = 0;
        this.size = 0;
    }
}

export class SpritePixelFifo extends PixelFifo {
    protected override get defaultPixel(): Pixel {
        return SPRITE_PIXEL_ZERO;
    }

    pushSpritePixel(newPixel: Pixel, index: number) {
        if (this.length > index) {
            const physicalIndex = (this.head + index) & FIFO_MASK;
            const existingPixel = this.buffer[physicalIndex];

            if (newPixel.color !== 0 && existingPixel.color === 0) {
                this.buffer[physicalIndex] = newPixel;
            }

            return;
        }

        super.push(newPixel);
    }
}
