import { MbcBase } from "./mbc-base";

export class Mbc5 extends MbcBase {
    private currentLowerRomBank = 1;
    private currentUpperRomBank = 0;
    private _currentRamBank = 0;
    private _ramEnabled = false;

    private rumbleEnabled = false;

    get currentRomBank(): number {
        return (this.currentUpperRomBank << 8) | this.currentLowerRomBank;
    }

    get currentRamBank(): number {
        return this._currentRamBank;
    }

    get ramEnabled(): boolean {
        return this._ramEnabled;
    }

    override writeRom(address: number, value: number): void {
        switch (address & 0xF000) {
            case 0x0000:
            case 0x1000:
                this._ramEnabled = (value & 0x0F) === 0x0A;
                break;
            case 0x2000:
                this.currentLowerRomBank = value;
                break;
            case 0x3000:
                this.currentUpperRomBank = value & 0x01;
                break;
            case 0x4000:
            case 0x5000:
                if (this.cartHeader.type.hasRumble) {
                    this.rumbleEnabled = (value & 0x08) !== 0;
                    this._currentRamBank = value & 0x07;
                }
                if ((address & 0x0100) === 0) {
                    this._currentRamBank = value & 0x0F;
                }
                break;
        }
    }
}
