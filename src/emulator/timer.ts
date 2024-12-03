import { InterruptManager } from "./interrupt-manager";

export interface ITimer {
    tick(): void;
}

export class Timer implements ITimer {
    constructor(private interruptManager: InterruptManager) {
    }
    tick() {
    }
}