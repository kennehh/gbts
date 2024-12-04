import { IMapper } from "./mapper";

export abstract class MbcBase implements IMapper {
    protected rom: Uint8Array;
    protected ram: Uint8Array;

    protected abstract get currentRomBank(): number;
    protected abstract get currentRamBank(): number;
    protected abstract get ramEnabled(): boolean;

    protected static readonly ROM_BANK_SIZE = 0x4000;
    protected static readonly RAM_BANK_SIZE = 0x2000;

    constructor(rom: Uint8Array, ramSize: number) {
        this.rom = rom;
        this.ram = new Uint8Array(ramSize);
    }

    get canUseRam(): boolean {
        return this.ramEnabled && this.ram.length > 0;
    }

    readRom(address: number): number {
        if (address <= 0x3FFF) {
            return this.readFixedRomBank(address);
        } else {
            return this.readSwitchableRomBank(address, MbcBase.ROM_BANK_SIZE);
        }
    }

    writeRom(address: number, value: number): void {
        console.warn(`Attempted to write to ROM at address ${address} with value ${value}`);
    }

    readRam(address: number): number {
        if (this.canUseRam) {
            return this.ram[this.getRamAddress(address)];
        }
        return 0xFF;
    }
    
    writeRam(address: number, value: number): void {
        if (this.canUseRam) {
            this.ram[this.getRamAddress(address)] = value;
        }
    }

    protected readFixedRomBank(address: number): number {
        return this.rom[address];
    }

    protected readSwitchableRomBank(address: number, bankSize: number): number {
        const relativeAddress = address - MbcBase.ROM_BANK_SIZE;
        const bankOffset = this.currentRomBank * bankSize;
        return this.rom[bankOffset + relativeAddress];
    }

    private getRamAddress(address: number): number {
        const bankOffset = this.currentRamBank * MbcBase.RAM_BANK_SIZE;
        return bankOffset + address;
    }
}
