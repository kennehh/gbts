import type { CartridgeHeader } from "../cartridge/header";
import type { GameBoyState } from "../types";
import type { ISaveStore } from "./types";

export default class SaveManager {
    private currentRamSavePromise: Promise<void> | null = null;

    constructor(private readonly storage: ISaveStore) { }

    saveRam(header: CartridgeHeader, ram: Uint8Array) {
        if (!header.type.hasBattery || this.currentRamSavePromise !== null) {
            return;
        }

        this.currentRamSavePromise = (async () => {
            try {
                // Delay to ensure that all writes are complete before saving
                await new Promise(resolve => setTimeout(resolve, 1000));

                await this.storage.saveRam({
                    cartId: header.cartId,
                    timestamp: new Date(),
                    data: ram
                });
            } catch (error) {
                console.error("Error saving RAM", error);
            } finally {
                this.currentRamSavePromise = null;
            }
        })();
    }

    async loadRam(header: CartridgeHeader): Promise<Uint8Array | null> {
        if (!header.type.hasBattery) {
            return null;
        }

        const save = await this.storage.loadRam(header.cartId);
        return save?.data ?? null;
    }

    async saveState(cartId: number, slot: number, state: GameBoyState) {
        await this.storage.saveState({
            cartId,
            slot: slot,
            timestamp: new Date(),
            data: state
        });
    }

    async loadState(cartId: number, slot: number): Promise<GameBoyState | null> {
        const save = await this.storage.loadState(cartId, slot);
        return save?.data ?? null;
    }
}