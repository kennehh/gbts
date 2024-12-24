import { CartridgeHeader } from "../cartridge/cartridge-header";
import { GameBoyState } from "../gameboy-state";
import { ISaveStore } from "./save-store";
import xxhash from "xxhash-wasm";

export class SaveManager {
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
                const cartId = await this.getCartId(header);

                await this.storage.saveRam({
                    cartId,
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

        const cartId = await this.getCartId(header);
        const save = await this.storage.loadRam(cartId);
        return save?.data ?? null;
    }

    async saveState(header: CartridgeHeader, slot: number, state: GameBoyState) {
        const cartId = await this.getCartId(header);
        await this.storage.saveState({
            cartId,
            slot: slot,
            timestamp: new Date(),
            data: state
        });
    }

    async loadState(header: CartridgeHeader, slot: number): Promise<GameBoyState | null> {
        const cartId = await this.getCartId(header);
        const save = await this.storage.loadState(cartId, slot);
        return save?.data ?? null;
    }

    private async getCartId(header: CartridgeHeader): Promise<number> {
        const input = `${header.title}::${header.headerChecksum.value}::${header.globalChecksum.value}`;
        const { h32 } = await xxhash();
        return h32(input);
    }
}