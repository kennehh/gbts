// main.ts

import './style.css'
import { Emulator } from './web/emulator.ts';

// Main entry point
document.addEventListener('DOMContentLoaded', function () {
    const emulator = new Emulator(document.getElementById('app')!);
    // Set up file input handling
    const fileInput = document.getElementById('rom-input') as HTMLInputElement;

    async function handleFileChange(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;

        try {
            await emulator.loadRom(file);
        } catch (error) {
            console.error('Error loading ROM:', error);
            alert('Failed to load ROM file');
        }

        input.value = '';
    }

    fileInput.addEventListener('change', e => void handleFileChange(e));
    
    // fileInput.addEventListener('click', (e) => {
    //     console.log('click');
    //     emulator.createAudioContext();
    // });
});