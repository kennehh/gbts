export const enum PpuStatus {
    HBlank = 0,
    VBlank = 1,
    OamScan = 2,
    Drawing = 3,
}

export const enum StatInterruptSourceFlag {
    None = 0,
    HBlank = 1 << 3,
    VBlank = 1 << 4,
    Oam = 1 << 5,
    Lcdc = 1 << 6,
}

export class PpuState {
    // Registers
    private _ly: number = 0;
    get ly() { return this._ly; }
    set ly(value: number) { this._ly = value & 0xff; }

    private _lyc: number = 0;
    get lyc() { return this._lyc; }
    set lyc(value: number) { this._lyc = value & 0xff; }

    private _scx: number = 0;
    get scx() { return this._scx; }
    set scx(value: number) { this._scx = value & 0xff; }

    private _scy: number = 0;
    get scy() { return this._scy; }
    set scy(value: number) { this._scy = value & 0xff; }

    private _wx: number = 0;
    get wx() { return this._wx; }
    set wx(value: number) { this._wx = value & 0xff; }

    private _wy: number = 0;
    get wy() { return this._wy; }
    set wy(value: number) { this._wy = value & 0xff; }

    private _bgp: number = 0;
    get bgp() { return this._bgp; }
    set bgp(value: number) { this._bgp = value & 0xff; }

    private _obp0: number = 0;
    get obp0() { return this._obp0; }
    set obp0(value: number) { this._obp0 = value & 0xff; }

    private _obp1: number = 0;
    get obp1() { return this._obp1; }
    set obp1(value: number) { this._obp1 = value & 0xff; }

    private _dma: number = 0;
    get dma() { return this._dma; }
    set dma(value: number) { this._dma = value & 0xff; }

    // STAT register
    statInterruptSource: StatInterruptSourceFlag = StatInterruptSourceFlag.None;
    pendingLcdStatInterrupt = false;
    status: PpuStatus = PpuStatus.HBlank;

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
    private _lcdc: number = 0;
    bgWindowEnable: boolean = false;
    spriteEnable: boolean = false;
    spriteHeight: number = 8;
    bgTileMapAddress: number = 0x9800;
    useBgWindow8000AdressingMode: boolean = false;
    windowEnabled: boolean = false;
    windowTileMapAddress: number = 0x9800;         
    lcdEnabled: boolean = false;

    get lcdc(): number {
        return this._lcdc;
    }

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

    // Internal states

    drawingInitialScanlineDelay: number = 0;
    firstFrameAfterLcdEnable: boolean = false;

    previousStatus: PpuStatus = PpuStatus.HBlank;
    dmaActive = false;

    scanlineReachedWindow = false;
    windowLineCounter = 0;
    scanline = 0;

    tCycles = 0;

    // CGB only
    isCgb: boolean = false;
    isDoubleSpeed: boolean = false;

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
}