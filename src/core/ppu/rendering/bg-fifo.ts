import { Pixel } from "./pixel";

export class BgFifo {
    protected buffer: Uint8Array = new Uint8Array(8).fill(0);
    protected head = 0;
    protected size = 0;

    get length() {
        return this.size;
    }

    shift(): Pixel {
        const color = this.buffer[this.head++];
        this.size--;
        return { color, isSprite: false };
    }

    clear() {
        this.head = 0;
        this.size = 0;
    }

    setTileRow(tileDataHigh: number, tileDataLow: number, pixelsToDiscard: number) {
        this.head = 0;
        this.size = 8;

        if (pixelsToDiscard > 0) {
            this.size -= pixelsToDiscard;
            const pixelStart = this.size - 1;
            for (let i = pixelStart; i >= 0; i--) {
                this.setPixel(tileDataHigh, tileDataLow, i, pixelStart - i);
            }
            return;
        }

        // unroll loop if we know we have 8 pixels to push
        this.setPixel(tileDataHigh, tileDataLow, 7, 0);
        this.setPixel(tileDataHigh, tileDataLow, 6, 1);
        this.setPixel(tileDataHigh, tileDataLow, 5, 2);
        this.setPixel(tileDataHigh, tileDataLow, 4, 3);
        this.setPixel(tileDataHigh, tileDataLow, 3, 4);
        this.setPixel(tileDataHigh, tileDataLow, 2, 5);
        this.setPixel(tileDataHigh, tileDataLow, 1, 6);
        this.setPixel(tileDataHigh, tileDataLow, 0, 7);
    }

    private setPixel(tileDataHigh: number, tileDataLow: number, bit: number, index: number) {
        const colorBit1 = (tileDataHigh >> bit) & 1;
        const colorBit0 = (tileDataLow >> bit) & 1;
        const color = (colorBit1 << 1) | colorBit0;
        this.buffer[index] = color;
    }
}