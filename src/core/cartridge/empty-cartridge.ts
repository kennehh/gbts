import { ICartridge } from "./cartridge";

export class EmptyCartridge implements ICartridge {
    private static instance: EmptyCartridge;

    private constructor() {}

    static getInstance(): EmptyCartridge {
        if (!EmptyCartridge.instance) {
            EmptyCartridge.instance = new EmptyCartridge();
        }
        return EmptyCartridge.instance;
    }

    readRom(_address: number): number {
        return 0xFF;
    }
    writeRom(_address: number, _value: number): void {
        // Do nothing
    }
    readRam(_address: number): number {
        return 0xFF;
    }
    writeRam(_address: number, _value: number): void {
        // Do nothing
    }
    reset(): void {
        // Do nothing
    }
}