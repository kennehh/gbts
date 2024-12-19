export type Pixel = {
    color: number;
    isSprite: boolean;
    spriteBgHasPriority?: boolean;
    spritePalette?: number;
}

const FIFO_CAPACITY = 8;
const FIFO_MASK = FIFO_CAPACITY - 1;
const PIXEL_ZERO: Pixel = { color: 0, isSprite: false };

export class PixelFifo {
    protected buffer: Pixel[] = new Array(FIFO_CAPACITY);
    protected head = 0;
    protected tail = 0;
    protected size = 0;

    shift(): Pixel {
        if (this.isEmpty()) {
            return PIXEL_ZERO;
        }

        const pixel = this.buffer[this.head];
        this.head = (this.head + 1) & FIFO_MASK;
        this.size--;
        return pixel;
    }
    
    push(pixel: Pixel) {
        if (this.isFull()) {
            return;
        }

        this.buffer[this.tail] = pixel;
        this.tail = (this.tail + 1) & FIFO_MASK;
        this.size++;
    }

    isEmpty(): boolean {
        return this.size === 0;
    }

    isFull(): boolean {
        return this.size === FIFO_CAPACITY;
    }

    clear() {
        this.head = 0;
        this.tail = 0;
        this.size = 0;
    }

    get length(): number {
        return this.size;
    }
}

export class SpritePixelFifo extends PixelFifo {
    pushSpritePixel(newPixel: Pixel, index: number) {
        if (this.size > index) {
            const physicalIndex = (this.tail + index) & FIFO_MASK;
            const existingPixel = this.buffer[physicalIndex];
            if (this.shouldOverwritePixel(existingPixel, newPixel)) {
                this.buffer[physicalIndex] = newPixel;
            }
            return;
        }

        super.push(newPixel);
    }

    private shouldOverwritePixel(existingPixel: Pixel, newPixel: Pixel): boolean {
        return existingPixel.color === 0 || (existingPixel.spriteBgHasPriority! && !newPixel.spriteBgHasPriority!);
    }
}
