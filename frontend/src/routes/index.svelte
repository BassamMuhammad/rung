<script lang="ts">
	import Title from '$lib/Title.svelte';
	import Modal from '$lib/Modal.svelte';
	import Rules from '$lib/Rules.svelte';
	import { goto } from '$app/navigation';
	import { v4 } from '@lukeed/uuid';
	import { roomSocket } from '$lib/stores/roomSocket';
	import { browser } from '$app/env';
	import AuthFormModal from '$lib/AuthFormModal.svelte';
	import { myFetch } from '$lib/helper';

	let showRules = false;
	let showPlayModal = false;
	let showLoginForm = false;
	let username = '';
	let roomId = '';
	let showFriendRoomLoading = false;
	let authUsername = '';
	let authUserId = '';
	let showOnlineRoomLoading = false;
	$: if (browser) {
		authUsername = localStorage.getItem('authUsername');
		authUserId = localStorage.getItem('authUserId');
		if (authUsername) username = authUsername;
	}

	$roomSocket.once(`in-room`, (username, roomId, isFriendly) => {
		showFriendRoomLoading = false;
		goto(`/room/${roomId}?username=${username}&isFriendly=${isFriendly}`);
	});

	$roomSocket.on('error', (message) => {
		alert(message);
		showFriendRoomLoading = false;
	});
	const playOnline = async () => {
		if (
			authUsername &&
			authUserId &&
			(await myFetch('http://localhost:4003/check', 'POST', { authUsername, authUserId }))
		) {
			handleOnlineRoom();
		} else showLoginForm = true;
	};
	const getRules = () => (showRules = true);

	const playFriends = () => (showPlayModal = true);

	const handleFriendlyRoom = async (type: 'join' | 'create') => {
		if (username.trim().length === 0) {
			alert('Username should have atleast 1 letter');
			return;
		}
		if (type === 'create' && roomId.trim()) {
			alert(
				'You have entered room id and want to to create a room. Remove room id to create a room'
			);
			return;
		}
		showFriendRoomLoading = true;
		$roomSocket.emit(`${type}-room`, username, type === 'join' ? roomId : v4());
	};

	const handleOnlineRoom = () => {
		$roomSocket.emit('online-room', username);
		showOnlineRoomLoading = true;
	};
</script>

<div class="container">
	<div class="user">
		{#if authUsername && authUserId}
			<h1>{authUsername}</h1>
		{/if}
	</div>
	<Title />
	<ul>
		{#if !authUsername || !authUserId}
			<li><button on:click={() => (showLoginForm = true)}>Authenticate</button></li>
		{/if}
		<li><button on:click={playOnline}>Play Online</button></li>
		<li><button on:click={getRules}>Rules</button></li>
		<li><button on:click={playFriends}> Play with friends</button></li>
	</ul>

	<Modal show={showRules} onBackDropClick={() => (showRules = false)}>
		<Rules />
	</Modal>

	<Modal
		show={showPlayModal}
		onBackDropClick={() => (showPlayModal = false)}
		style="width:30%;height:20%;overflow:hidden"
	>
		<div class="play">
			<!-- svelte-ignore a11y-autofocus -->
			<input class="play-input" bind:value={username} placeholder="Name" required autofocus />
			<input
				class="play-input"
				bind:value={roomId}
				placeholder="Room Id - Only if you want to join a room"
			/>
			<div style="display: flex;justify-content:space-evenly;">
				{#if showFriendRoomLoading}
					<h4>Loading...</h4>
				{:else}
					<button on:click={() => handleFriendlyRoom('join')} class="play-btn">Join Room</button>
					<button on:click={() => handleFriendlyRoom('create')} class="play-btn">
						Create new room
					</button>
				{/if}
			</div>
		</div>
	</Modal>
	<AuthFormModal bind:open={showLoginForm} />
	<Modal show={showOnlineRoomLoading} style="width:20%;height:20%;overflow:hidden">
		<h1>Loading...</h1>
	</Modal>
</div>

<style>
	.container {
		width: 100vw;
		height: 100vh;
		display: flex;
		flex-direction: column;
		justify-content: center;
	}
	.user {
		color: white;
		position: absolute;
		top: 0;
		right: 0;
	}
	ul {
		display: flex;
		justify-content: space-evenly;
		align-items: center;
	}
	button {
		padding: 1.5em;
		border-radius: 5px;
		font-weight: bold;
		min-width: 11em;
		cursor: pointer;
	}
	.play {
		display: flex;
		flex-direction: column;
		width: 100%;
		height: 100%;
		align-items: center;
		justify-content: center;
	}
	.play-input {
		margin-top: 0.5em;
		width: 80%;
	}
	.play-btn {
		padding: 0.25em;
		margin-top: 0.5em;
		margin-right: 0.5em;
	}
	@media (max-width: 600px) {
		ul {
			flex-direction: column;
		}
		li {
			margin-bottom: 0.5em;
		}
	}
</style>
