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
    #ie: InterruptFlag = InterruptFlag.None;
    #if: InterruptFlag = InterruptFlag.None;

    constructor() {}

    get currentInterrupt(): InterruptFlag {
        return (this.ie & this.if & 0x1f) as InterruptFlag;
    }

    get currentInterruptVector(): number {
        return 0x40 | (this.currentInterrupt as number) << 3;
    }

    get anyInterruptRequested(): boolean {
        return this.currentInterrupt !== InterruptFlag.None;
    }

    get ie(): number {
        return this.#ie;
    }

    set ie(value: number) {
        this.#ie = value & 0x1f;
    }

    get if(): number {
        return this.#if;
    }

    set if(value: number) {
        this.#if = value & 0x1f;
    }

    requestInterrupt(interrupt: InterruptFlag) {
        this.#if |= interrupt;
    }

    clearInterrupt(interrupt: InterruptFlag) {
        this.#if &= ~interrupt;
    }
}
