import { CartridgeHeader } from "../cartridge-header";
import { MemorySize } from "../../memory/memory";
import { MbcBase } from "./mbc-base";

export class Mbc1 extends MbcBase {
    private currentUpperRomBank = 0;
    private currentLowerRomBank = 1;
    private _currentRamBank = 0;

    private _ramEnabled = false;

    private zeroBankingMode = false;
    private ramBankingMode = false;

    private isMbc1m = false;

    private upperRomBankShift = 5;
    private lowerRomBankMask = 0x1F;

    constructor(cartHeader: CartridgeHeader, rom: Uint8Array, ram: Uint8Array | null) {
        super(cartHeader, rom, ram);
        
        // Check if this is a MBC1M cartridge
        if (rom.length >= MemorySize.Size256KB) {
            const logo1 = rom.slice(0x104, 0x134);
            const logo2 = rom.slice(0x40104, 0x40134);
            this.isMbc1m = logo1.every((val, i) => val === logo2[i]);
            if (this.isMbc1m) {
                this.upperRomBankShift = 4;
                this.lowerRomBankMask = 0xF;
            }
        }
    }

    protected get currentRomBank(): number {
        return (this.currentUpperRomBank << this.upperRomBankShift) + (this.currentLowerRomBank & this.lowerRomBankMask);
    }

    protected get currentRamBank(): number {
        return this.ramBankingMode ? this._currentRamBank : 0;
    }

    protected get ramEnabled(): boolean {
        return this._ramEnabled;
    }

    override writeRom(address: number, value: number): void {
        switch (address & 0xF000) {
            case 0x0000:
            case 0x1000:
                // RAM Enable
                this._ramEnabled = (value & 0x0F) === 0x0A;
                break;
            case 0x2000:
            case 0x3000:
                const bankNumber = value & 0x1F; 
                this.currentLowerRomBank = bankNumber === 0 ? 1 : bankNumber;
                break;
            case 0x4000:
            case 0x5000:
                if (this.cartHeader.rom.size >= MemorySize.Size1MB) {                    
                    this.currentUpperRomBank = value & 0x03;
                } else if (this.cartHeader.ram.size >= MemorySize.Size32KB) {
                    this._currentRamBank = value & 0x03;
                }
                break;
            case 0x6000:
            case 0x7000:
                if (this.cartHeader.rom.size >= MemorySize.Size1MB) {
                    this.zeroBankingMode = (value & 0x01) === 0x01;
                } else if (this.cartHeader.ram.size >= MemorySize.Size32KB) {
                    this.ramBankingMode = (value & 0x01) === 0x01;
                }
                break;
            default:
                throw new Error(`Invalid MBC1 ROM address: ${address.toString(16)}`);
        }
    }   

    override readFixedRomBank(address: number): number {
        if (this.zeroBankingMode) {
            const bank = this.currentUpperRomBank << this.upperRomBankShift;
            const bankOffset = bank * MbcBase.ROM_BANK_SIZE;
            return this.rom.read(bankOffset + address);
        }

        return this.rom.read(address);
    }
}
