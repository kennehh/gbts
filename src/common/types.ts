export type WorkerMessage = 
    | { type: "INIT", payload: { canvas: OffscreenCanvas } }
    | { type: "RUN" }
    | { type: "STOP" }
    | { type: "LOAD_ROM", payload: { rom: Uint8Array } };