import { CartridgeHeader } from "./cartridge-header";

export class Cartridge {
    readonly header: CartridgeHeader;

    constructor(private rom: Uint8Array) {
        this.header = new CartridgeHeader(rom);
    }

    read(address: number) {
        return this.rom[address];
    }
    write(address: number, value: number) {
        throw new Error("Method not implemented.");
    }
    reset() {
        throw new Error("Method not implemented.");
    }
    loadBootRom(rom: Uint8Array) {
        throw new Error("Method not implemented.");
    }
    loadCartridge(rom: Uint8Array) {
        throw new Error("Method not implemented.");
    }

}