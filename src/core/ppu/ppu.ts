import { InterruptFlag, InterruptManager } from "../cpu/interrupt-manager";
import { Memory } from "../memory/memory";
import { IDisplay } from "./rendering/display";
import { OamScanner } from "./oam/oam-scanner";
import { BgFetcher } from "./rendering/bg-fetcher";
import { PixelRenderer } from "./rendering/pixel-renderer";
import { PpuState, PpuStatus, StatInterruptSourceFlag } from "./ppu-state";
import { SpriteFetcher } from "./rendering/sprite-fetcher";
import { BgFifo } from "./rendering/bg-fifo";
import { SpriteFifo } from "./rendering/sprite-fifo";

export class Ppu {
    readonly state = new PpuState();
    
    readonly vram: Memory = new Memory(0x2000);
    readonly oam: Memory = new Memory(0xA0);

    private readonly oamScanner: OamScanner;
    private readonly bgFetcher: BgFetcher;
    private readonly spriteFetcher: SpriteFetcher;
    private readonly pixelRenderer: PixelRenderer;
    private readonly bgPixelFifo = new BgFifo();
    private readonly spritePixelFifo = new SpriteFifo();

    private readonly interruptManager: InterruptManager;
    private readonly display: IDisplay;

    private previousEnableLcd = false;

    constructor(interruptManager: InterruptManager, display: IDisplay) {
        this.interruptManager = interruptManager;
        this.oamScanner = new OamScanner(this.state, this.oam);
        this.display = display;

        this.bgFetcher = new BgFetcher(this.state, this.vram, this.bgPixelFifo);
        this.spriteFetcher = new SpriteFetcher(this.state, this.vram, this.spritePixelFifo);
        this.pixelRenderer = new PixelRenderer(this.state, this.display, this.bgPixelFifo, this.spritePixelFifo);
    }

