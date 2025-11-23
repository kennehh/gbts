import { GameBoy } from "@/core"
import { MockDisplay } from "./display"
import { MockJoypadHandler } from "./joypad-handler"
import { MockSaveStore } from "./save-store"
import { MockAudioOutput } from "./audio-output"
import type { IDisplay } from "@/core/ppu/rendering"
import type { IJoypadHandler } from "@/core/joypad"
import type { ISaveStore } from "@/core/save"
import type { IAudioOutput } from "@/core/apu"

export function createMockGameBoy(
    display: IDisplay = new MockDisplay(),
    joypad: IJoypadHandler = new MockJoypadHandler(),
    save: ISaveStore = new MockSaveStore(),
    audio: IAudioOutput = new MockAudioOutput(),
) {
    return new GameBoy(display, joypad, save, audio);
}
