import { InterruptFlag, type InterruptFlagValue, type InterruptWithVector } from "./types";

const INTERRUPT_VECTORS = {
    [InterruptFlag.None]:    null,
    [InterruptFlag.VBlank]:  { interrupt: InterruptFlag.VBlank,  vector: 0x40 },
    [InterruptFlag.LcdStat]: { interrupt: InterruptFlag.LcdStat, vector: 0x48 },
    [InterruptFlag.Timer]:   { interrupt: InterruptFlag.Timer,   vector: 0x50 },
    [InterruptFlag.Serial]:  { interrupt: InterruptFlag.Serial,  vector: 0x58 }, 
    [InterruptFlag.Joypad]:  { interrupt: InterruptFlag.Joypad,  vector: 0x60 },
} as const;

export class InterruptManager {
    ime = false;
    private _ie: InterruptFlagValue = InterruptFlag.None;
    private _if: InterruptFlagValue = InterruptFlag.None;

    constructor() {
        this.reset();
    }

    reset() {
        this.ime = false;
        this._ie = InterruptFlag.None;
        this._if = InterruptFlag.None;
    }

    get ie(): number {
        return this._ie;
    }

    set ie(value: number) {
        this._ie = value;
    }

    get if(): number {
        return 0xe0 | this._if;
    }

    set if(value: number) {
        this._if = value & 0x1f;
    }

    get currentInterrupt(): InterruptFlagValue {
        const activeInterrupts = this.if & this.ie & 0x1f;
        return activeInterrupts & -activeInterrupts;
    }

    get currentInterruptWithVector(): InterruptWithVector | null {
        return INTERRUPT_VECTORS[this.currentInterrupt];
    }

    get anyInterruptRequested(): boolean {
        return (this.if & this.ie & 0x1f) !== 0;
    }

    requestInterrupt(interrupt: InterruptFlagValue) {
        this._if |= interrupt;
    }

    clearInterrupt(interrupt: InterruptFlagValue) {
        this._if &= ~interrupt;
    }
}
