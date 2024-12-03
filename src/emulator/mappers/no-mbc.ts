import { IMapper } from "./mapper";

export class NoMbc implements IMapper {
    constructor(private rom: Uint8Array) {}

    readRom(address: number): number {
        return this.rom[address];
    }
    writeRom(address: number, value: number): void {
        console.warn(`Attempted to write to ROM at address ${address} with value ${value}`);
    }
    readRam(address: number): number {
        console.warn(`Attempted to read from RAM at address ${address}`);
        return 0xFF;
    }
    writeRam(address: number, value: number): void {
        console.warn(`Attempted to write to RAM at address ${address} with value ${value}`);
    }
}
