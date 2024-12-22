export class Apu {
    readRegister(address: number): number {
        switch (address) {
            case 0xff26:
                // NR52
                return 0b11110000;
        }
        return 0xff;
    }

    writeRegister(address: number, value: number): void {
        
    }

    readWavRam(address: number): number {
        return 0xff;
    }

    writeWavRam(address: number, value: number): void {
        
    }
}