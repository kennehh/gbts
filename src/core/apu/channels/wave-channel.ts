export class WaveChannel {
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

    writeWaveTable(_address: number, _value: number): void {
    }

    readWaveTable(_address: number): number {
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