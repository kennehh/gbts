import { CartridgeHeader } from "../cartridge-header";
import { MemorySize } from "../memory";
import { MbcBase } from "./mbc-base";

export class Mbc2 extends MbcBase {
    private _currentRomBank = 1;
    private _ramEnabled = false;

    protected get currentRomBank(): number {
        return this._currentRomBank;
    }

    protected get currentRamBank(): number {
        return 0;
    }

    protected get ramEnabled(): boolean {
        return this._ramEnabled;
    }

    override readRam(address: number): number {
        if (this.canAccessRam) {
            return this.get4bitValue(this.ram.read(address));
        }
        return 0xFF;
    }
    
    override writeRam(address: number, value: number): void {
        if (this.canAccessRam) {
            this.ram.write(address, this.get4bitValue(value));
        }
    }
    
    override writeRom(address: number, value: number): void {
        if (address <= 0x3FFF) {
            if ((address & 0x0100) === 0) {
                this._ramEnabled = (value & 0x0F) === 0x0A;
            } else {
                const bankNumber = value & 0x0F;
                this._currentRomBank = bankNumber === 0 ? 1 : bankNumber;
            }
        }
    }

    private get4bitValue(value: number): number {
        return 0xf0 | (value & 0x0F);
    }
}
