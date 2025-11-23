import type { GameBoyState } from "../types";

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

export interface ISaveStore {
    saveRam(save: RamSave): Promise<void>;
    loadRam(cartId: number): Promise<RamSave | null>;
    saveState(save: SaveState): Promise<void>;
    loadState(cartId: number, slot: number): Promise<SaveState | null>;
}
