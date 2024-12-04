import { Mapper } from "./mapper";

export abstract class MbcBase extends Mapper {
    protected abstract get currentRomBank(): number;
    protected abstract get currentRamBank(): number;
    protected abstract get ramEnabled(): boolean;

    protected static readonly ROM_BANK_SIZE = 0x4000;
    protected static readonly ROM_BANK_MASK = 0x3FFF;

    protected static readonly RAM_BANK_SIZE = 0x2000;
    protected static readonly RAM_BANK_MASK = 0x1FFF;

    readRom(address: number): number {
        if (address <= 0x3FFF) {
            return this.readFixedRomBank(address);
        } else {
            return this.readSwitchableRomBank(address);
        }
    }

    writeRom(address: number, value: number): void {
        console.warn(`Attempted to write to ROM at address ${address} with value ${value}`);
    }

    readRam(address: number): number {
        if (this.ramEnabled && this.ram.length > 0) {
            return this.ram.read(this.getRamAddress(address));
        }
        return 0xFF;
    }
    
    writeRam(address: number, value: number): void {
        if (this.ramEnabled && this.ram.length > 0) {
            this.ram.write(this.getRamAddress(address), value);
        }
    }

    protected readFixedRomBank(address: number): number {
        return this.rom.read(address);
    }

    protected readSwitchableRomBank(address: number): number {
        const addressInBank = address & MbcBase.ROM_BANK_MASK;
        const bankOffset = this.currentRomBank * MbcBase.ROM_BANK_SIZE;
        return this.rom.read(bankOffset + addressInBank);
    }

    private getRamAddress(address: number): number {
        const addressInBank = address & MbcBase.RAM_BANK_MASK;
        const bankOffset = this.currentRamBank * MbcBase.RAM_BANK_SIZE;
        return bankOffset + addressInBank;
    }
}
