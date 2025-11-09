import { IAudioOutput } from "./audio-output";
import { NoiseChannel } from "./channels/noise-channel";
import { SquareChannel } from "./channels/square-channel";
import { SquareWithSweepChannel } from "./channels/square-with-sweep-channel";
import { WaveChannel } from "./channels/wave-channel";
import { FrameSequencer } from "./frame-sequencer";
import { Mixer } from "./mixer";

export class Apu {
    private audioEnabled = true;
    private readonly mixer = new Mixer();
    private readonly channel1 = new SquareWithSweepChannel();
    private readonly channel2 = new SquareChannel();
    private readonly channel3 = new WaveChannel();
    private readonly channel4 = new NoiseChannel();
    private readonly frameSequencer = new FrameSequencer();

    constructor(private readonly audioOutput: IAudioOutput) {
    }

    writeRegister(address: number, value: number): void {
        switch ((address >> 4) & 0xf) {
            case 1: this.channel1.writeRegister(address, value); break;
            case 2: this.channel2.writeRegister(address, value); break;
            case 3: this.channel3.writeRegister(address, value); break;
            case 4: this.channel4.writeRegister(address, value); break;
            case 5: this.writeControlRegister(address, value); break;
            default: throw new Error(`Invalid APU register address: ${address.toString(16)}`);
        }
    }

    readRegister(address: number): number {
        switch ((address >> 4) & 0xf) {
            case 1: return this.channel1.readRegister(address);
            case 2: return this.channel2.readRegister(address);
            case 3: return this.channel3.readRegister(address);
            case 4: return this.channel4.readRegister(address);
            case 5: return this.readControlRegister(address);
            default: throw new Error(`Invalid APU register address: ${address.toString(16)}`);
        }
    }

    writeWaveTable(address: number, value: number): void {
        this.channel3.writeWaveTable(address, value);
    }

    readWaveTable(address: number): number {
        return this.channel3.readWaveTable(address);
    }

    tick4() {
        this.channel1.tick4();
        this.channel2.tick4();
        this.channel3.tick4();
        this.channel4.tick4();

        if (this.frameSequencer.tick4()) {
            switch (this.frameSequencer.currentStep) {
                case 0:
                    this.clockLengthCounter();
                    break;
                case 2:
                    this.clockLengthCounter();
                    this.clockSweep();
                    break;
                case 4:
                    this.clockLengthCounter();
                    break;
                case 6:
                    this.clockLengthCounter();                    
                    this.clockSweep();
                    break;
                case 7:
                    this.clockVolumeEnvelope();
                    break;
            }
        }

       const [left, right] = this.mixer.mix(this.channel1.getOutput(), this.channel2.getOutput(), this.channel3.getOutput(), this.channel4.getOutput());
       this.audioOutput.pushSample(left, right);
    }

    reset() {
        this.mixer.reset();
        this.channel1.reset();
        this.channel2.reset();
        this.channel3.reset();
        this.channel4.reset();
        this.frameSequencer.reset();
    }

    private writeControlRegister(address: number, value: number): void {
        switch (address & 0xf) {
            case 0: this.mixer.nr50 = value & 0xff; break;
            case 1: this.mixer.nr51 = value & 0xff; break;
            case 2: this.audioEnabled = (value & 0b10000000) !== 0; break;
        }
    }

    private readControlRegister(address: number): number {
        switch (address & 0xf) {
            case 0: return this.mixer.nr50;
            case 1: return this.mixer.nr51;
            case 2: return (this.audioEnabled       ? 0b10000000 : 0) |
                                                      0b01110000      |
                           (this.channel4.isEnabled ? 0b00001000 : 0) |
                           (this.channel3.isEnabled ? 0b00000100 : 0) |
                           (this.channel2.isEnabled ? 0b00000010 : 0) |
                           (this.channel1.isEnabled ? 0b00000001 : 0);
            default: return 0xff;
        }
    }

    private clockLengthCounter() {
        this.channel1.clockLengthCounter();
        this.channel2.clockLengthCounter();
        this.channel3.tickLengthCounter();
        this.channel4.tickLengthCounter();
    }

    private clockVolumeEnvelope() {
        this.channel1.clockVolumeEnvelope();
        this.channel2.clockVolumeEnvelope();
        this.channel4.tickVolumeEnvelope();
    }

    private clockSweep() {
        this.channel1.tickSweep();
    }
}