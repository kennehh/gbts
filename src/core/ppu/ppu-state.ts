import {
    type StatInterruptSourceFlagValue,
    StatInterruptSourceFlag,
    type PpuStatusValue,
    PpuStatus
} from "./types";

export class PpuState {
    // Registers
    private _ly = 0;
    get ly() { return this._ly; }
    set ly(value: number) { this._ly = value & 0xff; }

    private _lyc = 0;
    get lyc() { return this._lyc; }
    set lyc(value: number) { this._lyc = value & 0xff; }

    private _scx = 0;
    get scx() { return this._scx; }
    set scx(value: number) { this._scx = value & 0xff; }

    private _scy = 0;
    get scy() { return this._scy; }
    set scy(value: number) { this._scy = value & 0xff; }

    private _wx = 0;
    get wx() { return this._wx; }
    set wx(value: number) { this._wx = value & 0xff; }

    private _wy = 0;
    get wy() { return this._wy; }
    set wy(value: number) { this._wy = value & 0xff; }

    private _bgp = 0;
    get bgp() { return this._bgp; }
    set bgp(value: number) { this.updateBgp(value & 0xff); }

    private _obp0 = 0;
    get obp0() { return this._obp0; }
    set obp0(value: number) { this.updateObp0(value & 0xff) }

    private _obp1 = 0;
    get obp1() { return this._obp1; }
    set obp1(value: number) { this.updateObp1(value & 0xff); }

    private _dma = 0;
    get dma() { return this._dma; }
    set dma(value: number) { this._dma = value & 0xff; }

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
        this._bgWindowEnable =               (value & 0b0000_0001) !== 0;
        this._spriteEnable =                 (value & 0b0000_0010) !== 0;
        this._spriteHeight =                 (value & 0b0000_0100) !== 0 ? 16 : 8;
        this._bgTileMapAddress =             (value & 0b0000_1000) !== 0 ? 0x9C00 : 0x9800;
        this._useBgWindow8000AdressingMode = (value & 0b0001_0000) !== 0;
        this._windowEnabled =                (value & 0b0010_0000) !== 0;
        this._windowTileMapAddress =         (value & 0b0100_0000) !== 0 ? 0x9C00 : 0x9800;
        this._lcdEnabled =                   (value & 0b1000_0000) !== 0;
    }

    private _bgWindowEnable = false;
    get bgWindowEnable(): boolean { return this._bgWindowEnable; }

    private _spriteEnable = false;
    get spriteEnable(): boolean { return this._spriteEnable; }

    private _spriteHeight = 8;
    get spriteHeight(): number { return this._spriteHeight; }

    private _bgTileMapAddress = 0x9800;
    get bgTileMapAddress(): number { return this._bgTileMapAddress; }

    private _useBgWindow8000AdressingMode = false;
    get useBgWindow8000AdressingMode(): boolean { return this._useBgWindow8000AdressingMode; }

    private _windowEnabled = false;
    get windowEnabled(): boolean { return this._windowEnabled }

    private _windowTileMapAddress = 0x9800;
    get windowTileMapAddress(): number { return this._windowTileMapAddress; }

    private _lcdEnabled = false;
    get lcdEnabled(): boolean { return this._lcdEnabled; }

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

    private updateBgp(bgp: number) {
        this.updatePaletteLookup(this.bgpLookup, this._bgp, bgp);
        this._bgp = bgp;
    }
    private updateObp0(obp0: number) {
        this.updatePaletteLookup(this.obp0Lookup, this._obp0, obp0);
        this._obp0 = obp0;
    }
    private updateObp1(obp1: number) {
        this.updatePaletteLookup(this.obp1Lookup, this._obp1, obp1);
        this._obp1 = obp1;
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