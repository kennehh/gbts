export class LengthCounter {
    enabled: boolean = false;
    private length = 0;

    constructor(private readonly maxLength: number) {
        this.length = maxLength;
    }

    clock() {
        if (this.enabled && this.length > 0) {
            this.length--;
            return this.length === 0;
        }
        return false;
    }

    setLength(value: number) {
        this.length = this.maxLength - value;
    }

    trigger() {
        this.length = this.maxLength;
    }

    reset() {
        this.length = this.maxLength;
        this.enabled = false;
    }
}