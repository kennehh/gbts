export default class SerialController {
    private sb = 0xff;
    private sc = 0x7e;

    readSB(): number {
        return this.sb;
    }

    writeSB(value: number): void {
        this.sb = value;
    }

    readSC(): number {
        return this.sc;
    }

    writeSC(value: number): void {
        this.sc = 0x7e | (value & 0x81);
    }
}
