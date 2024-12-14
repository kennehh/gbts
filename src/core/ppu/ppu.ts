import { InterruptFlag, InterruptManager } from "../cpu/interrupt-manager";
import { Memory } from "../memory/memory";
import { IDisplay } from "./display";
import { OamScanner } from "./oam-scanner";
import { PixelFetcher } from "./pixel-fetcher";
import { PixelFifo } from "./pixel-fifo";
import { PixelRenderer } from "./pixel-renderer";
import { PpuState, PpuStatus, StatInterruptSourceFlag } from "./ppu-state";

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
    private readonly pixelFetcher: PixelFetcher;
    private readonly pixelRenderer: PixelRenderer;

    private readonly interruptManager: InterruptManager;
    private readonly display: IDisplay;

    private previousEnableLcd = false;

    constructor(interruptManager: InterruptManager, display: IDisplay) {
        this.interruptManager = interruptManager;
        this.oamScanner = new OamScanner(this.state, this.oam);
        this.display = display;

        const bgPixelFifo = new PixelFifo();
        const spritePixelFifo = new PixelFifo();
        this.pixelFetcher = new PixelFetcher(this.state, this.vram, bgPixelFifo, spritePixelFifo);
        this.pixelRenderer = new PixelRenderer(this.state, this.display, bgPixelFifo, spritePixelFifo);
    }

    reset() {
        this.state.reset();
        this.oam.fill(0);
        this.vram.fill(0);
        this.oamScanner.reset();
        this.pixelFetcher.reset();
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
            case 0xFF40: 
                this.state.lcdc = value;
                // TODO: Implement LCDC update
                break;
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
            if (this.state.lcdEnabled) {
                this.state.ly = 0;
                this.state.tCycles = 0;
                this.state.pendingLcdStatInterrupt = false;
                this.state.status = PpuStatus.OamScan;         
            } else {
                this.display.clear();
                this.display.renderFrame();
            }
            this.previousEnableLcd = this.state.lcdEnabled;
        }

        if (!this.state.lcdEnabled) {
            return;
        }

        this.state.tCycles++;

        switch (this.state.status) {
            case PpuStatus.OamScan:
                if (this.state.previousStatus !== PpuStatus.OamScan) {
                    if (!this.state.windowWasVisible && this.state.ly === this.state.wy) {
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
                break;
            case PpuStatus.Drawing:
                if (this.state.previousStatus !== PpuStatus.Drawing) {
                    this.state.fetcherWindowMode = false;
                    this.pixelRenderer.reset();
                    this.pixelFetcher.reset(this.oamScanner.getSprites());
                    this.state.previousStatus = PpuStatus.Drawing;
                }

                const oldWindowMode = this.state.fetcherWindowMode;
                this.pixelFetcher.tick();
                this.pixelRenderer.tick();

                if (this.pixelRenderer.finishedScanline) {
                    this.state.status = PpuStatus.HBlank;
                    if (this.state.fetcherWindowMode) {
                        this.state.windowLineCounter++;
                    }
                    break;
                }

                if (!oldWindowMode && this.state.fetcherWindowMode) {
                    this.pixelFetcher.resetForWindow();
                    break;
                }
                break;
            case PpuStatus.HBlank:
                this.checkStatInterrupt(StatInterruptSourceFlag.HBlank);
                
                if (this.state.tCycles === 456) {
                    this.state.tCycles = 0;
                    this.incrementLy();
                    this.state.status = this.state.ly === 144 ? PpuStatus.VBlank : PpuStatus.OamScan;
                }
                break;
            case PpuStatus.VBlank:
                if (this.state.previousStatus !== PpuStatus.VBlank) {
                    this.display.renderFrame();
                }

                this.checkStatInterrupt(StatInterruptSourceFlag.VBlank);

                if (this.state.tCycles === 456) {
                    this.state.tCycles = 0;
                    this.incrementLy();
                    if (this.state.ly === 0) {
                        this.state.windowLineCounter = 0;
                        this.state.status = PpuStatus.OamScan;
                    }
                }
                break;
        }

        if (this.state.pendingLcdStatInterrupt) {
            this.interruptManager.requestInterrupt(InterruptFlag.LcdStat);
            this.state.pendingLcdStatInterrupt = false;
        }
    }

    private incrementLy() {
        this.state.ly++;
        
        if (this.state.lyCoincidence) {
            this.checkStatInterrupt(StatInterruptSourceFlag.Lcdc);
        }

        if (this.state.ly >= 153) {
            this.state.ly = 0;
        }
    }

    private checkStatInterrupt(flag: StatInterruptSourceFlag) {
        if (this.state.statInterruptSource & flag) {
            this.state.pendingLcdStatInterrupt = true;
        }
    }
}
