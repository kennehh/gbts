abstract class MemoryBase {
    protected data: Uint8Array;

    get bytes(): Uint8Array {
        return this.data;
    }

    constructor(data: Uint8Array) {
        this.data = data;
    }

    get length(): number {
        return this.data.length;
    }

    abstract read(address: number): number;

    abstract write(address: number, value: number): void;

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

    randomise(): void {
        for (let i = 0; i < this.data.length; i++) {
            this.data[i] = Math.floor(Math.random() * 0x100);
        }
    }
}

class MemorySlowWrap extends MemoryBase {
    read(address: number): number {
        return this.data[address % this.data.length];
    }

    write(address: number, value: number): void {
        this.data[address % this.data.length] = value;
    }
}

class MemoryFastWrap extends MemoryBase {
    read(address: number): number {
        return this.data[address & (this.data.length - 1)];
    }

    write(address: number, value: number): void {
        this.data[address & (this.data.length - 1)] = value;
    }
}

export function createMemory(param: Uint8Array | number) {
    const data = param instanceof Uint8Array ? param : new Uint8Array(param);

    const isPowerOfTwo = (data.length & (data.length - 1)) === 0;
    if (isPowerOfTwo) {
        return new MemoryFastWrap(data);
    } else {
        return new MemorySlowWrap(data);
    }
}
