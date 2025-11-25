import { 
    type CpuStatusValue,
    CpuStatus,
    type RegisterFlagValue,
    RegisterFlag
} from "./types";

export class CpuState {
    private static readonly SERIALIZED_SIZE = 15;
    
    status: CpuStatusValue = CpuStatus.Running;
    haltBugTriggered = false;
    eiPending = false;

    currentInstructionCycles = 0;
    totalCycles = 0;

    a = 0;
    b = 0;
    c = 0;
    d = 0;
    e = 0;
    f = 0;
    h = 0;
    l = 0;

    pc = 0;
    sp = 0;

    reset(bootRomLoaded = false) {
        if (!bootRomLoaded) {
            this.af = 0x01b0;
            this.bc = 0x0013;
            this.de = 0x00d8;
            this.hl = 0x014d;
            this.pc = 0x0100;
            this.sp = 0xfffe;
        } else {
            this.af = 0;
            this.bc = 0;
            this.de = 0;
            this.hl = 0;
            this.pc = 0;
            this.sp = 0;
        }

        this.status = CpuStatus.Running;
        this.haltBugTriggered = false;
    }


    get af() { return (this.a << 8) | this.f; }
    set af(value: number) {
        this.a = value >> 8;
        this.f = value & 0xFF;
    }

    get bc() { return (this.b << 8) | this.c; }
    set bc(value: number) {
        this.b = value >> 8;
        this.c = value & 0xFF;
    }

    get de() { return (this.d << 8) | this.e; }
    set de(value: number) {
        this.d = value >> 8;
        this.e = value & 0xFF;
    }

    get hl() { return (this.h << 8) | this.l; }
    set hl(value: number) {
        this.h = value >> 8;
        this.l = value & 0xFF;
    }

    hasFlag(flag: RegisterFlagValue) {
        return (this.f & flag) === flag;
    }

    serialize(): Uint8Array {
        const buffer = new Uint8Array(CpuState.SERIALIZED_SIZE);
        const view = new DataView(buffer.buffer);

        view.setUint8(0, this.a);
        view.setUint8(1, this.b);
        view.setUint8(2, this.c);
        view.setUint8(3, this.d);
        view.setUint8(4, this.e);
        view.setUint8(5, this.f);
        view.setUint8(6, this.h);
        view.setUint8(7, this.l);

        view.setUint16(8, this.sp, true);
        view.setUint16(10, this.pc, true);
        
        // view.setUint8(12, this.halted ? 1 : 0);
        // view.setUint8(13, this.stopped ? 1 : 0);
        view.setUint8(14, this.haltBugTriggered ? 1 : 0);

        return buffer;
    }

    deserialize(data: Uint8Array) {
        if (data.length !== CpuState.SERIALIZED_SIZE) {
            throw new Error(`Invalid data size: ${data.length}`);
        }

        const view = new DataView(data.buffer);

        this.a = view.getUint8(0);
        this.b = view.getUint8(1);
        this.c = view.getUint8(2);
        this.d = view.getUint8(3);
        this.e = view.getUint8(4);
        this.f = view.getUint8(5);
        this.h = view.getUint8(6);
        this.l = view.getUint8(7);

        this.sp = view.getUint16(8, true);
        this.pc = view.getUint16(10, true);
        
        // this.halted = view.getUint8(12) === 1;
        // this.stopped = view.getUint8(13) === 1;
        this.haltBugTriggered = view.getUint8(14) === 1;
    }

    toString() {
        const flags = [
            this.hasFlag(RegisterFlag.Zero) ? 'Z' : '-',
            this.hasFlag(RegisterFlag.Subtract) ? 'N' : '-',
            this.hasFlag(RegisterFlag.HalfCarry) ? 'H' : '-',
            this.hasFlag(RegisterFlag.Carry) ? 'C' : '-'
        ].join('');

        const getRegString = (value: number) => value.toString(16).padStart(4, '0');

        return `AF=${getRegString(this.af)} ` +
               `BC=${getRegString(this.bc)} ` +
               `DE=${getRegString(this.de)} ` +
               `HL=${getRegString(this.hl)} ` +
               `SP=${getRegString(this.sp)} ` +
               `PC=${getRegString(this.pc)} ` +
               `FLAGS=${flags} ` + 
            //    `HALTED=${this.halted} ` +
            //    `STALLED=${this.stopped} ` +
               `HALT_BUG=${this.haltBugTriggered} `;
    }

    debugObject() {
        return {
            af: this.af,
            bc: this.bc,
            de: this.de,
            hl: this.hl,
            sp: this.sp,
            pc: this.pc,
            flags: {
                z: this.hasFlag(RegisterFlag.Zero),
                n: this.hasFlag(RegisterFlag.Subtract),
                h: this.hasFlag(RegisterFlag.HalfCarry),
                c: this.hasFlag(RegisterFlag.Carry),
            },
            // halted: this.halted,
            // stalled: this.stopped,
            haltBugTriggered: this.haltBugTriggered,
        };
    }
}
