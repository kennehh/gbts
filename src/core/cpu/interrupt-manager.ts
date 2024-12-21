export enum InterruptFlag {
    None = 0,
    VBlank = 1 << 0,
    LcdStat = 1 << 1,
    Timer = 1 << 2,
    Serial = 1 << 3,
    Joypad = 1 << 4,
}

export type InterruptWithVector = {
    readonly interrupt: InterruptFlag;
    readonly vector: number;
};

const INTERRUPT_VECTORS = {
    [InterruptFlag.None]:    null,
    [InterruptFlag.VBlank]:  { interrupt: InterruptFlag.VBlank,  vector: 0x40 },
    [InterruptFlag.LcdStat]: { interrupt: InterruptFlag.LcdStat, vector: 0x48 },
    [InterruptFlag.Timer]:   { interrupt: InterruptFlag.Timer,   vector: 0x50 },
    [InterruptFlag.Serial]:  { interrupt: InterruptFlag.Serial,  vector: 0x58 }, 
    [InterruptFlag.Joypad]:  { interrupt: InterruptFlag.Joypad,  vector: 0x60 },
} as const;

export class InterruptManager {
    ime: boolean = false;
    private _ie: InterruptFlag = InterruptFlag.None;
    private _if: InterruptFlag = InterruptFlag.None;

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

    get currentInterrupt(): InterruptFlag {
        const activeInterrupts = this.if & this.ie & 0x1f;
        return activeInterrupts & -activeInterrupts;
    }

    get currentInterruptWithVector(): InterruptWithVector | null {
        return INTERRUPT_VECTORS[this.currentInterrupt];
    }

    get anyInterruptRequested(): boolean {
        return (this.if & this.ie & 0x1f) !== 0;
    }

    requestInterrupt(interrupt: InterruptFlag) {
        this._if |= interrupt;
    }

    clearInterrupt(interrupt: InterruptFlag) {
        this._if &= ~interrupt;
    }
}
