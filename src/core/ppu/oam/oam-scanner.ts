import { Memory } from "../../memory/memory";
import { PpuState } from "../ppu-state";
import { SpriteOrderedList } from "./sprite-ordered-list";

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
    readonly sprites = new SpriteOrderedList();
    private currentOamIndex = 0;

    constructor(private readonly state: PpuState, private readonly oam: Memory) { }

    reset() {
        this.sprites.clear();
        this.currentOamIndex = 0;
    }

    tick() {
        if (!this.state.dmaActive &&
            this.sprites.length < 10 &&
            (this.state.tCycles & 0x1) === 0) {
            // Only evaluate sprites every other cycle (we evaluate 40 sprites in 80 t-cycles)
            this.evaluateSprite();
        }
    }

    private evaluateSprite() {
        const oamIndex = this.currentOamIndex;
        this.currentOamIndex += 4;

        const x = this.oam.readDirect(oamIndex + 1);
        if (x === 0) {
            return;
        }

        const y = this.oam.readDirect(oamIndex);    
        const lyAdjusted = this.state.scanline + 16;

        if (lyAdjusted >= y && lyAdjusted < (y + this.state.spriteHeight)) {
            const tileIndex = this.oam.readDirect(oamIndex + 2);
            const flags = this.oam.readDirect(oamIndex + 3);

            this.sprites.push({ 
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
