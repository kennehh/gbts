export class MockAudioOutput implements IAudioOutput {
    pushSample(_left: number, _right: number): void {
    }
}

export interface IAudioOutput {
    pushSample(left: number, right: number): void;
};