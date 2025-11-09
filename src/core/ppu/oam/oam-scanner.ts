import { Memory } from "../../memory/memory";
import { PpuState } from "../ppu-state";
import { SpriteOrderedList } from "./sprite-ordered-list";

export interface OamSprite {
    y: number,
    x: number,
    tileIndex: number,
    oamIndex: number,

    // flags
    bgHasPriority: boolean,
    flipX: boolean,
    flipY: boolean,
    dmgPalette: number,
    bank: number,
    cgbPalette: number,
}

export class OamScanner {
    readonly sprites = new SpriteOrderedList();
    private doEvaluate = false;

    private _currentOamIndex = 0;
    get currentOamIndex() {
        return this._currentOamIndex;
    }
    
    private _spritesFoundOnScanline = false;
    get spritesFoundOnScanline() {
        return this._spritesFoundOnScanline;
    }

    constructor(private readonly state: PpuState, private readonly oam: Memory) { }

    reset() {
        this.sprites.clear();
        this._currentOamIndex = 0;
        this._spritesFoundOnScanline = false;
        this.doEvaluate = false;
    }

    tick() {
        if (this.sprites.length < 10) {
            // Only evaluate sprites every other cycle (we evaluate 40 sprites in 80 t-cycles)
            if (this.doEvaluate) {
                this.evaluateSprite();
            }
            this.doEvaluate = !this.doEvaluate;
        }
    }

    private evaluateSprite() {
        const oamIndex = this._currentOamIndex;
        this._currentOamIndex += 4;

        if (this.state.dmaActive) {
            return;
        }

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
                bgHasPriority: (flags & 0x80) !== 0,
                flipY: (flags & 0x40) !== 0,
                flipX: (flags & 0x20) !== 0,
                dmgPalette: (flags & 0x10) >> 4,
                bank: (flags & 0x8) >> 3,
                cgbPalette: flags & 0x7,
                oamIndex
            });

            this._spritesFoundOnScanline = true;
        }     
    }
}
