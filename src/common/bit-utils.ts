
export namespace BitUtils {
    export function getHighByte(value: number) {
        return (value & 0xff00) >> 8;
    }

    export function getLowByte(value: number) {
        return value & 0x00ff;
    }

    export function get16BitValue(high: number, low: number) {
        return (high << 8) | low;
    }
}