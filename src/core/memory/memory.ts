const isPowerOfTwo = (value: number) => (value & (value - 1)) === 0;

export class Memory {
    private data: Uint8Array;
    private getWrappedAddress: (address: number) => number;

    get bytes(): Uint8Array {
        return this.data;
    }

    constructor(param: Uint8Array | number) {
        this.data = param instanceof Uint8Array ? param : new Uint8Array(param);

        if (isPowerOfTwo(this.data.length)) {
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

    randomise(): void {
        for (let i = 0; i < this.data.length; i++) {
            this.data[i] = Math.floor(Math.random() * 0x100);
        }
    }
}
