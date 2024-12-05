import { InterruptFlag, InterruptManager } from "./interrupt-manager";

export interface ITimer {
    tickMCycle(): void;
    readRegister(address: number): number;
    writeRegister(address: number, value: number): void;
}
export class Timer implements ITimer {
    private div = 0; // 16-bit internal divider register
    private tima = 0;
    private tma = 0;
    private tac = 0;

    private timaOverflowPending = false;
    private timerEnabled = false;
    private selectedBit = this.getSelectedBit(0);

    constructor(private interruptManager: InterruptManager) {
    }

    tickMCycle() {
        const prevDiv = this.div;
        this.div = (this.div + 4) & 0xFFFF;
        if (this.timaOverflowPending) {
            this.timaOverflowPending = false;
            this.tima = this.tma;
            this.interruptManager.requestInterrupt(InterruptFlag.Timer);
            return;
        }
        if (!this.timerEnabled) {
            return;
        }
        const prevBit = this.getBit(prevDiv, this.selectedBit);
        const currentBit = this.getBit(this.div, this.selectedBit);
        if (prevBit && !currentBit) {
            this.incrementTima();
        }
    }

    readRegister(address: number): number {
        switch (address) {
            case 0xFF04:
                return (this.div >> 8) & 0xFF;
            case 0xFF05:
                return this.tima;
            case 0xFF06:
                return this.tma;
            case 0xFF07:
                return this.tac;
            default:
                throw new Error(`Invalid timer register: ${address.toString(16)}`);
        }
    }

    writeRegister(address: number, value: number): void {
        switch (address) {
            case 0xFF04:
                if (!this.timerEnabled) {
                    this.div = 0;
                } else {
                    const oldBit = this.getBit(this.div, this.selectedBit);
                    this.div = 0;
                    if (oldBit) {
                        this.incrementTima();
                    }
                }
                break; 
            case 0xFF05:
                this.timaOverflowPending = false;
                this.tima = value;
                break;
            case 0xFF06: 
                this.tma = value;
                break;
            case 0xFF07: 
                this.setTac(value);
                break;
            default:
                throw new Error(`Invalid timer register: ${address.toString(16)}`);
        }
    }

    private setTac(value: number) {
        const oldEnabled = this.timerEnabled;
        const oldSelectedBit = this.selectedBit;
        const oldResult = oldEnabled && this.getBit(this.div, oldSelectedBit);
        this.tac = value & 0x7;
        this.timerEnabled = (value & 0x4) !== 0;
        this.selectedBit = this.getSelectedBit(this.tac);
        const newResult = this.timerEnabled && this.getBit(this.div, this.selectedBit);
        this.timaOverflowPending = false;
        if (oldResult && !newResult) {
            this.incrementTima();
        }
    }

    private incrementTima() {
        if (this.tima === 0xFF) {
            this.tima = 0;
            this.timaOverflowPending = true;
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
}
