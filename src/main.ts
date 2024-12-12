import './style.css'
import { GameBoy } from './core/gameboy.ts';
import { CanvasDisplay } from './canvas-display.ts';

const display = new CanvasDisplay(document.getElementById('app')!);
const gb = new GameBoy(display);
gb.step();