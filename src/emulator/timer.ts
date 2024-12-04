import { InterruptFlag, InterruptManager } from "./interrupt-manager";

export interface ITimer {
    tick(): void;
    readRegister(address: number): number;
    writeRegister(address: number, value: number): void;
}

export class Timer implements ITimer {
    private static readonly TAC_CLOCKS = [1024, 16, 64, 256];
    private static readonly DIV_CLOCK = 256;

    private _tac: number = 0;
    private tima: number = 0;
    private tma: number = 0;
    private div: number = 0;

    private currentTacClock = Timer.TAC_CLOCKS[0];

    private divCycles = 0;
    private timaCycles = 0;
    private isTimerEnabled = false;

    constructor(private interruptManager: InterruptManager) {}

    private get tac(): number {
        return this._tac;
    }

    private set tac(value: number) {
        this._tac = value;
        this.isTimerEnabled = (value & 0b100) !== 0;
        this.currentTacClock = Timer.TAC_CLOCKS[value & 0b11];
        this.timaCycles = 0;
    }

    readRegister(address: number): number {
        switch (address) {
            case 0xFF04:
                return this.div;
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
                this.div = 0;
                this.divCycles = 0;
                break; 
            case 0xFF05: 
                this.tima = value;
                break;
            case 0xFF06: 
                this.tma = value;
                break;
            case 0xFF07: 
                this.tac = value;
                break;
            default:
                throw new Error(`Invalid timer register: ${address.toString(16)}`);
        }
    }

    tick() {
        // Update DIV
        this.divCycles++;
        if (this.divCycles >= Timer.DIV_CLOCK) {
            this.div = (this.div + 1) & 0xFF;
            this.divCycles = 0;
        }

        // Update TIMA
        if (this.isTimerEnabled) {
            this.timaCycles++;
            if (this.timaCycles >= this.currentTacClock) {
                this.tima = (this.tima + 1) & 0xFF;
                this.timaCycles = 0;

                if (this.tima === 0) {
                    this.tima = this.tma;
                    this.interruptManager.requestInterrupt(InterruptFlag.Timer);
                }
            }
        }
    }
}
