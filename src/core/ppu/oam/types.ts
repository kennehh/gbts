export interface OamSprite {
    y: number,
    x: number,
    tileIndex: number,
    oamIndex: number,

    // flags
    bgHasPriority: boolean,
    flipX: boolean,
    flipY: boolean,
    dmgPalette: number,
    bank: number,
    cgbPalette: number,
}
