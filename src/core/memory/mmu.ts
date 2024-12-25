import { ICartridge } from "../cartridge/cartridge";
import { InterruptManager } from "../cpu/interrupt-manager";
import { Memory } from "./memory";
import { Ppu } from "../ppu/ppu";
import { Timer } from "../timer/timer";
import { EmptyCartridge } from "../cartridge/empty-cartridge";
import { DmaController } from "./dma-controller";
import { JoypadController } from "../joypad/joypad-controller";
import { SerialController } from "../serial/serial-controller";
import { Apu } from "../apu/apu";

export interface IMmu {
    get bootRomLoaded(): boolean;
    tickTCycle(): void;
    tickMCycle(): void;
    read(address: number): number;
    readDma(address: number): number;
    write(address: number, value: number): void;
    writeDma(address: number, value: number): void;
    reset(): void;
    loadBootRom(rom: Memory): void;
    loadCartridge(cart: ICartridge): void;
    triggerOamBug(address: number): void;
}

export class Mmu implements IMmu {
    private _bootRomLoaded: boolean = false;
    private cartridge: ICartridge = EmptyCartridge.getInstance();
    private bootRom: Memory | null = null;
    private readonly wram: Memory = new Memory(0x2000);
    private readonly hram: Memory = new Memory(0x80);
    private readonly ioRegisters: Memory = new Memory(0x80);
    private readonly dmaController: DmaController;

    constructor(
        private readonly interruptManager: InterruptManager,
        private readonly timer: Timer,
        private readonly ppu: Ppu,
        private readonly apu: Apu,
        private readonly joypadController: JoypadController,
        private readonly serialController: SerialController
    ) {
        this.dmaController = new DmaController(this.ppu.state, this, this.ppu.oam);
        this.reset();
    }

    get bootRomLoaded(): boolean {
        return this._bootRomLoaded;
    }

    tickTCycle(): void {
        this.ppu.tickTCycle();
    }

    tickMCycle(): void {
        this.timer.tickMCycle();
        //this.serialController.tickTCycle();
        this.dmaController.tickMCycle();
    }

    loadBootRom(rom: Memory): void {
        this.bootRom = rom;
        this._bootRomLoaded = true;
    }

    loadCartridge(cart: ICartridge): void {
        this.cartridge = cart;
    }

    reset(): void {
        this.wram.randomize();
        this.hram.randomize();
        this.ioRegisters.fill(0);
        this._bootRomLoaded = false;
        this.dmaController.reset();
        this.joypadController.reset();
    }

    readDma(address: number): number {
        return this.read(address, true);
    }

    read(address: number, dma: boolean = false): number {
        address &= 0xFFFF;

        if (this.ppu.state.dmaActive && !dma) {
            if (address >= 0xff80 && address <= 0xfffe) {
                // only HRAM can be accessed during DMA
                return this.hram.read(address);
            }
            return 0xff;
        }
        
        // Use upper 4 bits for primary switching
        switch (address >> 12) {
            // ROM Banks (0x0000 - 0x7FFF)
            case 0x0: case 0x1: case 0x2: case 0x3:
            case 0x4: case 0x5: case 0x6: case 0x7:
                return this.readRomRegion(address);

            // VRAM (0x8000 - 0x9FFF)
            case 0x8: case 0x9:
                return this.ppu.readVram(address);

            // External RAM (0xA000 - 0xBFFF)
            case 0xa: case 0xb:
                return this.cartridge.readRam(address);

            // WRAM and Echo (0xC000 - 0xFDFF)
            case 0xc: case 0xd: case 0xe: 
                return this.wram.read(address);

            // Special F range
            case 0xf:
                if (address <= 0xfdff) {
                    return this.wram.read(address);
                }
                // Handle special F range
                if (address <= 0xfe9f) {
                    return this.ppu.readOam(address);
                }
                if (address <=  0xfeff) {
                    return 0xff; // Prohibited area
                }
                if (address <= 0xff7f) {
                    return this.readIoRegion(address);
                }
                if (address <= 0xfffe) {
                    return this.hram.read(address);
                }
                if (address === 0xffff) {
                    return this.interruptManager.ie;
                }
                throw new Error(`Invalid read address: ${address.toString(16)}`);
        }
        throw new Error(`Invalid read address: ${address.toString(16)}`);
    }

