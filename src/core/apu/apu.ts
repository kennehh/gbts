export class Apu {
    readRegister(address: number): number {
        switch (address) {
            case 0xff26:
                // NR52
                return 0b11110000;
        }
        return 0xff;
    }

    writeRegister(_address: number, _value: number): void {
        
    }

    readWavRam(_address: number): number {
        return 0xff;
    }

    writeWavRam(_address: number, _value: number): void {
        
    }
}