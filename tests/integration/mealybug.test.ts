import { readdirSync, readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { GameBoy } from "../../src/core/gameboy";
import { IDisplay } from "../../src/core/ppu/rendering/display";
import sharp from "sharp";

const romDirectory = 'tests/__fixtures__/roms/mealybug-tearoom-tests';

function findScreenshot(romDirPath: string, romName: string) {
    const file = readdirSync(romDirPath).find(pngFile => pngFile.startsWith(romName) && pngFile.endsWith('dmg_blob.png'));
    if (!file) {
        return "";
    }
    return path.join(romDirPath, file);
}

function getRoms(relativePath: string) {
    const romDirPath = path.join(romDirectory, relativePath);
    return readdirSync(romDirPath)
        .filter(file => file.endsWith('.gb'))
        .map(romFile => ({
            name: path.basename(romFile),
            romPath: path.join(romDirPath, romFile),
            screenshotPath: findScreenshot(romDirPath, path.basename(romFile, '.gb'))
        }))
        .filter(x => x.screenshotPath !== "");
}

class TestDisplay implements IDisplay {
    readonly rgbFrame = new Uint8Array(160 * 144 * 3);
    
    private dirty = false;
    private readonly pixels = new Uint8Array(160 * 144);
    private readonly palette = [
        [0xff, 0xff, 0xff],
        [0xaa, 0xaa, 0xaa],
        [0x55, 0x55, 0x55],
        [0x00, 0x00, 0x00] 
    ];

    setPixel(x: number, y: number, color: number): void {
        this.pixels[y * 160 + x] = color;

        const offset = y * 160 + x;
        if (this.pixels[offset] !== color) {
            this.pixels[offset] = color;
            this.dirty = true;
        }
    }

    renderFrame(): void {
        if (!this.dirty) {
            return;
        }

        for (let i = 0; i < this.pixels.length; i++) {
            const color = this.palette[this.pixels[i]];
            const offset = i * 3;
            this.rgbFrame[offset] = color[0];
            this.rgbFrame[offset + 1] = color[1];
            this.rgbFrame[offset + 2] = color[2];
        }

        this.dirty = false;
    }

    clear(): void {
        this.pixels.fill(0);
        this.dirty = true;
    }
}

async function testRom(romPath: string, screenshotPath: string) {
    const screenshotBufferPromise = sharp(screenshotPath).raw().toBuffer();
    const romBuffer = readFileSync(romPath);
    const display = new TestDisplay();
    const gb = new GameBoy(display);
    await gb.loadRom(romBuffer);

    const start = Date.now();
    while (gb.mmu.read(gb.cpu.state.pc) !== 0x40) {
        gb.stepInstruction();
        if (Date.now() - start > 5000) {
            throw new Error('Test took too long to complete');
        }
    }

    const expected = new Uint8Array(await screenshotBufferPromise);
    const actual = display.rgbFrame;
    expect(actual).toEqual(expected);
}

describe('Mealybug Tearoom Tests', () => {
    describe('ppu', () => {
        getRoms('ppu').forEach(rom => {
            it(`should pass ${rom.name}`, () => testRom(rom.romPath, rom.screenshotPath));
        });
    });
});
