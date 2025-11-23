import type { IDisplay } from "../core/ppu/rendering/types";

export class MockDisplay implements IDisplay {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    setPixel(_x: number, _y: number, _color: number): void {
        // console.log(`Writing pixel at (${x}, ${y}) with color ${color}`);
    }
    renderFrame(): void {
        // console.log("Rendering frame");
    }
    clear(): void { /* empty */ }
}
