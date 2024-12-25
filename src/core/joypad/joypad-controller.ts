import { JoypadButton } from '../../common/enums';
import { InterruptFlag, InterruptManager } from '../cpu/interrupt-manager';
import { IJoypadHandler } from './joypad-handler';

const enum JoypadRegisterFlag {
    DefaultState = 0b1100_1111,

    SelectActionNotSelected = 1 << 5,
    SelectDirectionNotSelected = 1 << 4,
    DownOrStartReleased = 1 << 3,
    UpOrSelectReleased = 1 << 2,
    LeftOrBReleased = 1 << 1,
    RightOrAReleased = 1 << 0,
}

export class JoypadController {
    private register = JoypadRegisterFlag.DefaultState;
    private lastRegister = JoypadRegisterFlag.DefaultState;
    private selectActionSelected = true;
    private selectDirectionSelected = true;
    private lastPressedButtons = JoypadButton.None;

    constructor(
        private readonly handler: IJoypadHandler,
        private readonly interruptManager: InterruptManager
    ) {}

    readRegister() {
        this.checkForInputs();
        return this.register;
    }

    writeRegister(value: number) {
        this.lastRegister = this.register;
        this.register = (this.register & 0b1100_1111) | (value & 0b0011_0000);
        this.selectActionSelected = (value & JoypadRegisterFlag.SelectActionNotSelected) === 0;
        this.selectDirectionSelected = (value & JoypadRegisterFlag.SelectDirectionNotSelected) === 0;
    }

    reset() {
        this.register = JoypadRegisterFlag.DefaultState;
    }

    private checkForInputs() {
        const pressedButtons = this.handler.getPressedButtons();
        const buttonsChanged = pressedButtons !== this.lastPressedButtons;
        const registerChanged = this.register !== this.lastRegister;

        if (!buttonsChanged && !registerChanged) {
            return;
        }

        this.lastPressedButtons = pressedButtons;

        let state = 0x0f;
        if (this.selectActionSelected) {
            state = this.checkButtons(true, pressedButtons);
        } else if (this.selectDirectionSelected) {
            state = this.checkButtons(false, pressedButtons);
        }

        this.register = (this.register & 0xf0) | state;
        this.interruptManager.requestInterrupt(InterruptFlag.Joypad);
    }

    private checkButtons(isAction: boolean, pressedButtons: number) {
        const state = isAction ? pressedButtons >> 4 : pressedButtons & 0x0f;
        return ~state & 0x0f;
    }
}