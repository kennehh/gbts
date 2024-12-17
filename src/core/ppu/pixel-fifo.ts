export type Pixel = {
    color: number;
    isSprite: boolean;
    bgSpritePriority?: boolean;
    spritePalette?: number;
}

export class PixelFifo {
    private static readonly CAPACITY = 8;
    private static readonly MASK = PixelFifo.CAPACITY - 1;

    private buffer: Pixel[] = new Array(PixelFifo.CAPACITY);
    private head = 0;
    private tail = 0;
    private size = 0;

    shift(): Pixel | null {
        if (this.isEmpty()) {
            return null;
        }

        const pixel = this.buffer[this.head];
        this.head = (this.head + 1) & PixelFifo.MASK;
        this.size--;
        return pixel;
    }

    peak(): Pixel | null {
        if (this.isEmpty()) {
            return null;
        }
        return this.buffer[this.head];
    }

    push(pixel: Pixel) {
        if (this.isFull()) {
            return;
        }

        this.buffer[this.tail] = pixel;
        this.tail = (this.tail + 1) & PixelFifo.MASK;
        this.size++;
    }

    isEmpty(): boolean {
        return this.size === 0;
    }

    isFull(): boolean {
        return this.size === PixelFifo.CAPACITY;
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
