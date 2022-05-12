import { io } from 'socket.io-client';
import { readable } from 'svelte/store';

const socket = io('http://localhost:4001/');

socket.on('connect', () => {
	console.log('connected');
});
export const roomSocket = readable(socket);
