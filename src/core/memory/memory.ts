export enum MemorySize {
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

    fill(value: number): void {
        this.data.fill(value);
    }

    set(data: Uint8Array): void {
        this.data.set(data);
    }

    private static isPowerOfTwo(value: number): boolean {
        return (value & (value - 1)) === 0;
    }
}
