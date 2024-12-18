import { InterruptFlag, InterruptManager } from "../cpu/interrupt-manager";
import { Memory } from "../memory/memory";
import { IDisplay } from "./display";
import { OamScanner } from "./oam-scanner";
import { BackgroundFetcher } from "./background-fetcher";
import { PixelFifo } from "./pixel-fifo";
import { PixelRenderer } from "./pixel-renderer";
import { PpuState, PpuStatus, StatInterruptSourceFlag } from "./ppu-state";
import { SpriteFetcher } from "./sprite-fetcher";

export interface IPpu {
    get state(): PpuState;
    get oam(): Memory;
    get vram(): Memory;

    tick(): void;
    readVram(address: number): number;
    writeVram(address: number, value: number): void;
    readOam(address: number): number;
    writeOam(address: number, value: number): void;
    readRegister(address: number): number;
    writeRegister(address: number, value: number): void;
    dmaTransfer(data: Uint8Array): void;
    reset(): void;
}

export class Ppu implements IPpu {
    readonly state = new PpuState();
    
    readonly vram: Memory = new Memory(0x2000);
    readonly oam: Memory = new Memory(0xA0);

    private readonly oamScanner: OamScanner;
    private readonly backgroundFetcher: BackgroundFetcher;
    private readonly spriteFetcher: SpriteFetcher;
    private readonly pixelRenderer: PixelRenderer;
    private readonly bgPixelFifo = new PixelFifo();
    private readonly spritePixelFifo = new PixelFifo();

    private readonly interruptManager: InterruptManager;
    private readonly display: IDisplay;

    private previousEnableLcd = false;

    constructor(interruptManager: InterruptManager, display: IDisplay) {
        this.interruptManager = interruptManager;
        this.oamScanner = new OamScanner(this.state, this.oam);
        this.display = display;

        this.backgroundFetcher = new BackgroundFetcher(this.state, this.vram, this.bgPixelFifo);
        this.spriteFetcher = new SpriteFetcher(this.state, this.vram, this.spritePixelFifo);
        this.pixelRenderer = new PixelRenderer(this.state, this.display, this.bgPixelFifo, this.spritePixelFifo);
    }

    reset() {
        this.state.reset();
        this.oam.fill(0);
        this.vram.fill(0);
        this.oamScanner.reset();
        this.backgroundFetcher.reset();
        this.spriteFetcher.reset();
        this.pixelRenderer.reset();
        this.display.clear();
        this.previousEnableLcd = false;
    }

    dmaTransfer(data: Uint8Array): void {
        this.oam.set(data);
    }

    readRegister(address: number): number {
        switch (address) {
            case 0xFF40: return this.state.lcdc;
            case 0xFF41: return this.state.stat;
            case 0xFF42: return this.state.scy;
            case 0xFF43: return this.state.scx;
            case 0xFF44: return this.state.ly;
            case 0xFF45: return this.state.lyc;
            case 0xFF46: return this.state.dma;
            case 0xFF47: return this.state.bgp;
            case 0xFF48: return this.state.obp0;
            case 0xFF49: return this.state.obp1;
            case 0xFF4A: return this.state.wy;
            case 0xFF4B: return this.state.wx;
            default: throw new Error(`Invalid PPU register address: ${address.toString(16)}`);
        }
    }

    writeRegister(address: number, value: number): void {
        switch (address) {
            case 0xFF40: this.state.lcdc = value; break;
            case 0xFF41: this.state.stat = value; break;
            case 0xFF42: this.state.scy = value; break;
            case 0xFF43: this.state.scx = value; break;
            case 0xFF44: break;
            case 0xFF45: this.state.lyc = value; break;
            case 0xFF46: this.state.dma = value; break;
            case 0xFF47: 
                this.state.bgp = value; 
                // update palette
                break;
            case 0xFF48:
                this.state.obp0 = value;
                // update palette
                break;
            case 0xFF49:
                this.state.obp1 = value;
                // update palette
                break;
            case 0xFF4A: this.state.wy = value; break;
            case 0xFF4B: this.state.wx = value; break;
            default: throw new Error(`Invalid PPU register address: ${address.toString(16)}`);
        }
    }

    readVram(address: number): number {
        if (this.state.status === PpuStatus.Drawing) {
            return 0xFF;
        }
        return this.vram.read(address);
    }

    writeVram(address: number, value: number): void {
        if (this.state.status === PpuStatus.Drawing) {
            return;
        }
        this.vram.write(address, value);
    }

    readOam(address: number): number {
        if (this.state.status === PpuStatus.Drawing || this.state.status === PpuStatus.OamScan) {
            return 0xFF;
        }
        return this.oam.read(address);
    }

    writeOam(address: number, value: number): void {
        if (this.state.status === PpuStatus.Drawing || this.state.status === PpuStatus.OamScan) {
            return;
        }
        this.oam.write(address, value);
    }    
    
