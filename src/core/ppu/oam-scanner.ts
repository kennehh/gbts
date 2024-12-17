import { Memory } from "../memory/memory";
import { PpuState } from "./ppu-state";

export type OamSprite = {
    y: number,
    x: number,
    tileIndex: number,
    oamIndex: number,

    // flags
    priority: boolean,
    flipX: boolean,
    flipY: boolean,
    dmgPalette: number,
    bank: number,
    cgbPalette: number,
    
    fetched: boolean
}

export class OamScanner {
    private spriteBuffer: OamSprite[] = new Array(10);
    private currentOamIndex = 0;

    constructor(private readonly state: PpuState, private readonly oam: Memory) { }

    reset() {
        this.spriteBuffer = [];
        this.currentOamIndex = 0;
    }

    tick() {
        if (this.state.dmaActive) {
            return;
        }
        
        if (this.spriteBuffer.length < 10) {
            // Only evaluate sprites every other cycle (we evaluate 40 sprites in 80 t-cycles)
            const doEvaluate = (this.state.tCycles & 0x1) === 0;
            if (doEvaluate) {
                this.evaluateSprite();
            }
        }
    }

    getSprites() {
        return this.spriteBuffer.sort((a, b) => {
            const xDifference = a.x - b.x;
            if (xDifference !== 0) {
                return xDifference;
            }
            return a.oamIndex - b.oamIndex;
        });
    }

    private evaluateSprite() {
        const oamIndex = this.currentOamIndex;
        this.currentOamIndex += 4;

        const x = this.oam.read(oamIndex + 1);
        if (x === 0) {
            return;
        }

        const y = this.oam.read(oamIndex);    
        const lyAdjusted = this.state.ly + 16;

        if (lyAdjusted >= y && lyAdjusted < (y + this.state.spriteHeight)) {
            const tileIndex = this.oam.read(oamIndex + 2);
            const flags = this.oam.read(oamIndex + 3);

            this.spriteBuffer.push({ 
                y, 
                x, 
                tileIndex, 
                priority: (flags & 0x80) !== 0,
                flipY: (flags & 0x40) !== 0,
                flipX: (flags & 0x20) !== 0,
                dmgPalette: (flags & 0x10) >> 4,
                bank: (flags & 0x8) >> 3,
                cgbPalette: flags & 0x7,
                oamIndex, 
                fetched: false 
            });
        }     
    }
}
