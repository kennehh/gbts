// main.ts

import './style.css'
import { Emulator } from './web/emulator.ts';

// Main entry point
document.addEventListener('DOMContentLoaded', () => {
    const emulator = new Emulator(document.getElementById('app')!);
    // Set up file input handling
    const fileInput = document.getElementById('rom-input') as HTMLInputElement;

    fileInput.addEventListener('change', async (e: Event) => {
        const target = e.target as HTMLInputElement;
        const file = target.files?.[0];
        
        if (!file) {
            return;
        }

        try {
            await emulator.loadRom(file);
            emulator.run();
        } catch (error) {
            console.error('Error loading ROM:', error);
            alert('Failed to load ROM file');
        }

        target.value = '';
    });
});