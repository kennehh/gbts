export interface IAudioOutput {
    pushSample(left: number, right: number): void;
};
