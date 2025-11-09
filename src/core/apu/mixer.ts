export class Mixer {
    // NR51
    private _nr51 = 0xff;
    get nr51(): number { return this._nr51; }
    set nr51(value: number) {
        this.ch4LeftEnabled  = (value & 0b10000000) !== 0;
        this.ch3LeftEnabled  = (value & 0b01000000) !== 0;
        this.ch2LeftEnabled  = (value & 0b00100000) !== 0;
        this.ch1LeftEnabled  = (value & 0b00010000) !== 0;
        this.ch4RightEnabled = (value & 0b00001000) !== 0;
        this.ch3RightEnabled = (value & 0b00000100) !== 0;
        this.ch2RightEnabled = (value & 0b00000010) !== 0;
        this.ch1RightEnabled = (value & 0b00000001) !== 0;
    }

    private ch1LeftEnabled = true;
    private ch2LeftEnabled = true;
    private ch3LeftEnabled = true;
    private ch4LeftEnabled = true;
    private ch1RightEnabled = true;
    private ch2RightEnabled = true;
    private ch3RightEnabled = true;
    private ch4RightEnabled = true;

    // NR50
    private _nr50 = 0x77;
    get nr50(): number { return this._nr50; }
    set nr50(value: number) {
        this.vinPanLeft =  (value & 0b10000000) !== 0;
        this.leftVolume =  (value & 0b01110000) >> 4;
        this.vinPanRight = (value & 0b00001000) !== 0;
        this.rightVolume = (value & 0b00000111);
    }

    private vinPanLeft = false;
    private leftVolume = 0b111;
    private vinPanRight = false;
    private rightVolume = 0b111;

    private leftCapacitor = 0;
    private rightCapacitor = 0;

    constructor(
        private readonly capacitorFactor = 0.999958 // CGB: change this to 0.998943
    ) {}

    mix(ch1: number, _ch2: number, ch3: number, ch4: number): [number, number] {
        let left = 0;
        let right = 0;

        if (this.ch1LeftEnabled) {
            left += ch1;
        }
        // if (this.ch2LeftEnabled) {
        //     left += ch2;
        // }
        if (this.ch3LeftEnabled) {
            left += ch3;
        }
        if (this.ch4LeftEnabled) {
            left += ch4;
        }

        if (this.ch1RightEnabled) {
            right += ch1;
        }
        // if (this.ch2RightEnabled) {
        //     right += ch2;
        // }
        if (this.ch3RightEnabled) {
            right += ch3;
        }
        if (this.ch4RightEnabled) {
            right += ch4;
        }

        left *= (this.leftVolume + 1);
        right *= (this.rightVolume + 1);

        // left = this.leftHighPassFilter(left);
        // right = this.rightHighPassFilter(right);

        // Convert to -1 to 1 range for audio output
        // 4 channels * 8 volume = 32
        return [left / 32, right / 32];
    }

    private leftHighPassFilter(input: number): number {
        const out = input - this.leftCapacitor;
        this.leftCapacitor = (input - out) * this.capacitorFactor;
        return out;
    }

    private rightHighPassFilter(input: number): number {
        const out = input - this.rightCapacitor;
        this.rightCapacitor = (input - out) * this.capacitorFactor;
        return out;
    }

    reset() {
        this.nr50 = 0x77;
        this.nr51 = 0xff;
    }
}