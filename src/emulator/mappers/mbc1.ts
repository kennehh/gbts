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
        return this.bankingMode ? this._currentRamBank : 0;
    }

    protected get ramEnabled(): boolean {
        return this._ramEnabled;
    }

    override writeRom(address: number, value: number): void {
        switch (address >> 12) {
            case 0x0:
            case 0x1:
                // RAM Enable
                this._ramEnabled = (value & 0x0F) === 0x0A;
                break;
            case 0x2:
            case 0x3:
                const bankNumber = value & 0x1F; 
                this.currentLowerRomBank = bankNumber === 0 ? 1 : bankNumber;
                console.log(`Switched to ROM bank ${this.currentLowerRomBank} (lower: ${bankNumber} upper: ${this.currentUpperRomBank})`);
                break;
            case 0x4:
            case 0x5:
                if (this.cartHeader.rom.size >= (1024 * 1024)) {                    
                    this.currentUpperRomBank = value & 0x03;
                    console.log(`Switched to ROM bank ${this.currentUpperRomBank} (lower: ${this.currentLowerRomBank} upper: ${this.currentUpperRomBank})`);
                } else if (this.cartHeader.ram.size >= (32 * 1024)) {
                    this._currentRamBank = value & 0x03;
                }
                break;
            case 0x6:
            case 0x7:
                if (this.cartHeader.ram.size > (8 * 1024) || this.cartHeader.rom.size > (512 * 1024)) {
                    // 00 = Simple Banking Mode (default): 0000–3FFF and A000–BFFF locked to bank 0 of ROM/ RAM
                    // 01 = RAM Banking Mode / Advanced ROM Banking Mode: 0000–3FFF and A000–BFFF can be bank-switched via the 4000–5FFF bank register
                    this.bankingMode = (value & 0x01) === 0x01;
                }
                break;
            default:
                throw new Error(`Invalid MBC1 ROM address: ${address.toString(16)}`);
        }
    }

    override readFixedRomBank(address: number): number {
        const addressInBank = address & MbcBase.ROM_BANK_MASK;

        if (this.bankingMode && this.cartHeader.rom.size >= (1024 * 1024)) {
            const bank = this.currentUpperRomBank << 5;
            const bankOffset = bank * MbcBase.ROM_BANK_SIZE;
            return this.rom.read(bankOffset + addressInBank);
        }

        return this.rom.read(addressInBank);
    }
}