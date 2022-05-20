import { writable } from 'svelte/store';
import { browser } from '$app/env';

export const gameState = writable((browser && localStorage.getItem('gameState')) || '');
gameState.subscribe((val) => {
	if (browser) {
		return localStorage.setItem('gameState', val);
	}
});
