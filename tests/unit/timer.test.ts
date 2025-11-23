import { describe, it, expect, beforeEach } from 'vitest';
import { Timer } from '../../src/core/timer/timer';
import { InterruptManager } from '../../src/core/cpu/interrupt-manager';
import { InterruptFlag } from '@/core/cpu';

describe('Timer', () => {
    let interruptManager: InterruptManager;
    let timer: Timer;

    beforeEach(() => {
        interruptManager = new InterruptManager();
        timer = new Timer(interruptManager);
        timer.reset(true);
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
            expect(timer.readRegister(0xFF07)).toBe(0b11111000 | 3);
        });

        it('should throw error for invalid register', () => {
            expect(() => timer.writeRegister(0xFF00, 123)).toThrow('Invalid timer register: ff00');
        });
    });

    describe('tick', () => {
        it('should increment DIV register', () => {
            for (let i = 0; i < 256 / 4; i++) {
                timer.tick4();
            }
            expect(timer.readRegister(0xFF04)).toBe(1);
        });

        it('should reset DIV register when it overflows', () => {
            for (let i = 0; i < 256 / 4; i++) {
                timer.tick4();
            }
            expect(timer.readRegister(0xFF04)).toBe(1);

            for (let i = 0; i < 256 / 4; i++) {
                timer.tick4();
            }
            expect(timer.readRegister(0xFF04)).toBe(2);
        });

        it('should increment TIMA register when enabled', () => {
            timer.writeRegister(0xFF07, 0b101); // Enable timer with clock 16
            for (let i = 0; i < 16 / 4; i++) {
                timer.tick4();
            }
            expect(timer.readRegister(0xFF05)).toBe(1);
        });

        it('should not increment TIMA register when disabled', () => {
            timer.writeRegister(0xFF07, 0b100); // Disable timer
            for (let i = 0; i < 16 / 4; i++) {
                timer.tick4();
            }
            expect(timer.readRegister(0xFF05)).toBe(0);
        });

        it('should request interrupt when TIMA overflows', () => {
            interruptManager.ie = InterruptFlag.Timer;

            timer.writeRegister(0xFF07, 0b101); // Enable timer with clock 16
            timer.writeRegister(0xFF05, 0xFF); // Set TIMA to 255
            timer.writeRegister(0xFF06, 0xAA); // Set TMA to 170

            for (let i = 0; i < 16 / 4; i++) {
                timer.tick4();
            }

            // TIMA should be zero after overflowing for 4 cycles
            expect(timer.readRegister(0xFF05)).toBe(0);

            timer.tick4();

            // TIMA should now be reloaded with TMA value and requests interrupt
            expect(timer.readRegister(0xFF05)).toBe(0xAA);
            expect(interruptManager.currentInterrupt).toBe(InterruptFlag.Timer);
        });
    });
});
