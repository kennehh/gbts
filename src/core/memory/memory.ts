const kb = 1024;
const mb = kb * 1024;

export const MemorySize = {
    KB: kb,
    MB: mb,
    Size2KB: 2 * kb,
    Size4KB: 4 * kb,
    Size8KB: 8 * kb,
    Size16KB: 16 * kb,
    Size32KB: 32 * kb,
    Size64KB: 64 * kb,
    Size128KB: 128 * kb,
    Size256KB: 256 * kb,
    Size512KB: 512 * kb,
    Size1MB: 1 * mb,
    Size2MB: 2 * mb,
    Size4MB: 4 * mb,
    Size8MB: 8 * mb,
    Size1_1MB: 1.1 * mb,
    Size1_2MB: 1.2 * mb,
    Size1_5MB: 1.5 * mb
} as const;

export class Memory {
    private data: Uint8Array;
    private getWrappedAddress: (address: number) => number;

    get bytes(): Uint8Array {
        return this.data;
    }

    constructor(param: Uint8Array | number) {
        this.data = param instanceof Uint8Array ? param : new Uint8Array(param);

        if (Memory.isPowerOfTwo(this.data.length)) {
            this.getWrappedAddress = address => address & (this.data.length - 1);
        } else {
            this.getWrappedAddress = address => address % this.data.length;
        }
    }

    get length(): number {
        return this.data.length;
    }

    read(address: number): number {
        return this.data[this.getWrappedAddress(address)];
    }

    write(address: number, value: number): void {
        this.data[this.getWrappedAddress(address)] = value;
    }

    readDirect(address: number): number {
        return this.data[address];
    }

    writeDirect(address: number, value: number): void {
        this.data[address] = value;
    }

    read16(address: number): number {
        return (this.read(address + 1) << 8) | this.read(address);
    }

    write16(address: number, value: number): void {
        this.write(address, value & 0xff);
        this.write(address + 1, value >> 8);
    }

    readDirect16(address: number): number {
        return (this.readDirect(address + 1) << 8) | this.readDirect(address);
    }
    
    writeDirect16(address: number, value: number): void {
        this.writeDirect(address, value & 0xff);
        this.writeDirect(address + 1, value >> 8);
    }

    fill(value: number): void {
        this.data.fill(value);
    }

    set(data: Uint8Array): void {
        this.data.set(data);
    }

    randomize(): void {
        for (let i = 0; i < this.data.length; i++) {
            this.data[i] = Math.floor(Math.random() * 0x100);
        }
    }

    private static isPowerOfTwo(value: number): boolean {
        return (value & (value - 1)) === 0;
    }
}
