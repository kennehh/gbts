import type { IAudioOutput } from "../core/apu";

/* eslint-disable @typescript-eslint/no-unused-vars */
export class MockAudioOutput implements IAudioOutput {
    pushSample(_left: number, _right: number): void { /* empty */ }
}
