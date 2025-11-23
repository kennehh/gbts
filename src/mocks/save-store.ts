/* eslint-disable @typescript-eslint/no-unused-vars */
import type { ISaveStore, RamSave, SaveState } from "../core/save/types";

export class MockSaveStore implements ISaveStore {
    saveRam(_save: RamSave): Promise<void> {
        return Promise.resolve();
    }

    loadRam(_cartId: number): Promise<RamSave | null> {
        return Promise.resolve(null);
    }

    saveState(_save: SaveState): Promise<void> {
        return Promise.resolve();
    }

    loadState(_cartId: number, _slot: number): Promise<SaveState | null> {
        return Promise.resolve(null);
    }
}
