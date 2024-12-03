export enum InterruptFlag {
    None = 0,
    VBlank = 1 << 0,
    LCDStat = 1 << 1,
    Timer = 1 << 2,
    Serial = 1 << 3,
    Joypad = 1 << 4,
}

export class InterruptManager {
    ime: boolean = false;
    private _ie: InterruptFlag = InterruptFlag.None;
    private _if: InterruptFlag = InterruptFlag.None;

    constructor() {}

    get ie(): number {
        return this._ie;
    }

    set ie(value: number) {
        this._ie = value & 0x1f;
    }

    get if(): number {
        return this._if;
    }

    set if(value: number) {
        this._if = value & 0x1f;
    }

    get currentInterrupt(): InterruptFlag {
        return (this.ie & this.if & 0x1f) as InterruptFlag;
    }

    get currentInterruptVector(): number {
        return 0x40 | (this.currentInterrupt as number) << 3;
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
