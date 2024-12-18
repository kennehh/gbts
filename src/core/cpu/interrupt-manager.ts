export enum InterruptFlag {
    None = 0,
    VBlank = 1 << 0,
    LcdStat = 1 << 1,
    Timer = 1 << 2,
    Serial = 1 << 3,
    Joypad = 1 << 4,
}

export type InterruptWithVector = {
    interrupt: InterruptFlag;
    vector: number;
};

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
        const interrupt = this.currentInterrupt;
        switch (interrupt) {
            case InterruptFlag.VBlank:  return { interrupt: interrupt, vector: 0x40 };
            case InterruptFlag.LcdStat: return { interrupt: interrupt, vector: 0x48 };
            case InterruptFlag.Timer:   return { interrupt: interrupt, vector: 0x50 };
            case InterruptFlag.Serial:  return { interrupt: interrupt, vector: 0x58 };
            case InterruptFlag.Joypad:  return { interrupt: interrupt, vector: 0x60 };
            default: return null;
        }
    }

    get anyInterruptRequested(): boolean {
        return this.currentInterrupt !== InterruptFlag.None;
    }

    requestInterrupt(interrupt: InterruptFlag) {
        this._if |= interrupt;
    }

    clearInterrupt(interrupt: InterruptFlag) {
        this._if &= ~interrupt;
    }
}
