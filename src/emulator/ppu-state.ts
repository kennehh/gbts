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
    status: PpuStatus = PpuStatus.HBlank;
    lcdEnabled: boolean = false;

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
        this.lcdEnabled = (value & LcdcFlag.LcdEnable) === LcdcFlag.LcdEnable;
    }

    get stat(): number {
        const lyCompareBit = this.lyCompareFlag ? 1 : 0;
        return this.statInterruptSource | (lyCompareBit << 2) | this.status;
    }

    set stat(value: number) {
        this.statInterruptSource = value & 0b01111000;
        // LyCompareFlag and status are read-only
    }

    get ly() { return this._ly; }
    set ly(value: number) { this._ly = value & 0xff; }
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

    get lyCompareFlag(): boolean {
        return this.ly === this.lyc;
    }
}