import { MbcBase } from "./mbc-base";

export class Mbc1 extends MbcBase {
    private currentUpperRomBank = 0;
    private currentLowerRomBank = 1;
    private _currentRamBank = 0;

    private _ramEnabled = false;
    private bankingMode = false;

    protected get currentRomBank(): number {
        return (this.currentUpperRomBank << 5) + this.currentLowerRomBank;
    }

    protected get currentRamBank(): number {
        return this._currentRamBank;
    }

    protected get ramEnabled(): boolean {
        return this._ramEnabled;
    }

    override writeRom(address: number, value: number): void {
        if (address <= 0x1fff) {
            this._ramEnabled = (value & 0x0F) === 0x0A;
        } else if (address <= 0x3fff) {
            const bankNumber = value & 0x1F;
            this.currentLowerRomBank = bankNumber === 0 ? 1 : bankNumber;
        } else if (address <= 0x5fff) {
            if (this.rom.length >= 1024 * 1024) {
                // 1MB ROM
                this.currentUpperRomBank = value & 0x03;
            } else if (this.ram.length >= 32 * 1024) {
                // 32KB RAM
                this._currentRamBank = value & 0x03;
            }
        } else if (address <= 0x7fff) {
            if (this.ram.length > 8 * 1024 || this.rom.length > 512 * 1024) {
                // 8KB RAM or 512KB ROM
                // 00 = Simple Banking Mode (default): 0000–3FFF and A000–BFFF locked to bank 0 of ROM/ RAM
                // 01 = RAM Banking Mode / Advanced ROM Banking Mode: 0000–3FFF and A000–BFFF can be bank-switched via the 4000–5FFF bank register
                this.bankingMode = (value & 0x01) === 0x01;
            }
        } else {
            throw new Error(`Invalid MBC1 ROM address: ${address.toString(16)}`);
        }
    }

    override readFixedRomBank(address: number): number {
        if (this.bankingMode && this.rom.length >= 1024 * 1024) {
            // 1MB ROM
            const bank = this.currentUpperRomBank << 5;
            const bankOffset = bank * MbcBase.ROM_BANK_SIZE;
            return this.rom[bankOffset + address];
        }

         return this.rom[address];
    }
    
}