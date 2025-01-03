export const enum MemorySize {
    KB = 1024,
    MB = KB * 1024,
    Size2KB = 2 * KB,
    Size4KB = 4 * KB,
    Size8KB = 8 * KB,
    Size16KB = 16 * KB,
    Size32KB = 32 * KB,
    Size64KB = 64 * KB,
    Size128KB = 128 * KB,
    Size256KB = 256 * KB,
    Size512KB = 512 * KB,
    Size1MB = 1 * MB,
    Size2MB = 2 * MB,
    Size4MB = 4 * MB,
    Size8MB = 8 * MB,
    Size1_1MB = 1.1 * MB,
    Size1_2MB = 1.2 * MB,
    Size1_5MB = 1.5 * MB
}

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
