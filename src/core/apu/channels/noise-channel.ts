export class NoiseChannel {
    get isEnabled(): boolean {
        return false;
    }
    reset(): void {
    }
    readRegister(address: number): number {
        return 0xff;
    }
    writeRegister(address: number, value: number): void {
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