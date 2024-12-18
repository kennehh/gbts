import { JoypadButton } from '../../common/enums';
import { InterruptFlag, InterruptManager } from '../cpu/interrupt-manager';
import { IJoypadHandler } from './joypad-handler';

enum JoypadRegisterFlag {
    SelectActionNotSelected = 1 << 5,
    SelectDirectionNotSelected = 1 << 4,
    DownOrStartReleased = 1 << 3,
    UpOrSelectReleased = 1 << 2,
    LeftOrBReleased = 1 << 1,
    RightOrAReleased = 1 << 0,
}

export class JoypadController {
    private register = 0x0f as JoypadRegisterFlag;
    constructor(
        private readonly handler: IJoypadHandler,
        private readonly interruptManager: InterruptManager
    ) {}

    checkForInputs() {
        const oldState = this.register;

        let state = 0x0f;
        if ((this.register & JoypadRegisterFlag.SelectActionNotSelected) === 0) {
            state = this.checkButtons(true);
        } else if ((this.register & JoypadRegisterFlag.SelectDirectionNotSelected) === 0) {
            state = this.checkButtons(false);
        }
        this.register = (this.register & 0xf0) | state;

        if (oldState !== this.register) {
            this.interruptManager.requestInterrupt(InterruptFlag.Joypad);
        }
    }

    readRegister() {
        return this.register;
    }

    writeRegister(value: number) {
        this.register = (this.register & 0b1100_1111) | (value & 0b0011_0000);
    }

    reset() {
        this.register = 0x0f as JoypadRegisterFlag;
    }

    private checkButtons(isAction: boolean) {
        const pressedButtons = this.handler.getPressedButtons();
        const state = isAction ? pressedButtons >> 4 : pressedButtons & 0x0f;
        return ~state & 0x0f;
    }
}