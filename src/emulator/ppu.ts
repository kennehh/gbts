import { InterruptManager } from "./interrupt-manager";
import { Memory } from "./memory";
import { LcdcFlag, PpuState, PpuStatus } from "./ppu-state";

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
            return;
        }


    }
}
