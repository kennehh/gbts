import type { OamSprite } from "../oam";

export function packSpritePixel(sprite: OamSprite, color: number): number {
    const priority = sprite.bgHasPriority ? 1 : 0;
    return color | (sprite.dmgPalette << 2) | (priority << 3);
}

export const getSpriteColor = (pixel: number) => pixel & 0b11;
export const getSpritePalette = (pixel: number) => (pixel >> 2) & 1;
export const getSpriteBgHasPriority = (pixel: number) => (pixel >> 3) === 1;