    writeDma(address: number, value: number): void {
        this.write(address, value, true);
    }

    write(address: number, value: number, dma: boolean = true): void {
        address &= 0xFFFF;
        value &= 0xFF;

        if (this.ppu.state.dmaActive && !dma) {
            if (address >= 0xff80 && address <= 0xfffe) {
                // only HRAM can be accessed during DMA
                return this.hram.write(address, value);
            }
            return;
        }

        switch (address >> 12) {
            // ROM Banks (0x0000 - 0x7FFF)
            case 0x0: case 0x1: case 0x2: case 0x3:
            case 0x4: case 0x5: case 0x6: case 0x7:
                this.cartridge.writeRom(address, value);
                return;

            // VRAM (0x8000 - 0x9FFF)
            case 0x8: case 0x9:
                this.ppu.writeVram(address, value);
                return;

            // External RAM (0xA000 - 0xBFFF)
            case 0xa: case 0xb:
                this.cartridge.writeRam(address, value);
                return;

            // WRAM and Echo (0xC000 - 0xFDFF)
            case 0xc: case 0xd: case 0xe:
                this.wram.write(address, value);
                return;

            // Special F range
            case 0xf:
                if (address <= 0xfdff) {
                    this.wram.write(address, value);
                    return;
                }
                // Handle special F range
                if (address <= 0xfe9f) {
                    this.ppu.writeOam(address, value);
                    return;
                }
                if (address <= 0xfeff) {
                    return; // Prohibited area - ignore write
                }
                if (address <= 0xff7f) {
                    this.writeIoRegion(address, value);
                    return;
                }
                if (address <= 0xfffe) {
                    this.hram.write(address, value);
                    return;
                }
                if (address === 0xffff) {
                    this.interruptManager.ie = value;
                    return;
                }
                throw new Error(`Invalid write address: ${address.toString(16)}`);
        }
        throw new Error(`Invalid write address: ${address.toString(16)}`);
    }

    triggerOamBug(address: number) {
        // CGB: no OAM bug, return early
        // https://github.com/LIJI32/SameBoy/blob/master/Core/memory.c#L93
        if (address >= 0xfe00 && address < 0xff00) {
            const oamIndex = this.ppu.getCurrentOamIndexBeingScanned();
            if (oamIndex >= 8) {
                const a = this.ppu.oam.readDirect16(oamIndex);
                const b = this.ppu.oam.readDirect16(oamIndex - 4);
                const c = this.ppu.oam.readDirect16(oamIndex - 2);
                this.ppu.oam.writeDirect16(oamIndex, this.bitwiseGlitch(a, b, c));

                for (let i = 2; i < 8; i++) {
                    this.ppu.oam.writeDirect(oamIndex + i, this.ppu.oam.readDirect(oamIndex - 8 + i));
                }
            }
        }
    }

    private bitwiseGlitch(a: number, b: number, c: number): number {
        // https://github.com/LIJI32/SameBoy/blob/master/Core/memory.c#L29
        return ((a ^ c) & (b ^ c)) ^ c;
    }

    private readRomRegion(address: number): number {
        if (address < 0x100 && this._bootRomLoaded) {
            return this.bootRom!.read(address);
        }
        return this.cartridge.readRom(address);
    }

