export class WaveChannel {
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

    writeWaveTable(address: number, value: number): void {
    }

    readWaveTable(address: number): number {
        return 0xff;
    }

    tick4() {
    }

    tickLengthCounter() {
    }

    getOutput(): number {
        return 0;
    }
}