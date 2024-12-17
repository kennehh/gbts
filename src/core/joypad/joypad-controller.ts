import { JoypadButton } from '../../common/enums';
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
    private register = 0xff as JoypadRegisterFlag;
    private static readonly directionButtons = JoypadButton.Up | JoypadButton.Down | JoypadButton.Left | JoypadButton.Right;
    private static readonly actionButtons = JoypadButton.A | JoypadButton.B | JoypadButton.Select | JoypadButton.Start;

    constructor(private readonly handler: IJoypadHandler) {}

    tick() {
        let state = 0x0f;
        if ((this.register & JoypadRegisterFlag.SelectActionNotSelected) === 0) {
            state
        }
    }

    reset() {
        this.register = 0xff as JoypadRegisterFlag;
    }

    private checkButtons(isAction: boolean) {
        const buttons = isAction ? JoypadController.actionButtons : JoypadController.directionButtons;
    }
}