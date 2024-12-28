import { FromWorkerMessage } from "../common/types";
import { IAudioOutput } from "../core/apu/audio-output";

const GB_CYCLE_RATE = 1048576; // GB cycles per second (4194304 / 4)

export class AudioOutput implements IAudioOutput {
    private leftAccumulator = 0;
    private rightAccumulator = 0;
    private sampleCount = 0;    
    private cycleCount = 0;
    private readonly cylesPerSample: number;

    private readonly leftBuffer: Float32Array;
    private readonly rightBuffer: Float32Array;
    private writePosition = 0;

    constructor(
        private readonly sampleRate = 44100,
        private readonly bufferSize = 1024) {
        this.leftBuffer = new Float32Array(bufferSize);
        this.rightBuffer = new Float32Array(bufferSize);
        this.cylesPerSample = GB_CYCLE_RATE / sampleRate;
    } 

    pushSample(left: number, right: number): void {
        this.leftAccumulator += left;
        this.rightAccumulator += right;
        this.sampleCount++;
        this.cycleCount++;

        if (this.cycleCount >= this.cylesPerSample) {
            const leftSample = this.leftAccumulator / this.sampleCount;
            const rightSample = this.rightAccumulator / this.sampleCount;

            this.leftBuffer[this.writePosition] = leftSample;
            this.rightBuffer[this.writePosition] = rightSample;
            this.writePosition++;

            if (this.writePosition === this.bufferSize) {                
                self.postMessage(<FromWorkerMessage>{
                    type: "AUDIO_BUFFER",
                    payload: {
                        left: this.leftBuffer,
                        right: this.rightBuffer
                    }
                });

                this.writePosition = 0;
            }

            this.leftAccumulator = 0;
            this.rightAccumulator = 0;
            this.sampleCount = 0;
            this.cycleCount -= this.cylesPerSample;
        }
    }

}