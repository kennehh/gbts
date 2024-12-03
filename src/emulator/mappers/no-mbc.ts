import Mapper from "./mapper";

export class NoMbc extends Mapper {
    readRom(address: number): number {
        return this.rom[address];
    }
    writeRom(address: number, value: number): void {
        throw new Error("Method not implemented.");
    }
    readRam(address: number): number {
        throw new Error("Method not implemented.");
    }
    writeRam(address: number, value: number): void {
        throw new Error("Method not implemented.");
    }
}