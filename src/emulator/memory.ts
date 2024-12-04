export class Memory {
    private data: Uint8Array;
    private getWrappedAddress: (address: number) => number;

    constructor(data: Uint8Array) {
        this.data = data;

        if (Memory.isPowerOfTwo(data.length)) {
            this.getWrappedAddress = address => address & (data.length - 1);
        } else {
            this.getWrappedAddress = address => address % data.length;
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

    private static isPowerOfTwo(value: number): boolean {
        return (value & (value - 1)) === 0;
    }
}
