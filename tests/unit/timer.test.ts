import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Timer } from '../../src/emulator/timer';
import { InterruptManager, InterruptFlag } from '../../src/emulator/interrupt-manager';

describe('Timer', () => {
    let interruptManager: InterruptManager;
    let timer: Timer;

    beforeEach(() => {
        interruptManager = new InterruptManager();
        timer = new Timer(interruptManager);
    });

    describe('registers', () => {
        it('should write to DIV register', () => {
            timer.writeRegister(0xFF04, 123);
            expect(timer.readRegister(0xFF04)).toBe(0);
        });

        it('should write to TIMA register', () => {
            timer.writeRegister(0xFF05, 123);
            expect(timer.readRegister(0xFF05)).toBe(123);
        });

        it('should write to TMA register', () => {
            timer.writeRegister(0xFF06, 123);
            expect(timer.readRegister(0xFF06)).toBe(123);
        });

        it('should write to TAC register', () => {
            timer.writeRegister(0xFF07, 3);
            expect(timer.readRegister(0xFF07)).toBe(3);
        });

        it('should throw error for invalid register', () => {
            expect(() => timer.writeRegister(0xFF00, 123)).toThrow('Invalid timer register: ff00');
        });
    });

    describe('tick', () => {
        it('should increment DIV register', () => {
            for (let i = 0; i < 256; i++) {
                timer.tick();
            }
            expect(timer.readRegister(0xFF04)).toBe(1);
        });

        it('should reset DIV register when it overflows', () => {
            for (let i = 0; i < 256; i++) {
                timer.tick();
            }
            expect(timer.readRegister(0xFF04)).toBe(1);

            for (let i = 0; i < 256; i++) {
                timer.tick();
            }
            expect(timer.readRegister(0xFF04)).toBe(2);
        });

        it('should increment TIMA register when enabled', () => {
            timer.writeRegister(0xFF07, 0b101); // Enable timer with clock 16
            for (let i = 0; i < 16; i++) {
                timer.tick();
            }
            expect(timer.readRegister(0xFF05)).toBe(1);
        });

        it('should not increment TIMA register when disabled', () => {
            timer.writeRegister(0xFF07, 0b100); // Disable timer
            for (let i = 0; i < 16; i++) {
                timer.tick();
            }
            expect(timer.readRegister(0xFF05)).toBe(0);
        });

        it('should request interrupt when TIMA overflows', () => {
            interruptManager.ie = InterruptFlag.Timer;

            timer.writeRegister(0xFF07, 0b101); // Enable timer with clock 16
            timer.writeRegister(0xFF05, 0xFF); // Set TIMA to 255
            timer.writeRegister(0xFF06, 0xAA); // Set TMA to 170

            for (let i = 0; i < 16; i++) {
                timer.tick();
            }

            expect(timer.readRegister(0xFF05)).toBe(0xAA);
            expect(interruptManager.currentInterrupt).toBe(InterruptFlag.Timer);
        });
    });
});