    tick() {        
        if (this.state.lcdEnabled !== this.previousEnableLcd) {
            this.handleLcdEnabledChange();
        } else {
            this.state.firstFrameAfterDisplayEnable = false
        }

        if (!this.state.lcdEnabled) {
            return;
        }

        this.state.tCycles++;

        switch (this.state.status) {
            case PpuStatus.OamScan: this.handleOamScan(); break;
            case PpuStatus.Drawing: this.handleDrawing(); break;
            case PpuStatus.HBlank: this.handleHBlank(); break;
            case PpuStatus.VBlank: this.handleVBlank(); break;
            default: throw new Error(`Invalid PPU status: ${this.state.status}`);
        }

        if (this.state.pendingLcdStatInterrupt) {
            this.interruptManager.requestInterrupt(InterruptFlag.LcdStat);
            this.state.pendingLcdStatInterrupt = false;
        }
    }

    private handleLcdEnabledChange() {
        this.state.ly = 0;
        this.state.tCycles = 0;
        this.state.pendingLcdStatInterrupt = false;
        
        if (this.state.lcdEnabled) {
            this.state.status = PpuStatus.OamScan;
        } else {
            this.state.status = PpuStatus.HBlank;
            this.display.clear();
            this.display.renderFrame();
        }
        this.previousEnableLcd = this.state.lcdEnabled;
    }

    private goToNextScanline() {
        this.state.ly++;
        
        if (this.state.lyCoincidence) {
            this.checkStatInterrupt(StatInterruptSourceFlag.Lcdc);
        }

        if (this.state.ly >= 153) {
            this.state.ly = 0;
        }
    }

    private checkStatInterrupt(flag: StatInterruptSourceFlag) {
        if ((this.state.statInterruptSource & flag) !== 0) {
            this.state.pendingLcdStatInterrupt = true;
        }
    }

    private handleOamScan() {
        if (this.state.previousStatus !== PpuStatus.OamScan) {
            if (this.state.windowEnabled && !this.state.windowWasVisible && this.state.ly === this.state.wy) {
                this.state.windowWasVisible = true;
            }
            this.oamScanner.reset();
            this.state.previousStatus = PpuStatus.OamScan;
        }

        this.oamScanner.tick();
        this.checkStatInterrupt(StatInterruptSourceFlag.Oam);

        if (this.state.tCycles === 80) {
            this.state.status = PpuStatus.Drawing;
        }
    }

    private handleDrawing() {
        if (this.state.previousStatus !== PpuStatus.Drawing) {
            this.pixelRenderer.reset();
            this.backgroundFetcher.reset();
            this.spriteFetcher.reset();
            this.bgPixelFifo.clear();
            this.spritePixelFifo.clear();
            
            this.spriteFetcher.spriteBuffer = this.oamScanner.getSprites();
            this.backgroundFetcher.pixelsToDiscard = this.state.scx & 0x7;
            this.state.drawingInitialScanlineDelay = 6 + this.backgroundFetcher.pixelsToDiscard;

            this.state.previousStatus = PpuStatus.Drawing;
        }

        if (this.state.drawingInitialScanlineDelay > 0) {
            this.state.drawingInitialScanlineDelay--;
            return;
        }

        if (this.spriteFetcher.foundSpriteAt(this.pixelRenderer.pixelX)) {
            this.backgroundFetcher.pause();
            return;
        }

        if (this.spriteFetcher.fetchingSprite) {
            this.spriteFetcher.tick();
            if (!this.spriteFetcher.fetchingSprite) {
                this.backgroundFetcher.resume();
            }
            return;
        }

        this.backgroundFetcher.tick();
        this.pixelRenderer.tick();

        if (this.state.windowEnabled && this.pixelRenderer.windowTriggered && !this.backgroundFetcher.windowMode) {
            this.backgroundFetcher.reset(true);
            this.bgPixelFifo.clear();
            return;
        }

        if (this.pixelRenderer.finishedScanline) {
            this.state.status = PpuStatus.HBlank;
            if (this.backgroundFetcher.windowMode) {
                this.state.windowLineCounter++;
            }
        }
    }

    private handleHBlank() {
        if (this.state.previousStatus !== PpuStatus.HBlank) {
            this.state.previousStatus = PpuStatus.HBlank;
        }

        this.checkStatInterrupt(StatInterruptSourceFlag.HBlank);

        if (this.state.tCycles >= 456) {
            this.state.tCycles = 0;
            this.goToNextScanline();
            this.state.status = this.state.ly === 144 ? PpuStatus.VBlank : PpuStatus.OamScan;
        }
    }

    private handleVBlank() {
        if (this.state.previousStatus !== PpuStatus.VBlank) {
            this.interruptManager.requestInterrupt(InterruptFlag.VBlank);
            this.display.renderFrame();
            this.state.previousStatus = PpuStatus.VBlank;
        }

        this.checkStatInterrupt(StatInterruptSourceFlag.VBlank);

        if (this.state.tCycles >= 456) {
            this.state.tCycles = 0;
            this.goToNextScanline();
            if (this.state.ly === 0) {
                this.state.windowLineCounter = 0;
                this.state.windowWasVisible = false;
                this.state.status = PpuStatus.OamScan;
            }
        }
    }
}
