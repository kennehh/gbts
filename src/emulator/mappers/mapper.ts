export default abstract class Mapper {
    constructor(protected rom: Uint8Array, protected ram: Uint8Array) {        
    }
    abstract readRom(address: number): number;
    abstract writeRom(address: number, value: number): void;
    abstract readRam(address: number): number;
    abstract writeRam(address: number, value: number): void;
}