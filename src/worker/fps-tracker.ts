export class FpsTracker {
    private readonly sampleSize: number;
    private readonly frameTimes: number[] = [];
    private frameIndex: number = 0;
    private lastFrameTime: number = performance.now();
    private averageFps: number = 0;
    
    constructor(sampleSize: number = 60) {
        this.sampleSize = sampleSize;
        this.frameTimes = new Array(sampleSize).fill(0);
    }

    track(): number {
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastFrameTime;
        this.lastFrameTime = currentTime;

        // Store frame time in circular buffer
        this.frameTimes[this.frameIndex] = deltaTime;
        this.frameIndex = (this.frameIndex + 1) % this.sampleSize;

        // Calculate average FPS over sample window
        const totalTime = this.frameTimes.reduce((sum, time) => sum + time, 0);
        this.averageFps = (1000 * this.sampleSize) / totalTime;

        return this.averageFps;
    }

    getAverageFps(): number {
        return this.averageFps;
    }

    getFormattedFps(): string {
        return `${this.averageFps.toFixed(2)} FPS`;
    }

    reset(): void {
        this.frameTimes.fill(0);
        this.frameIndex = 0;
        this.lastFrameTime = performance.now();
        this.averageFps = 0;
    }
}
