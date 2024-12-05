import { Mapper } from "./mapper";

export class NoMbc extends Mapper {
    readRom(address: number): number {
        return this.rom.read(address);
    }
    
    writeRom(address: number, value: number): void { }

    readRam(address: number): number { 
        return 0xFF; 
    }

    writeRam(address: number, value: number): void {}
}
