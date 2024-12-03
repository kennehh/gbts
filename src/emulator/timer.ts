import { InterruptManager } from "./interrupt-manager";

export interface ITimer {
    tick(): void;
    readRegister(address: number): number;
    writeRegister(address: number, value: number): void;
}

export class Timer implements ITimer {
    constructor(private interruptManager: InterruptManager) {
    }
    readRegister(address: number): number {
        throw new Error("Method not implemented.");
    }
    writeRegister(address: number, value: number): void {
        throw new Error("Method not implemented.");
    }
    tick() {
    }
}