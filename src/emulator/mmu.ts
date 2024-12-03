import { EmptyCartridge, ICartridge } from "./cartridge";
import { InterruptManager } from "./interrupt-manager";
import { IPpu } from "./ppu";
import { ITimer } from "./timer";

export interface IMmu {
    get bootRomLoaded(): boolean;
    read(address: number): number;
    write(address: number, value: number): void;
    reset(): void;
    loadBootRom(rom: Uint8Array): void;
    loadCartridge(cart: ICartridge): void;
}

export class Mmu implements IMmu {
    private _bootRomLoaded: boolean = false;
    private cartridge: ICartridge = EmptyCartridge.getInstance();
    private bootRom: Uint8Array | null = null;
    private wram: Uint8Array = new Uint8Array(0x2000);
    private hram: Uint8Array = new Uint8Array(0x7F);

    // TODO: Implement I/O registers, this is just a placeholder
    private ioRegisters: Uint8Array = new Uint8Array(0x80);

    constructor(
        readonly interruptManager: InterruptManager,
        readonly timer: ITimer,
        readonly ppu: IPpu,
    ) {

    }

    get bootRomLoaded(): boolean {
        return this._bootRomLoaded;
    }

    loadBootRom(rom: Uint8Array): void {
        this.bootRom = rom;
        this._bootRomLoaded = true;
    }

    loadCartridge(cart: ICartridge): void {
        this.cartridge = cart;
    }

    reset() {

    }

    read(address: number): number {
        address = address & 0xFFFF;

        // ROM banks 
        if (address <= 0x7fff) {
            if (address < 0x100 && this.bootRomLoaded) {
                return this.bootRom![address];
            }
            return this.cartridge.readRom(address);
        }

        // VRAM
        if (address <= 0x9fff) {
            return this.ppu.readVram(address);
        }

        // External RAM
        if (address <= 0xbfff) {
            return this.cartridge.readRam(address);
        }

        // Working RAM
        if (address <= 0xdfff) {
            // TODO: CGB mode switchable RAM banks 1-7
            return this.wram[address & 0x1FFF];
        }

        // Working RAM shadow   
        if (address <= 0xfdff) {
            return this.wram[address & 0x1FFF];
        }

        // OAM
        if (address <= 0xfe9f) {
            return this.ppu.readOam(address);
        }

        // IO Registers
        if (address <= 0xff7f) {

            //  Joypad Input
            if (address === 0xff00) {
                // TODO: Implement joypad input
                return this.ioRegisters[address & 0x7F];
            }

            // Serial Transfer
            if (address >= 0xff01 && address <= 0xff02) {
                // TODO: Implement serial transfer
                return this.ioRegisters[address & 0x7F];
            }

            // Timer and Divider Registers
            if (address >= 0xff04 && address <= 0xff07) {
                return this.timer.readRegister(address);
            }

            // Interrupts
            if (address === 0xff0f) {
                return this.interruptManager.if;
            }

            // Wave Pattern RAM
            if (address >= 0xff30 && address <= 0xff3f) {
                // TODO: Implement sound
                return this.ioRegisters[address & 0x7F];
            }

            // LCD Control Registers
            if (address >= 0xff40 && address <= 0xff4b) {
                return this.ppu.readRegister(address);
            }

            // VRAM Bank Select
            if (address === 0xff4f) {
                return this.ppu.readRegister(address);
            }

            // Boot ROM Disable
            if (address === 0xff50) {
                return this._bootRomLoaded ? 0 : 0xff;
            }

            // VRAM DMA Transfer
            if (address >= 0xff51 && address <= 0xff55) {
                return this.ppu.readRegister(address);
            }

            // BG/OBJ Palettes
            if (address >= 0xff68 && address <= 0xff6b) {
                return this.ppu.readRegister(address);
            }

            // WRAM Bank Select
            if (address === 0xff70) {
                // TODO: Implement CGB mode WRAM bank switching
                return this.ioRegisters[address & 0x7F];
            }
            
            // console.warn(`Attempted to read from unused memory area at address ${address}`);
            return 0;
        }

        // High RAM
        if (address <= 0xfffe) {
            return this.hram[address & 0x7F];
        }

        // Interrupt Enable Register
        if (address === 0xffff) {
            return this.interruptManager.ie;
        }

        throw new Error(`Invalid memory read at address ${address.toString(16)}`);
    }