    reset() {
        this.state.reset();
        this.oam.randomize();
        this.vram.fill(0);
        this.oamScanner.reset();
        this.bgFetcher.reset();
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
            case 0xFF4F:
                // VRAM bank switch (CGB)
                return 0xff;
            case 0xFF51: case 0xFF52: case 0xFF53: case 0xFF54: case 0xFF55:
                // VRAM DMA transfer (CGB)
                return 0xff;
            case 0xFF68: case 0xFF69: case 0xFF6A: case 0xFF6B:
                // update palette (CGB)
                return 0xff;
            default: throw new Error(`Invalid PPU register address: ${address.toString(16)}`);
        }
    }

    writeRegister(address: number, value: number): void {
        switch (address) {
            case 0xFF40: this.state.lcdc = value; break;
            case 0xFF41: this.state.stat = value; break;
            case 0xFF42: this.state.scy = value; break;
            case 0xFF43: this.state.scx = value; break;
            case 0xFF44: break; // ly is read-only
            case 0xFF45: this.state.lyc = value; break;
            case 0xFF46: this.state.dma = value; break;
            case 0xFF47: this.state.bgp = value; break;
            case 0xFF48: this.state.obp0 = value; break;
            case 0xFF49: this.state.obp1 = value; break;
            case 0xFF4A: this.state.wy = value; break;
            case 0xFF4B: this.state.wx = value; break;
            case 0xFF4F:
                // VRAM bank switch (CGB)
                break;
            case 0xFF51: case 0xFF52: case 0xFF53: case 0xFF54: case 0xFF55:
                // VRAM DMA transfer (CGB)
                break;
            case 0xFF68: case 0xFF69: case 0xFF6A: case 0xFF6B:
                // update palette (CGB)
                break;
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
    
    tickTCycle() {        
        if (this.state.lcdEnabled !== this.previousEnableLcd) {
            this.handleLcdEnabledChange();
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
        this.state.scanline = 0;
        this.state.tCycles = 0;
        this.state.pendingLcdStatInterrupt = false;
        
        if (this.state.lcdEnabled) {
            this.state.status = PpuStatus.OamScan;
            this.state.firstFrameAfterLcdEnable = true;
        } else {
            this.state.status = PpuStatus.HBlank;
        }
        this.previousEnableLcd = this.state.lcdEnabled;
    }

    private checkStatInterrupt(flag: StatInterruptSourceFlag) {
        if ((this.state.statInterruptSource & flag) !== 0) {
            this.state.pendingLcdStatInterrupt = true;
        }
    }

    private handleOamScan() {
        if (this.state.previousStatus !== PpuStatus.OamScan) {
            if (this.state.windowEnabled && !this.state.windowVisibleOnScanline && this.state.scanline === this.state.wy) {
                this.state.windowVisibleOnScanline = true;
            }
            this.oamScanner.reset();
            this.state.previousStatus = PpuStatus.OamScan;
            this.checkStatInterrupt(StatInterruptSourceFlag.Oam);
        }

        this.oamScanner.tick();

        if (this.state.tCycles === 80) {
            this.state.status = PpuStatus.Drawing;
        }
    }

    private handleDrawing() {
        if (this.state.previousStatus !== PpuStatus.Drawing) {
            this.pixelRenderer.reset();
            this.bgFetcher.reset();
            this.spriteFetcher.reset();
            this.bgPixelFifo.clear();
            this.spritePixelFifo.clear();
            
            this.spriteFetcher.sprites = this.oamScanner.sprites;
            this.bgFetcher.pixelsToDiscard = this.state.scx & 0x7;
            this.state.drawingInitialScanlineDelay = 6 + this.bgFetcher.pixelsToDiscard;

            this.state.previousStatus = PpuStatus.Drawing;
        }

        if (this.state.drawingInitialScanlineDelay > 0) {
            this.state.drawingInitialScanlineDelay--;
            return;
        }

        if (this.spriteFetcher.foundSpriteAt(this.pixelRenderer.pixelX)) {
            this.bgFetcher.pause();
            return;
        }

        if (this.spriteFetcher.fetchingSprite) {
            this.spriteFetcher.tick();
            if (!this.spriteFetcher.fetchingSprite && !this.spriteFetcher.foundSpriteAt(this.pixelRenderer.pixelX)) {
                this.bgFetcher.resume();
            }
            return;
        }

        this.bgFetcher.tick();
        this.pixelRenderer.tick();

        if (this.pixelRenderer.finishedScanline) {
            this.state.status = PpuStatus.HBlank;
            if (this.bgFetcher.windowMode) {
                this.state.windowLineCounter++;
            }
            return;
        }

        if (this.state.windowEnabled && this.pixelRenderer.windowTriggered && !this.bgFetcher.windowMode) {
            this.bgFetcher.reset(true);
            this.bgPixelFifo.clear();
        }
    }

    private handleHBlank() {
        if (this.state.previousStatus !== PpuStatus.HBlank) {
            this.state.previousStatus = PpuStatus.HBlank;
            this.checkStatInterrupt(StatInterruptSourceFlag.HBlank);
        }

        this.handleEndOfScanline();
    }

    private handleVBlank() {
        if (this.state.previousStatus !== PpuStatus.VBlank) {
            this.interruptManager.requestInterrupt(InterruptFlag.VBlank);
            this.display.renderFrame();
            this.state.previousStatus = PpuStatus.VBlank;
            this.checkStatInterrupt(StatInterruptSourceFlag.VBlank);
        }

        this.handleEndOfScanline();
    }

    private handleEndOfScanline() {
        if (this.state.tCycles === 452) {
            this.state.ly = this.state.ly === 153 ? 0 : this.state.ly + 1;            
        } else if (this.state.tCycles >= 456) {
            this.state.scanline = this.state.scanline === 153 ? 0 : this.state.scanline + 1;
            this.state.tCycles = 0;

            if (this.state.scanline < 144) {
                this.state.status = PpuStatus.OamScan;
                if (this.state.scanline === 0) {
                    this.state.windowLineCounter = 0;
                    this.state.windowVisibleOnScanline = false;
                    this.state.firstFrameAfterLcdEnable = false;
                }
            } else {
                this.state.status = PpuStatus.VBlank;
            }

            if (this.state.lyCoincidence) {
                this.checkStatInterrupt(StatInterruptSourceFlag.Lcdc);
            }
        }
    }
}
