<script lang="ts" context="module">
	import type { Load } from '@sveltejs/kit';

	export const load: Load = async ({ params, url }) => {
		const roomId = params['id'];
		const username = url.searchParams.get('username');
		const isFriendly = url.searchParams.get('isFriendly');
		return {
			props: {
				roomId,
				username,
				isFriendly
			}
		};
	};
</script>

<script lang="ts">
	import { roomSocket } from '$lib/stores/roomSocket';
	import { goto } from '$app/navigation';
	import { browser } from '$app/env';

	export let roomId: string;
	export let username: string;
	export let isFriendly: boolean;

	let users: string[] = [];
	let messageToSend = '';
	let messages: { username: string; text: string }[] = [];

	if (browser) {
		$roomSocket.emit('check-room', roomId, username, isFriendly);
		$roomSocket.on('check-room', (status, usersInRoom) => {
			if (!status) goto('/', { replaceState: true });
			else {
				users = [...users, ...usersInRoom];
				username = usersInRoom[usersInRoom.length - 1];
			}
		});
		$roomSocket.on('entered-room', (_users) => {
			users = _users;
		});
		$roomSocket.on('user-left', (_user) => {
			users = users.filter((user) => user !== _user);
		});
		$roomSocket.on('receive-message', (uName, message) => {
			messages = [...messages, { username: uName, text: message }];
		});
		$roomSocket.on('error', (message) => {
			alert(message);
			if (users.length === 0) goto('/', { replaceState: true });
		});
	}
	const sendMessage = () => {
		$roomSocket.emit('send-message', roomId, username, messageToSend);
		messages = [...messages, { username, text: messageToSend }];
		messageToSend = '';
	};
	$: if (users.length === 4) goto(`/play/${roomId}?username=${username}`, { replaceState: true });
</script>

<div class="container">
	<side class="sidebar">
		<h3>In Room - {users.length}/4</h3>
		{#each users as user}
			<h2 class="user">{user}</h2>
		{/each}
	</side>
	<div class="chat-container">
		<div class="messages-container">
			{#each messages as message (message)}
				<div
					class="message-container"
					style={message.username === username
						? 'background-color:lightgreen;margin-left:auto'
						: ''}
				>
					<h4 class="username">{message.username}</h4>
					<p class="message">{message.text}</p>
				</div>
			{/each}
		</div>
		<div class="send-message">
			<input class="message-field" type="text" bind:value={messageToSend} />
			<button class="message-btn" on:click={sendMessage}>Send</button>
		</div>
	</div>
</div>

<style>
	.container {
		display: flex;
		width: 100vw;
		height: 100vh;
	}
	.sidebar {
		width: 20%;
		padding: 5px;
		background-color: lightblue;
	}
	.user {
		background-color: white;
		margin-bottom: 5px;
		padding: 5px;
		border-radius: 5px;
		width: fit-content;
	}
	.chat-container {
		background-color: #fff;
		width: 80%;
	}
	.messages-container {
		height: 90%;
		overflow-y: scroll;
		padding: 10px;
	}
	.message-container {
		background-color: rgba(200, 200, 200, 0.5);
		padding: 10px;
		border-radius: 10px;
		width: 30%;
	}
	.username {
		padding: 0;
		margin: 0;
		border-bottom: 1px solid black;
	}
	.message {
		padding: 0;
		margin: 0;
	}
	.send-message {
		display: flex;
		height: 10%;
		width: 100%;
	}
	.message-field {
		height: 100%;
		width: 90%;
	}
	.message-btn {
		height: 100%;
		width: 10%;
	}
</style>
