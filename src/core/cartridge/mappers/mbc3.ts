import { MbcBase } from "./mbc-base";

type RtcRegisters = {
    seconds: number;
    minutes: number;
    hours: number;  
    days: number;

    daysLow: number;

    // control
    control: number;
    daysHigh: number;
    halt: boolean;
    dayCarry: boolean;
}

enum RtcRegister {
    None = 0x00,
    Seconds = 0x08,
    Minutes = 0x09,
    Hours = 0x0A,
    DaysLow = 0x0B,
    DaysHighControl = 0x0C
}

export class Mbc3 extends MbcBase {
    private romBankNumber = 1;
    private ramBankNumber = 0;
    private ramAndTimerEnabled = false;

    private isRtcSelected = false;

    private lastRtcUpdate = performance.now();
    private subsecondProgress = 0;

    private currentRtcRegister = RtcRegister.None;
    private rtcLatchPending = false;
    private latchedRtc: RtcRegisters | null = null;
    private rtc: RtcRegisters = {
        seconds: 0,
        minutes: 0,
        hours: 0,
        days: 0,

        daysLow: 0,

        // control
        control: 0,
        daysHigh: 0,
        halt: false,
        dayCarry: false
    };

    protected get currentRomBank(): number {
        return this.romBankNumber;
    }

    protected get currentRamBank(): number {
        return this.ramBankNumber;
    }

    protected get ramEnabled(): boolean {
        return this.ramAndTimerEnabled;
    }

    override writeRom(address: number, value: number): void {
        switch (address & 0xF000) {
            case 0x0000:
            case 0x1000:
                // RAM and Timer Enable
                this.ramAndTimerEnabled = (value & 0x0F) === 0x0A;
                break;
            case 0x2000:
            case 0x3000:
                this.romBankNumber = value === 0 ? 1 : value & 0x7F;
                break;
            case 0x4000:
            case 0x5000:
                if (value <= 0x03) {
                    this.ramBankNumber = value;
                    this.isRtcSelected = false;
                } else if (value >= 0x08 && value <= 0x0C) {
                    this.isRtcSelected = true;
                    this.currentRtcRegister = value;
                }
                break;
            case 0x6000:
            case 0x7000:
                if (value === 0x00) {
                    this.rtcLatchPending = true;
                } else if (value === 0x01) {
                    this.latchRtc();
                    this.rtcLatchPending = false;
                } else {
                    this.rtcLatchPending = false;
                }
                break;
        }
    }

    override readRam(address: number): number {
        if (this.ramEnabled && this.isRtcSelected) {
            return this.readRtcRegister();
        }
        return super.readRam(address);
    }

    override writeRam(address: number, value: number): void {
        if (this.ramEnabled && this.isRtcSelected) {
            this.writeRtcRegister(value);
        } else {
            super.writeRam(address, value);
        }
    }  

    private readRtcRegister(): number {
        if (this.latchedRtc == null) {
            return 0xff;
        }

        switch (this.currentRtcRegister) {
            case RtcRegister.Seconds:
                return this.latchedRtc.seconds & 0x3f;
            case RtcRegister.Minutes:
                return this.latchedRtc.minutes & 0x3f;
            case RtcRegister.Hours:
                return this.latchedRtc.hours & 0x1f;
            case RtcRegister.DaysLow:
                return this.latchedRtc.daysLow & 0xff;
            case RtcRegister.DaysHighControl:
                return this.latchedRtc.control & 0xff;
            default:
                return 0xff;
        }
    }

    private writeRtcRegister(value: number) {
        switch (this.currentRtcRegister) {
            case RtcRegister.Seconds:
                value &= 0x3F;
                this.rtc.seconds = value;
                this.subsecondProgress = 0;
                break;
            case RtcRegister.Minutes:
                value &= 0x3F;
                this.rtc.minutes = value;
                break;
            case RtcRegister.Hours:
                value &= 0x1F;
                this.rtc.hours = value;
                break;
            case RtcRegister.DaysLow:
                value &= 0xff;
                this.rtc.daysLow = value;
                this.rtc.days = this.rtc.daysHigh << 8 | this.rtc.daysLow;
                break;
            case RtcRegister.DaysHighControl:
                value &= 0b1100_0001;
                const oldHalt = this.rtc.halt;

                this.rtc.control = value;
                this.rtc.daysHigh = value & 0x01;
                this.rtc.days = this.rtc.daysHigh << 8 | this.rtc.daysLow;
                this.rtc.halt = (value & 0x40) === 0x40;        
                this.rtc.dayCarry = (value & 0x80) === 0x80;

                if (!oldHalt && this.rtc.halt) {
                    // Halting - save progress
                    const now = performance.now();
                    const msSinceLastUpdate = now - this.lastRtcUpdate;
                    this.subsecondProgress = (this.subsecondProgress + msSinceLastUpdate) % 1000;
                }
                
                break;
        }
    }

    private latchRtc() {
        this.updateRtc();
        this.latchedRtc = { ...this.rtc };
    }

    private updateRtc() {
        if (this.rtc.halt) {
            return;
        }
        
        const now = performance.now();
        const msSinceLastUpdate = now - this.lastRtcUpdate;
        const totalMs = this.subsecondProgress + msSinceLastUpdate;

        this.subsecondProgress = totalMs % 1000;
        this.lastRtcUpdate = now;

        const secondsElapsed = Math.floor(totalMs / 1000);
        if (secondsElapsed <= 0) {
            return;
        }

        // Update seconds
        const totalSeconds = this.rtc.seconds + secondsElapsed;
        this.rtc.seconds = totalSeconds % 60;
        let overflow = Math.floor(totalSeconds / 60);

        // Update minutes
        const totalMinutes = this.rtc.minutes + overflow;
        this.rtc.minutes = totalMinutes % 60;
        overflow = Math.floor(totalMinutes / 60);

        // Update hours
        const totalHours = this.rtc.hours + overflow;
        this.rtc.hours = totalHours % 24;
        overflow = Math.floor(totalHours / 24);

        // Update days
        const totalDays = this.rtc.days + overflow;
        this.rtc.days = totalDays & 0x1FF;
        this.rtc.daysLow = totalDays & 0xFF;
        this.rtc.daysHigh = (totalDays >> 8) & 0x01;
        this.rtc.dayCarry = totalDays >= 512;
        this.rtc.control = this.rtc.daysHigh | (this.rtc.halt ? 0x40 : 0) | (this.rtc.dayCarry ? 0x80 : 0);
    }
}
