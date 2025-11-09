import { SquareChannel } from "./square-channel";

export class SquareWithSweepChannel extends SquareChannel {
    private sweepPeriod = 0;
    private sweepNegate = false;
    private sweepShift = 0;


    protected override readSweepRegister() {
        const negateBit = this.sweepNegate ? 1 << 3 : 0;
        return 1 << 7 | this.sweepPeriod << 4 | negateBit | this.sweepShift;
    }

    protected override writeSweepRegister(value: number) {
        this.sweepPeriod = (0b01110000 & value) >> 4;
        this.sweepNegate = (0b00001000 & value) !== 0;
        this.sweepShift =   0b00000111 & value;
    }

    override reset() {
        super.reset();
        this.sweepPeriod = 0;
        this.sweepNegate = false;
        this.sweepShift = 0;
    }

    tickSweep() {
    }
}