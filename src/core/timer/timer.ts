import { InterruptFlag, InterruptManager } from "../cpu/interrupt-manager";

const enum TimaReloadState {
    None = 0,
    Reloading = 1,
    Reloaded = 2
}

export class Timer {
    private div = 0;
    private tima = 0;
    private tma = 0;
    private tac = 0;
    private timerEnabled = false;
    private selectedBit = this.getSelectedBit(0);

    private timaReloadState = TimaReloadState.None;
    private lastDivBitAndEnabled = false;

    constructor(private interruptManager: InterruptManager) {
        this.reset();
    }

    reset(bootRomLoaded: boolean = false): void {
        this.div = bootRomLoaded ? 0 : 0xac00;
        this.tima = 0;
        this.tma = 0;
        this.tac = 0;
        this.timerEnabled = false;
        this.selectedBit = this.getSelectedBit(0);
        this.timaReloadState = TimaReloadState.None;
        this.lastDivBitAndEnabled = false;
    }

    tickMCycle() {
        if (this.timaReloadState !== TimaReloadState.None) {
            if (this.timaReloadState === TimaReloadState.Reloading) {
                this.tima = this.tma;
                this.interruptManager.requestInterrupt(InterruptFlag.Timer);
                this.timaReloadState = TimaReloadState.Reloaded;
            } else {
                this.timaReloadState = TimaReloadState.None;
            }
        }

        this.setDiv(this.div + 4);
    }

    readRegister(address: number): number {
        switch (address) {
            case 0xFF04: return (this.div >> 8) & 0xFF;
            case 0xFF05: return this.tima;
            case 0xFF06: return this.tma;
            case 0xFF07: return this.tac;
            default: throw new Error(`Invalid timer register: ${address.toString(16)}`);
        }
    }

    writeRegister(address: number, value: number): void {
        switch (address) {
            case 0xFF04: this.setDiv(0);      break; 
            case 0xFF05: this.setTima(value); break;
            case 0xFF06: this.setTma(value);  break;
            case 0xFF07: this.setTac(value);  break;
            default: throw new Error(`Invalid timer register: ${address.toString(16)}`);
        }
    }

    private setTac(value: number) {
        this.tac = 0b11111000 | value;
        this.handleTimaFallingEdge();
    }

    private setDiv(value: number) {
        this.div = value & 0xFFFF;
        this.handleTimaFallingEdge();
    }

    private setTima(value: number) {
        if (this.timaReloadState !== TimaReloadState.Reloaded) {
            this.tima = value;
            this.timaReloadState = TimaReloadState.None;
        }
    }

    private setTma(value: number) {
        if (this.timaReloadState === TimaReloadState.Reloaded) {
            this.tima = value;
        }
        this.tma = value;
    }

    private incrementTima() {
        if (this.tima === 0xFF) {
            this.tima = 0;
            this.timaReloadState = TimaReloadState.Reloading;
        } else {
            this.tima++;
        }
    }

    private getSelectedBit(value: number): number {
        switch (value & 0x3) {
            default:
            case 0: return 9; // 4096 Hz
            case 1: return 3; // 262144 Hz
            case 2: return 5; // 65536 Hz
            case 3: return 7; // 16384 Hz
        }
    }

    private getBit(value: number, bit: number): boolean {
        return (value & (1 << bit)) !== 0;
    }

    private handleTimaFallingEdge() {
        this.timerEnabled = (this.tac & 0x4) !== 0;
        this.selectedBit = this.getSelectedBit(this.tac);
        const newAndResult = this.timerEnabled && this.getBit(this.div, this.selectedBit);
        if (this.lastDivBitAndEnabled && !newAndResult) {
            this.incrementTima();
        }
        this.lastDivBitAndEnabled = newAndResult;
    }
}
