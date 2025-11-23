import { Memory } from "../../memory/memory";

export interface IMapper {
    readonly rom: Memory;
    readonly ram: Memory;
    readRom(address: number): number;
    writeRom(address: number, value: number): void
    readRam(address: number): number;
    writeRam(address: number, value: number): void;
}