    private readIoRegion(address: number): number {
        switch (address) {
            case 0xff00:
                return this.joypadController.readRegister();
            case 0xff01:
                return this.serialController.readSB(); 
            case 0xff02:
                return this.serialController.readSC();
            case 0xff04: case 0xff05: case 0xff06: case 0xff07:
                return this.timer.readRegister(address);
            case 0xff0f:
                return this.interruptManager.if;
            case 0xff10: case 0xff11: case 0xff12: case 0xff13: case 0xff14:
            case 0xff16: case 0xff17: case 0xff18: case 0xff19: 
            case 0xff1a: case 0xff1b: case 0xff1c: case 0xff1d: case 0xff1e:
            case 0xff20: case 0xff21: case 0xff22: case 0xff23:
            case 0xff24: case 0xff25: case 0xff26:
                return this.apu.readRegister(address);
            case 0xff30: case 0xff31: case 0xff32: case 0xff33: case 0xff34:
            case 0xff35: case 0xff36: case 0xff37: case 0xff38: case 0xff39:
            case 0xff3a: case 0xff3b: case 0xff3c: case 0xff3d: case 0xff3e: case 0xff3f:
                return this.apu.readWavRam(address);
            case 0xff40: case 0xff41: case 0xff42: case 0xff43: case 0xff44: case 0xff45: 
            case 0xff46: case 0xff47: case 0xff48: case 0xff49: case 0xff4a: case 0xff4b:
                return this.ppu.readRegister(address); // LCD Control Registers
            case 0xff4f:
                return this.ppu.readRegister(address); // VRAM Bank
            case 0xff50:
                return this._bootRomLoaded ? 0 : 0xff;
            case 0xff51: case 0xff52: case 0xff53: case 0xff54: case 0xff55:
                return this.ppu.readRegister(address); // VRAM DMA
            case 0xff68: case 0xff69: case 0xff6a: case 0xff6b:
                return this.ppu.readRegister(address); // BG/OBJ Palettes
            case 0xff70:
                return 0xff; // WRAM Bank
        }

        return 0xff;
    }

    private writeIoRegion(address: number, value: number): void {
        switch (address) {
            case 0xff00:
                this.joypadController.writeRegister(value);
                return;
            case 0xff01: 
                this.serialController.writeSB(value);
                return;
            case 0xff02:
                this.serialController.writeSC(value);
                return;
            case 0xff04: case 0xff05: case 0xff06: case 0xff07:
                this.timer.writeRegister(address, value);
                return;
            case 0xff0f:
                this.interruptManager.if = value;
                return;
            case 0xff10: case 0xff11: case 0xff12: case 0xff13: case 0xff14: // NR10 - NR14
            case 0xff16: case 0xff17: case 0xff18: case 0xff19:  // NR21 - NR24
            case 0xff1a: case 0xff1b: case 0xff1c: case 0xff1d: case 0xff1e: // NR30 - NR34
            case 0xff20: case 0xff21: case 0xff22: case 0xff23: // NR41 - NR44
            case 0xff24: case 0xff25: case 0xff26: // NR50 - NR52
                this.apu.writeRegister(address, value);
                return;
            case 0xff30: case 0xff31: case 0xff32: case 0xff33: case 0xff34:
            case 0xff35: case 0xff36: case 0xff37: case 0xff38: case 0xff39:
            case 0xff3a: case 0xff3b: case 0xff3c: case 0xff3d: case 0xff3e: case 0xff3f:
                this.apu.writeWavRam(address, value);
                break;
            case 0xff40: case 0xff41: case 0xff42: case 0xff43: case 0xff44: case 0xff45: 
            case 0xff47: case 0xff48: case 0xff49: case 0xff4a: case 0xff4b:
                this.ppu.writeRegister(address, value); // LCD Control Registers
                return;
            case 0xff46:
                this.ppu.writeRegister(address, value); // OAM DMA
                this.dmaController.start(value);
                return;
            case 0xff4f:
                this.ppu.writeRegister(address, value); // VRAM Bank
                return;
            case 0xff50:
                if (value > 0) this._bootRomLoaded = false;
                return;
            case 0xff51: case 0xff52: case 0xff53: case 0xff54: case 0xff55:
                this.ppu.writeRegister(address, value); // VRAM DMA
                return;
            case 0xff68: case 0xff69: case 0xff6a: case 0xff6b:
                this.ppu.writeRegister(address, value); // BG/OBJ Palettes
                return;
            case 0xff70:
                // WRAM Bank
                return;
        }
    }
}
