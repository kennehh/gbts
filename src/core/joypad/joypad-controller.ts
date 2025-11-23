import { JoypadButton, type JoypadButtonValue } from '../../common/enums';
import { InterruptFlag, InterruptManager } from '../cpu';
import type { IJoypadHandler } from './types';

const enum JoypadRegisterFlag {
    DefaultState = 0b1100_1111,

    SelectActionNotSelected = 1 << 5,
    SelectDirectionNotSelected = 1 << 4,
    DownOrStartReleased = 1 << 3,
    UpOrSelectReleased = 1 << 2,
    LeftOrBReleased = 1 << 1,
    RightOrAReleased = 1 << 0,
}

export default class JoypadController {
    private register = JoypadRegisterFlag.DefaultState;
    private lastRegister = JoypadRegisterFlag.DefaultState;
    private selectActionSelected = true;
    private selectDirectionSelected = true;
    private lastPressedButtons: JoypadButtonValue = JoypadButton.None;

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
        this.lastRegister = JoypadRegisterFlag.DefaultState;
        this.selectActionSelected = true;
        this.selectDirectionSelected = true;
        this.lastPressedButtons = JoypadButton.None;
    }

    checkForInputs() {
        const pressedButtons = this.handler.getPressedButtons();
        if (pressedButtons === this.lastPressedButtons && this.register === this.lastRegister) {
            return;
        }

        this.lastRegister = this.register;
        this.lastPressedButtons = pressedButtons;
        const oldState = this.register & 0x0f;
        const actionState = this.checkButtons(true, pressedButtons);
        const directionState = this.checkButtons(false, pressedButtons);

        const highToLowTransitions = (oldState & ~(actionState & directionState)) & 0x0f
        if (highToLowTransitions !== 0) {
            this.interruptManager.requestInterrupt(InterruptFlag.Joypad);
        }

        let newState = 0x0f;
        if (this.selectActionSelected) {
            newState &= actionState;
        }
        if (this.selectDirectionSelected) {
            newState &= directionState;
        }

        this.register = (this.register & 0xf0) | newState;
    }

    private checkButtons(isAction: boolean, pressedButtons: number) {
        const state = isAction ? pressedButtons >> 4 : pressedButtons & 0x0f;
        return ~state & 0x0f;
    }
}