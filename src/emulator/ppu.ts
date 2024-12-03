import { InterruptManager } from "./interrupt-manager";

export interface IPpu {
    tick(): void;
    readVram(address: number): number;
    writeVram(address: number, value: number): void;
    readOam(address: number): number;
    writeOam(address: number, value: number): void;
    readRegister(address: number): number;
    writeRegister(address: number, value: number): void;
    dmaTransfer(data: Uint8Array): void;
}

export class Ppu implements IPpu {
    constructor(private interruptManager: InterruptManager) {
    }
    dmaTransfer(data: Uint8Array): void {
        throw new Error("Method not implemented.");
    }
    readRegister(address: number): number {
        throw new Error("Method not implemented.");
    }
    writeRegister(address: number, value: number): void {
        throw new Error("Method not implemented.");
    }
    readVram(address: number): number {
        throw new Error("Method not implemented.");
    }
    writeVram(address: number, value: number): void {
        throw new Error("Method not implemented.");
    }
    readOam(address: number): number {
        throw new Error("Method not implemented.");
    }
    writeOam(address: number, value: number): void {
        throw new Error("Method not implemented.");
    }    
    tick() {
    }
}