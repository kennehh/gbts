import { GameBoyState } from "../gameboy-state";

export interface RamSave {
    cartId: number;
    timestamp: Date;
    data: Uint8Array;
}

export interface SaveState {
    cartId: number;
    slot: number;
    timestamp: Date;
    data: GameBoyState;
}

export class MockSaveStore implements ISaveStore {
    saveRam(_save: RamSave): Promise<void> {
        return Promise.resolve();
    }

    loadRam(_cartId: number): Promise<RamSave | null> {
        return Promise.resolve(null);
    }

    saveState(_save: SaveState): Promise<void> {}

    loadState(_cartId: number, _slot: number): Promise<SaveState | null> {
        return Promise.resolve(null);
    }
}

export interface ISaveStore {
    saveRam(save: RamSave): Promise<void>;
    loadRam(cartId: number): Promise<RamSave | null>;
    saveState(save: SaveState): Promise<void>;
    loadState(cartId: number, slot: number): Promise<SaveState | null>;
}
