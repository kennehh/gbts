export class NoiseChannel {
    get isEnabled(): boolean {
        return false;
    }
    reset(): void {
    }
    readRegister(_address: number): number {
        return 0xff;
    }
    writeRegister(_address: number, _value: number): void {
    }

    tick4() {
    }

    tickLengthCounter() {
    }

    tickVolumeEnvelope() {
    }

    getOutput(): number {
        return 0;
    }
}