import { describe, it, expect } from 'vitest';
import { InterruptManager, InterruptFlag } from '../../src/emulator/interrupt-manager';

describe('InterruptManager', () => {
    it('should initialize with default values', () => {
        const manager = new InterruptManager();
        expect(manager.ime).toBe(false);
        expect(manager.ie).toBe(InterruptFlag.None);
        expect(manager.if).toBe(InterruptFlag.None);
    });

    it('should set and get ie correctly', () => {
        const manager = new InterruptManager();
        manager.ie = InterruptFlag.VBlank | InterruptFlag.Timer;
        expect(manager.ie).toBe(InterruptFlag.VBlank | InterruptFlag.Timer);
    });

    it('should set and get if correctly', () => {
        const manager = new InterruptManager();
        manager.if = InterruptFlag.LCDStat | InterruptFlag.Serial;
        expect(manager.if).toBe(InterruptFlag.LCDStat | InterruptFlag.Serial);
    });

    it('should return the correct currentInterrupt', () => {
        const manager = new InterruptManager();
        manager.ie = InterruptFlag.VBlank | InterruptFlag.Timer;
        manager.if = InterruptFlag.VBlank | InterruptFlag.Serial;
        expect(manager.currentInterrupt).toBe(InterruptFlag.VBlank);
    });

    it('should return the correct currentInterruptVector', () => {
        const manager = new InterruptManager();
        manager.ie = InterruptFlag.VBlank;
        manager.if = InterruptFlag.VBlank;
        expect(manager.currentInterruptVector).toBe(0x40);
    });

    it('should return true for anyInterruptRequested when an interrupt is requested', () => {
        const manager = new InterruptManager();
        manager.ie = InterruptFlag.VBlank;
        manager.if = InterruptFlag.VBlank;
        expect(manager.anyInterruptRequested).toBe(true);
    });

    it('should return false for anyInterruptRequested when no interrupt is requested', () => {
        const manager = new InterruptManager();
        expect(manager.anyInterruptRequested).toBe(false);
    });

    it('should request an interrupt correctly', () => {
        const manager = new InterruptManager();
        manager.requestInterrupt(InterruptFlag.Timer);
        expect(manager.if).toBe(InterruptFlag.Timer);
    });

    it('should clear an interrupt correctly', () => {
        const manager = new InterruptManager();
        manager.requestInterrupt(InterruptFlag.Timer);
        manager.clearInterrupt(InterruptFlag.Timer);
        expect(manager.if).toBe(InterruptFlag.None);
    });
});
