export interface IDisplay {
    setPixel(x: number, y: number, color: number): void;
    renderFrame(): void;
    clear(): void;
}
