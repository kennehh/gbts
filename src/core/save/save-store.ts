import { GameBoyState } from "../gameboy-state";

export type RamSave = {
    cartId: number;
    timestamp: Date;
    data: Uint8Array;
};

export type SaveState = {
    cartId: number;
    slot: number;
    timestamp: Date;
    data: GameBoyState;
};

export class MockSaveStore implements ISaveStore {
    async saveRam(_save: RamSave): Promise<void> {}

    async loadRam(_cartId: number): Promise<RamSave | null> {
        return null;
    }

    async saveState(_save: SaveState): Promise<void> {}

    async loadState(_cartId: number, _slot: number): Promise<SaveState | null> {
        return null;
    }
}

export interface ISaveStore {
    saveRam(save: RamSave): Promise<void>;
    loadRam(cartId: number): Promise<RamSave | null>;
    saveState(save: SaveState): Promise<void>;
    loadState(cartId: number, slot: number): Promise<SaveState | null>;
}
