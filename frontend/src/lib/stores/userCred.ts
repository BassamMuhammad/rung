import { writable } from 'svelte/store';
import { browser } from '$app/env';

export const authUserId = writable((browser && localStorage.getItem('authUserId')) || '');
export const authUsername = writable((browser && localStorage.getItem('authUsername')) || '');
authUserId.subscribe((val) => {
	if (browser) {
		return localStorage.setItem('authUserId', val);
	}
});
authUsername.subscribe((val) => {
	if (browser) {
		return localStorage.setItem('authUsername', val);
	}
});
