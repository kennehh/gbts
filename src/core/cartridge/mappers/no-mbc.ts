import { Mapper } from "./mapper";

export class NoMbc extends Mapper {
    readRom(address: number): number {
        return this.rom.read(address);
    }
    
    writeRom(_address: number, _value: number): void { }

    readRam(_address: number): number { 
        return 0xFF; 
    }

    writeRam(_address: number, _value: number): void {}
}
