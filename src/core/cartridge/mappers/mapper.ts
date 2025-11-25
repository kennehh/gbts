import { CartridgeHeader } from "../header/cartridge-header";
import { createMemory } from "../../memory/memory";
import type { IMapper } from "./types";
import type { Memory } from "@/core/memory";

export abstract class Mapper implements IMapper {
    protected readonly cartHeader: CartridgeHeader;
    readonly rom: Memory;
    readonly ram: Memory;

    constructor(cartHeader: CartridgeHeader, rom: Uint8Array, ram: Uint8Array | null) {
        this.rom = createMemory(rom);
        if (ram === null) {
            this.ram = createMemory(cartHeader.ram.size);
            this.ram.fill(0xff);
        } else {
            this.ram = createMemory(ram);
        }
        this.cartHeader = cartHeader;
    }

    abstract readRom(address: number): number;
    abstract writeRom(address: number, value: number): void
    abstract readRam(address: number): number;
    abstract writeRam(address: number, value: number): void;
}
