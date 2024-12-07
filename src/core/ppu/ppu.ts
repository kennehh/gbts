import { InterruptFlag, InterruptManager } from "../cpu/interrupt-manager";
import { Memory } from "../memory/memory";
import { OamEntry, OamScanner } from "./oam-scanner";
import { PpuState, PpuStatus, StatInterruptSourceFlag } from "./ppu-state";

export interface IPpu {
    tick(): void;
    readVram(address: number): number;
    writeVram(address: number, value: number): void;
    readOam(address: number): number;
    writeOam(address: number, value: number): void;
    readRegister(address: number): number;
    writeRegister(address: number, value: number): void;
    dmaTransfer(data: Uint8Array): void;
}

export class Ppu implements IPpu {
    readonly state = new PpuState();
    
    private vram: Memory = new Memory(0x2000);
    private oam: Memory = new Memory(0xA0);

    readonly oamScanner = new OamScanner(this.oam);

    constructor(private interruptManager: InterruptManager) {
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
        return this.vram.read(address & 0x1FFF);
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
        if (!this.state.lcdEnabled) {
            this.state.ly = 0;
            this.state.tCycles = 0;
            this.state.status = PpuStatus.HBlank;
            this.state.pendingLcdStatInterrupt = false;
            return;
        }

        this.state.tCycles++;

        if (this.state.ly <= 143) {
            if (this.state.tCycles <= 80) {
                if (this.state.status !== PpuStatus.OamScan) {
                    this.state.status = PpuStatus.OamScan;
                    this.oamScanner.reset(this.state.spriteHeight);
                }
                if (this.oamScanner.tick(this.state.ly)) {
                    const sprites = this.oamScanner.getSprites();
                }
                this.checkStatInterrupt(StatInterruptSourceFlag.Oam);
            } else if (this.state.tCycles <= 252) {
                // could take from 172 to 289 cycles, defaulting to 172 for now
                this.state.status = PpuStatus.Drawing;
            } else if (this.state.tCycles <= 456) {
                // could take from 87 to 204 cycles, defaulting to 204 for now
                this.state.status = PpuStatus.HBlank;
                this.checkStatInterrupt(StatInterruptSourceFlag.HBlank);

                if (this.state.tCycles === 456) {
                    this.state.tCycles = 0;
                    this.incrementLy();
                }
            }
        } else {
            if (this.state.status !== PpuStatus.VBlank) {
                this.state.status = PpuStatus.VBlank;
                this.interruptManager.requestInterrupt(InterruptFlag.VBlank);
            }
            
            this.checkStatInterrupt(StatInterruptSourceFlag.VBlank);

            if (this.state.tCycles >= 456) {
                this.incrementLy();
                this.state.tCycles = 0;
            }
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
