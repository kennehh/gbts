export interface IDisplay {
    setPixel(x: number, y: number, color: number): void;
    renderFrame(): void;
    clear(): void;
}

export interface Pixel {
    color: number;
    isSprite?: boolean;
    spriteBgHasPriority?: boolean;
    spritePalette?: number;
}
