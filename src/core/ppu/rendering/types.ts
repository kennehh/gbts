export interface IDisplay {
    renderFrame(frameData: Uint8Array): void;
    clear(): void;
}
