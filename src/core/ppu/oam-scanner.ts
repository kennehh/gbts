import { Memory } from "../memory/memory";

export type OamEntry = {
    y: number,
    x: number,
    tileIndex: number,
    flags: number,
    oamIndex: number
}

export class OamScanner {
    private spriteBuffer: OamEntry[] = [];
    private spriteHeight: number = 8;
    private currentOamIndex = 0;
    private tCycles = 0;

    constructor(private readonly oam: Memory) { }

    reset(spriteHeight: number) {
        this.spriteHeight = spriteHeight;
        this.spriteBuffer = [];
        this.currentOamIndex = 0;
        this.tCycles = 0;
    }

    tick(ly: number) {
        this.tCycles++;

        if (this.spriteBuffer.length < 10) {
            // Only evaluate sprites every other cycle (we evaluate 40 sprites in 80 t-cycles)
            const doEvaluate = (this.tCycles & 0x1) === 0;
            if (doEvaluate) {
                this.evaluateSprite(ly);
            }
        }
        
        if (this.tCycles === 80) {
            this.sortSprites();
            return true;
        }

        return false;
    }

    getSprites() {
        return this.spriteBuffer;
    }

    private evaluateSprite(ly: number) {
        const oamIndex = this.currentOamIndex;
        this.currentOamIndex += 4;

        const x = this.oam.read(oamIndex + 1);
        if (x === 0) {
            return;
        }

        const y = this.oam.read(oamIndex);    
        const lyAdjusted = ly + 16;

        if (lyAdjusted >= y && lyAdjusted < (y + this.spriteHeight)) {
            const tileIndex = this.oam.read(oamIndex + 2);
            const flags = this.oam.read(oamIndex + 3);
            this.spriteBuffer.push({ y, x, tileIndex, flags, oamIndex });
        }     
    }

    private sortSprites() {
        this.spriteBuffer.sort((a, b) => {
            const xDifference = a.x - b.x;
            if (xDifference !== 0) {
                return xDifference;
            }
            return a.oamIndex - b.oamIndex;
        });
    }
}
