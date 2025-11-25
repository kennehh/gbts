import { CpuState } from '@/core/cpu';
import { describe, it, expect, beforeEach } from 'vitest';

describe.concurrent('CpuState', () => {
    let state: CpuState;

    beforeEach(() => {
        state = new CpuState();
    });

    describe('8-bit registers', () => {
        it('should set and get registers', () => {
            state.a = 0xab;
            state.b = 0x12;
            state.c = 0x34;
            state.d = 0x56;
            state.e = 0x78;
            state.h = 0x90;
            state.l = 0xcd;
            state.f = 0xef;
            
            expect(state.a).toBe(0xab);
            expect(state.b).toBe(0x12);
            expect(state.c).toBe(0x34);
            expect(state.d).toBe(0x56);
            expect(state.e).toBe(0x78);
            expect(state.h).toBe(0x90);
            expect(state.l).toBe(0xcd);
            expect(state.f).toBe(0xef);
        });

        it('should handle 8-bit overflow', () => {
            state.b = 0x100;
            expect(state.b).toBe(0x00);
        });

        it('should handle negative values', () => {
            state.c = -1;
            expect(state.c).toBe(0xFF);
        });
    });

    describe('16-bit registers', () => {
        it('should set and get register pairs', () => {
            state.af = 0xABCD;
            state.bc = 0x1234;
            state.de = 0x5678;
            state.hl = 0x9ABC;

            expect(state.a).toBe(0xAB);
            expect(state.f).toBe(0xCD);
            expect(state.af).toBe(0xABCD);

            expect(state.b).toBe(0x12);
            expect(state.c).toBe(0x34);
            expect(state.bc).toBe(0x1234);

            expect(state.d).toBe(0x56);
            expect(state.e).toBe(0x78);
            expect(state.de).toBe(0x5678);

            expect(state.h).toBe(0x9A);
            expect(state.l).toBe(0xBC);
            expect(state.hl).toBe(0x9ABC);
        });

        it('should handle 16-bit overflow', () => {
            state.hl = 0x10000;
            expect(state.hl).toBe(0x0000);
        });

        it('should set SP and PC', () => {
            state.sp = 0xabcd;
            state.pc = 0x0100;
            expect(state.sp).toBe(0xabcd);
            expect(state.pc).toBe(0x0100);
        });
    });

    describe('reset', () => {
        it('should reset all registers', () => {
            state.a = 0x12;
            state.bc = 0x3456;
            state.de = 0x7890;
            state.hl = 0xABCD;
            state.sp = 0x1234;
            state.pc = 0x5678;
            state.f = 0xFF;

            state.reset(true);

            expect(state.a).toBe(0);
            expect(state.bc).toBe(0);
            expect(state.de).toBe(0);
            expect(state.hl).toBe(0);
            expect(state.sp).toBe(0);
            expect(state.pc).toBe(0);
            expect(state.f).toBe(0);
        });
    });

    describe('serialization', () => {
        it('should serialize and deserialize correctly', () => {
            state.af = 0x1234;
            state.bc = 0x5678;
            state.de = 0x9abc;
            state.hl = 0xdef0;
            state.pc = 0xfedc;
            state.sp = 0xba98;
            state.haltBugTriggered = true;

            const data = state.serialize();
            const newState = new CpuState();
            newState.deserialize(data);

            expect(newState.af).toBe(state.af);
            expect(newState.bc).toBe(state.bc);
            expect(newState.de).toBe(state.de);
            expect(newState.hl).toBe(state.hl);
            expect(newState.pc).toBe(state.pc);
            expect(newState.sp).toBe(state.sp);
            expect(newState.haltBugTriggered).toBe(state.haltBugTriggered);
        });
    });
});
