import type { OamSprite } from "./types";

interface SpriteNode {
    sprite: OamSprite;
    next: SpriteNode | null;   
}

export class SpriteOrderedList {
    private head: SpriteNode | null = null;
    size = 0;

    clear() {
        this.head = null;
        this.size = 0;
    }    

    push(sprite: OamSprite) {
        const node: SpriteNode = { sprite, next: null };
        this.size++;

        if (this.head === null || this.compare(sprite, this.head.sprite) <= 0) {
            node.next = this.head;
            this.head = node;
            return;
        }

        let current = this.head;
        while (current.next !== null && this.compare(sprite, current.next.sprite) > 0) {
            current = current.next;
        }

        node.next = current.next;
        current.next = node;
    }

    findNext(pixelX: number) {
        if (this.head === null) {
            return null;
        }

        if (this.head.sprite.x > pixelX + 8) {
            return null;    
        }

        const sprite = this.head.sprite;
        this.head = this.head.next;
        this.size--;
        return sprite;
    }

    private compare(a: OamSprite, b: OamSprite) {
        // CGB: Only OAM index is used for sorting
        const xDifference = a.x - b.x;
        return xDifference !== 0 ? xDifference : a.oamIndex - b.oamIndex;
    }
}