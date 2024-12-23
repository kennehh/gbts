export class MockDisplay implements IDisplay {
    setPixel(_x: number, _y: number, _color: number): void {
        // console.log(`Writing pixel at (${x}, ${y}) with color ${color}`);
    }
    renderFrame(): void {
        // console.log("Rendering frame");
    }
    clear(): void {
    }
}

export interface IDisplay {
    setPixel(x: number, y: number, color: number): void;
    renderFrame(): void;
    clear(): void;
}
