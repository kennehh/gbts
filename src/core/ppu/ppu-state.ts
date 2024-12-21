export enum LcdcFlag {
    None = 0,
    LcdEnable = 1 << 7,
    WindowTileMapArea = 1 << 6,
    WindowEnable = 1 << 5,
    TileDataArea = 1 << 4,
    BgTileMapArea = 1 << 3,
    ObjSize = 1 << 2,
    ObjEnable = 1 << 1,
    BgWindowPriority = 1 << 0,
}

export enum PpuStatus {
    HBlank = 0,
    VBlank = 1,
    OamScan = 2,
    Drawing = 3,
}

export enum StatInterruptSourceFlag {
    None = 0,
    HBlank = 1 << 3,
    VBlank = 1 << 4,
    Oam = 1 << 5,
    Lcdc = 1 << 6,
}

export class PpuState {
    statInterruptSource: StatInterruptSourceFlag = StatInterruptSourceFlag.None;
    pendingLcdStatInterrupt = false;
    status: PpuStatus = PpuStatus.HBlank;
    previousStatus: PpuStatus = PpuStatus.HBlank;
    dmaActive = false;

    windowWasVisible = false;
    windowLineCounter = 0;
    scanline = 0;
    ly = 0;

    tCycles = 0;

    // cached lcdc values
    bgWindowEnable: boolean = false;              // lcdc bit 0
    spriteEnable: boolean = false;                     // lcdc bit 1
    spriteHeight: number = 8;                       // lcdc bit 2
    bgTileMapAddress: number = 0x9800;              // lcdc bit 3    
    useBgWindow8000AdressingMode: boolean = false;  // lcdc bit 4
    windowEnabled: boolean = false;                  // lcdc bit 5
    windowTileMapAddress: number = 0x9800;          // lcdc bit 6
    lcdEnabled: boolean = false;                    // lcdc bit 7

    firstFrameAfterLcdEnable: boolean = false;

    // CGB only
    isCgb: boolean = false;
    isDoubleSpeed: boolean = false;

    drawingInitialScanlineDelay: number = 0;

    private _ly: number = 0;
    private _lyc: number = 0;
    private _scx: number = 0;
    private _scy: number = 0;
    private _wx: number = 0;
    private _wy: number = 0;
    private _bgp: number = 0;
    private _obp0: number = 0;
    private _obp1: number = 0;
    private _dma: number = 0;
    private _lcdc: LcdcFlag = LcdcFlag.None;

    get lcdc(): LcdcFlag {
        return this._lcdc;
    }

    set lcdc(value: LcdcFlag) {
        this._lcdc = value & 0xff;
        this.bgWindowEnable = (value & LcdcFlag.BgWindowPriority) === LcdcFlag.BgWindowPriority;
        this.spriteEnable = (value & LcdcFlag.ObjEnable) === LcdcFlag.ObjEnable;
        this.spriteHeight = (value & LcdcFlag.ObjSize) === LcdcFlag.ObjSize ? 16 : 8;
        this.bgTileMapAddress = (value & LcdcFlag.BgTileMapArea) === LcdcFlag.BgTileMapArea ? 0x9C00 : 0x9800;
        this.useBgWindow8000AdressingMode = (value & LcdcFlag.TileDataArea) === LcdcFlag.TileDataArea;
        this.windowEnabled = (value & LcdcFlag.WindowEnable) === LcdcFlag.WindowEnable;
        this.windowTileMapAddress = (value & LcdcFlag.WindowTileMapArea) === LcdcFlag.WindowTileMapArea ? 0x9C00 : 0x9800;
        this.lcdEnabled = (value & LcdcFlag.LcdEnable) === LcdcFlag.LcdEnable;
    }

    get stat(): number {
        const lyCoincidenceBit = this.lyCoincidence ? 1 : 0;
        return 1 << 7 | this.statInterruptSource | (lyCoincidenceBit << 2) | this.status;
    }

    set stat(value: number) {
        this.statInterruptSource = value & 0b01111000;
        // LyCompareFlag and status are read-only
    }

    get lyc() { return this._lyc; }
    set lyc(value: number) { this._lyc = value & 0xff; }
    get scx() { return this._scx; }
    set scx(value: number) { this._scx = value & 0xff; }
    get scy() { return this._scy; }
    set scy(value: number) { this._scy = value & 0xff; }
    get wx() { return this._wx; }
    set wx(value: number) { this._wx = value & 0xff; }
    get wy() { return this._wy; }
    set wy(value: number) { this._wy = value & 0xff; }
    get bgp() { return this._bgp; }
    set bgp(value: number) { this._bgp = value & 0xff; }
    get obp0() { return this._obp0; }
    set obp0(value: number) { this._obp0 = value & 0xff; }
    get obp1() { return this._obp1; }
    set obp1(value: number) { this._obp1 = value & 0xff; }
    get dma() { return this._dma; }
    set dma(value: number) { this._dma = value & 0xff; }

    get lyCoincidence(): boolean {
        return this.ly === this.lyc;
    }

    constructor() {
        this.reset();
    }

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
        this.lcdc = 0x91 as LcdcFlag;
        this.stat = 0;
        this.status = PpuStatus.HBlank;
        this.previousStatus = PpuStatus.HBlank;
        this.statInterruptSource = StatInterruptSourceFlag.None;
        this.pendingLcdStatInterrupt = false;
        this.dmaActive = false;
        this.windowWasVisible = false;
        this.windowLineCounter = 0;
        this.tCycles = 0;
        this.drawingInitialScanlineDelay = 0;

        this.isCgb = false;
        this.isDoubleSpeed = false;
    }
}