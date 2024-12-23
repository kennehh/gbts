import { OamSprite } from "./oam-scanner";

export class SpriteNode {
    constructor(public sprite: OamSprite) {}
    next: SpriteNode | null = null;
}

export class SpriteOrderedList {
    private head: SpriteNode | null = null;
    private size = 0;

    get length() {
        return this.size;
    }

    clear() {
        this.head = null;
        this.size = 0;
    }    

    add(sprite: OamSprite) {
        const node = new SpriteNode(sprite);
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

        const x = pixelX + 8;
        if (this.head.sprite.x > x) {
            return null;    
        }

        const sprite = this.head.sprite;
        this.head = this.head.next;
        this.size--;
        return sprite;
    }

    private compare(a: OamSprite, b: OamSprite) {
        const xDifference = a.x - b.x;
        return xDifference !== 0 ? xDifference : a.oamIndex - b.oamIndex;
    }
}