    write(address: number, value: number) {
        address = address & 0xFFFF;
        value = value & 0xFF;

        // ROM banks 
        if (address <= 0x7fff) {
            this.cartridge.writeRom(address, value);
            return;
        }

        // VRAM
        if (address <= 0x9fff) {
            this.ppu.writeVram(address, value);
            return;
        }

        // External RAM
        if (address <= 0xbfff) {
            this.cartridge.writeRam(address, value);
            return;
        }

        // Working RAM
        if (address <= 0xdfff) {
            this.wram[address & 0x1FFF] = value;
        }

        // Working RAM shadow
        if (address <= 0xfdff) {
            // console.warn(`Attempted to write to working RAM shadow at address ${address}`);
            this.wram[address & 0x1FFF] = value;
        }

        // OAM
        if (address <= 0xfe9f) {
            this.ppu.writeOam(address, value);
            return;
        }

        // Unused memory area
        if (address <= 0xfeff) {
            // console.warn(`Attempted to write to unused memory area at address ${address}`);
            return;
        }

        // IO Registers
        if (address <= 0xff7f) {
            //  Joypad Input
            if (address === 0xff00) {
                // TODO: Implement joypad input
                this.ioRegisters[address & 0x7F] = value;
                return;
            }

            // Serial Transfer
            if (address >= 0xff01 && address <= 0xff02) {
                // TODO: Implement serial transfer
                this.ioRegisters[address & 0x7F] = value;
                return;
            }

            // Timer and Divider Registers
            if (address >= 0xff04 && address <= 0xff07) {
                this.timer.writeRegister(address, value);
                return;
            }

            // Interrupts
            if (address === 0xff0f) {
                this.interruptManager.if = value;
                return;
            }

            // Wave Pattern RAM
            if (address >= 0xff30 && address <= 0xff3f) {
                // TODO: Implement sound
                this.ioRegisters[address & 0x7F] = value;
                return;
            }

            // LCD Control Registers
            if (address >= 0xff40 && address <= 0xff4b) {
                if (address === 0xff46) {
                    this.dmaTransfer(value);
                } else {
                    this.ppu.writeRegister(address, value);
                }
                return;
            }

            // VRAM Bank Select
            if (address === 0xff4f) {
                this.ppu.writeRegister(address, value);
                return;
            }

            // Boot ROM Disable
            if (address === 0xff50) {
                if (value > 0) {
                    this._bootRomLoaded = false;
                }
                return;
            }

            // VRAM DMA Transfer
            if (address >= 0xff51 && address <= 0xff55) {
                this.ppu.writeRegister(address, value);
                return;
            }

            // BG/OBJ Palettes
            if (address >= 0xff68 && address <= 0xff6b) {
                this.ppu.writeRegister(address, value);
                return;
            }

            // WRAM Bank Select
            if (address === 0xff70) {
                // TODO: Implement CGB mode WRAM bank switching
                this.ioRegisters[address & 0x7F] = value;
                return;
            }
            
            // console.warn(`Attempted to write to unused memory area at address ${address}`);
            return;
        }

        // High RAM
        if (address <= 0xfffe) {
            this.hram[address & 0x7F] = value;
            return;
        }

        // Interrupt Enable Register
        if (address === 0xffff) {
            this.interruptManager.ie = value;
            return;
        }

        throw new Error(`Invalid memory write at address ${address.toString(16)}`);
    }

    private dmaTransfer(value: number) {
        const data = new Uint8Array(160);
        const sourceAddress = value << 8;

        for (let i = 0; i < 160; i++) {
            data[i] = this.read(sourceAddress + i);
        }

        this.ppu.dmaTransfer(data);
    }
}
