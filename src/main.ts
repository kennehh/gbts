// main.ts

import './style.css'
import { Emulator } from './web/emulator.ts';

// Main entry point
document.addEventListener('DOMContentLoaded', async function () {
    const emulator = new Emulator(document.getElementById('app')!);
    // Set up file input handling
    const fileInput = document.getElementById('rom-input') as HTMLInputElement;

    fileInput.addEventListener('change', async function () {
        const file = this.files?.[0];
        
        if (!file) {
            return;
        }

        try {
            await emulator.loadRom(file);
        } catch (error) {
            console.error('Error loading ROM:', error);
            alert('Failed to load ROM file');
        }

        this.value = '';
    });
    
    // fileInput.addEventListener('click', (e) => {
    //     console.log('click');
    //     emulator.createAudioContext();
    // });
});