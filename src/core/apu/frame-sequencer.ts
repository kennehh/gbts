export class FrameSequencer {
    get currentStep(): number {
        return this.step;
    }

    private step = 0;
    private cycles = 0;

    tick4() {
        this.cycles += 4;
        // 4194304 Hz CPU / 512 Hz timer = 8192 cycles
        if (this.cycles === 8192) {
            this.step = (this.step + 1) & 7;
            this.cycles = 0;
            return true;
        }
        return false;
    }

    reset() {
        this.step = 0;
        this.cycles = 0;
    }
}