import {
    type StatInterruptSourceFlagValue,
    StatInterruptSourceFlag,
    type PpuStatusValue,
    PpuStatus
} from "./types";

export class PpuState {
    // Registers
    ly = 0;
    lyc = 0;
    scx = 0;
    scy = 0;
    wx = 0;
    wy = 0;
    bgp = 0;
    obp0 = 0;
    obp1 = 0;
    dma = 0;

    // Palette lookups
    readonly bgpLookup = new Uint8Array(4);
    readonly obp0Lookup = new Uint8Array(4);
    readonly obp1Lookup = new Uint8Array(4);

    // STAT register
    statInterruptSource: StatInterruptSourceFlagValue = StatInterruptSourceFlag.None;
    pendingLcdStatInterrupt = false;
    status: PpuStatusValue = PpuStatus.HBlank;

    get lyCoincidence(): boolean {
        return this.ly === this.lyc;
    }

    get stat(): number {
        const lyCoincidenceBit = this.lyCoincidence ? 1 : 0;
        return 1 << 7 | this.statInterruptSource | (lyCoincidenceBit << 2) | this.status;
    }

    set stat(value: number) {
        this.statInterruptSource = value & 0b01111000;
        // LyCompareFlag and status are read-only
    }

    // LCDC register
    private _lcdc = 0;    
    get lcdc(): number { return this._lcdc; }
    set lcdc(value: number) {
        this._lcdc = value & 0xff;
        this.bgWindowEnable =               (value & 0b0000_0001) !== 0;
        this.spriteEnable =                 (value & 0b0000_0010) !== 0;
        this.spriteHeight =                 (value & 0b0000_0100) !== 0 ? 16 : 8;
        this.bgTileMapAddress =             (value & 0b0000_1000) !== 0 ? 0x9C00 : 0x9800;
        this.useBgWindow8000AdressingMode = (value & 0b0001_0000) !== 0;
        this.windowEnabled =                (value & 0b0010_0000) !== 0;
        this.windowTileMapAddress =         (value & 0b0100_0000) !== 0 ? 0x9C00 : 0x9800;
        this.lcdEnabled =                   (value & 0b1000_0000) !== 0;
    }

    bgWindowEnable = false;
    spriteEnable = false;
    spriteHeight = 8;
    bgTileMapAddress = 0x9800;
    useBgWindow8000AdressingMode = false;
    windowEnabled = false;
    windowTileMapAddress = 0x9800;
    lcdEnabled = false;

    // Internal states

    drawingInitialScanlineDelay = 0;
    firstFrameAfterLcdEnable = false;

    previousStatus: PpuStatusValue = PpuStatus.HBlank;
    dmaActive = false;

    scanlineReachedWindow = false;
    windowLineCounter = 0;
    scanline = 0;

    tCycles = 0;

    // CGB only
    isCgb = false;
    isDoubleSpeed = false;

    reset() {
        this.scanline = 0;
        this.ly = 0;
        this.lyc = 0;
        this.scx = 0;
        this.scy = 0;
        this.wx = 0;
        this.wy = 0;
        this.bgp = 0xfc;
        this.obp0 = 0xff;
        this.obp1 = 0xff;
        this.dma = 0;
        this.lcdc = 0x91;
        this.stat = 0;
        this.status = PpuStatus.HBlank;
        this.previousStatus = PpuStatus.HBlank;
        this.statInterruptSource = StatInterruptSourceFlag.None;
        this.pendingLcdStatInterrupt = false;
        this.dmaActive = false;
        this.scanlineReachedWindow = false;
        this.windowLineCounter = 0;
        this.tCycles = 0;
        this.drawingInitialScanlineDelay = 0;

        this.isCgb = false;
        this.isDoubleSpeed = false;
    }

    updateBgp(bgp: number) {
        this.updatePaletteLookup(this.bgpLookup, this.bgp, bgp);
        this.bgp = bgp;
    }
    updateObp0(obp0: number) {
        this.updatePaletteLookup(this.obp0Lookup, this.obp0, obp0);
        this.obp0 = obp0;
    }
    updateObp1(obp1: number) {
        this.updatePaletteLookup(this.obp1Lookup, this.obp1, obp1);
        this.obp1 = obp1;
    }

    private updatePaletteLookup(lookup: Uint8Array, oldValue: number, newValue: number) {
        if (oldValue === newValue) {
            return;
        }
        for (let i = 0; i < 4; i++) {
            lookup[i] = (newValue >> (i << 1)) & 0b11;
        }
    }
}