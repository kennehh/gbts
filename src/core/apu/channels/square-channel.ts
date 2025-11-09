import { LengthCounter } from "../components/length-counter";
import { VolumeEnvelope } from "../components/volume-envelope";

const DUTY_CYCLES = [
    0b10000000,
    0b10000001,
    0b11100001,
    0b01111110
];

export class SquareChannel {
    get isEnabled(): boolean {
        return this.enabled;
    }
    private dacOn = false;
    private enabled = false;
    private duty = 0;
    private currentWaveform: number = DUTY_CYCLES[0];
    private lengthCounter = new LengthCounter(64);
    private volumeEnvelope = new VolumeEnvelope();
    private frequency = 0;
    private frequencyTimer = 0;
    private currentWaveValue = 0;


    readRegister(address: number): number {
        switch (address & 0xf) {
            case 0: // NR10 only
                return this.readSweepRegister();
            case 1: // NR11/NR21
                return (this.duty << 6) | 0b00111111;
            case 2: { // NR12/NR22
                const increaseBit = this.volumeEnvelope.increase ? 1 << 3 : 0;
                return this.volumeEnvelope.startingVolume << 4 | increaseBit | this.volumeEnvelope.period; 
            }
            case 3: // NR13/NR23
                return 0xff; // write-only
            case 4: { // NR14/NR24
                const lengthEnabledBit = this.lengthCounter.enabled ? 1 << 6 : 0;
                return 0b10111111 | lengthEnabledBit;
            }
            default:
                return 0xff;
        }
    }

    writeRegister(address: number, value: number): void {
        switch (address & 0xf) {
            case 0: // NR10 only
                this.writeSweepRegister(value);
                break;
            case 1: // NR11/NR21
                this.duty = (value & 0b11000000) >> 6;
                this.lengthCounter.setLength(value & 0b00111111);
                this.currentWaveform = DUTY_CYCLES[this.duty];
                break;
            case 2: // NR12/NR22
                this.volumeEnvelope.startingVolume = (value & 0b11110000) >> 4;
                this.volumeEnvelope.increase = (value & 0b00001000) !== 0;
                this.volumeEnvelope.period = value & 0b00000111;
                this.dacOn = (value & 0b11111000) !== 0;
                if (!this.dacOn) {
                    this.enabled = false;
                }
                break;
            case 3: // NR13/NR23
                this.frequency = (this.frequency & 0x700) | (value & 0xff);
                break;
            case 4: // NR14/NR24
                this.frequency = ((value & 0b00000111) << 8) | (this.frequency & 0xff)
                this.lengthCounter.enabled = (value & 0b01000000) !== 0;
                if ((value & 0b10000000) !== 0) {
                    this.trigger();
                }
                break;
        }
    }

    reset(): void {
        this.duty = 0;
        this.currentWaveform = DUTY_CYCLES[0];
        this.lengthCounter.reset();
        this.volumeEnvelope.reset();
        this.frequency = 0;
        this.frequencyTimer = 0;
    }

    tick4() {
        if (!this.enabled) {
            return 0;
        }

        this.frequencyTimer -= 4;        
        if (this.frequencyTimer <= 0) {
            this.frequencyTimer = this.calculatePeriod();
            this.duty = (this.duty + 1) & 0x7;
            this.currentWaveValue = this.currentWaveform >> this.duty;
        }
    }

    getOutput() {
        if (!this.enabled) {
            return 0;
        }
        const out = this.currentWaveValue * this.volumeEnvelope.currentVolume;
        return (out / 7.5) - 1
    }

    clockLengthCounter() {
        if (this.lengthCounter.clock()) {
            this.enabled = false;
        }
    }

    clockVolumeEnvelope() {
        this.volumeEnvelope.clock();
    }

    protected readSweepRegister() { return 0xff; }

    protected writeSweepRegister(_value: number) { }

    private trigger() {
        this.enabled = this.dacOn;
        this.frequencyTimer = this.calculatePeriod();
        this.lengthCounter.trigger();
        this.volumeEnvelope.trigger();
    }

    private calculatePeriod() {
        return (2048 - this.frequency) << 2;
    }
}
