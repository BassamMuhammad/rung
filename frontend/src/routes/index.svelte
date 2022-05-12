<script lang="ts">
	import Title from '$lib/Title.svelte';
	import Modal from '$lib/Modal.svelte';
	import Rules from '$lib/Rules.svelte';
	import { goto } from '$app/navigation';
	import { v4 } from '@lukeed/uuid';
	import { roomSocket } from '$lib/stores/roomSocket';

	let showRules = false;
	let askName = false;
	let username = '';
	let roomId = '';
	let loading = false;

	$roomSocket.once(`in-room`, (status, usernames, roomId) => {
		loading = false;
		goto(`/friendsRoom/${roomId}?username=${username}`);
	});

	$roomSocket.on('error', (message) => {
		alert(message);
		loading = false;
	});
	const playOnline = () => {};
	const getRules = () => (showRules = true);

	const playFriends = () => (askName = true);

	const handleRoom = async (type: 'join' | 'create', isFriendly: boolean) => {
		if (type === 'create' && roomId.trim()) {
			alert(
				'You have entered room id and want to to create a room. Remove room id to create a room'
			);
			return;
		}
		loading = true;
		$roomSocket.emit(`${type}-room`, username, type === 'join' ? roomId : v4());

		// try {
		// 	if (type === 'join' && roomId.length === 0) {
		// 		alert('Enter Room Id');
		// 		return;
		// 	}
		// 	const res = await fetch(`http://localhost:4001/${type}-room`, {
		// 		method: 'POST',
		// 		body: JSON.stringify({ isFriendly, username, roomId }),
		// 		headers: { 'Content-Type': 'application/json' }
		// 	});
		// 	const jsonRes = await res.json();
		// 	if (res.ok) {
		// 		goto(`/friendsRoom/${type === 'join' ? roomId : jsonRes['data']['roomId']}`);
		// 	} else {
		// 		alert(jsonRes['error']['message']);
		// 	}
		// } catch (error) {
		// 	alert('Error occured. Try again');
		// }
	};
</script>

<div class="container">
	<Title />
	<ul>
		<li><button on:click={playOnline}>Play Online</button></li>
		<li><button on:click={getRules}>Rules</button></li>
		<li><button on:click={playFriends}> Play with friends</button></li>
	</ul>

	<Modal show={showRules} onBackDropClick={() => (showRules = false)}>
		<Rules />
	</Modal>

	<Modal
		show={askName}
		onBackDropClick={() => (askName = false)}
		style="width:30%;height:20%;overflow:hidden"
	>
		<div class="friends-play">
			<!-- svelte-ignore a11y-autofocus -->
			<input
				class="friends-play-field"
				bind:value={username}
				placeholder="Name"
				required
				autofocus
			/>
			<input
				class="friends-play-field"
				bind:value={roomId}
				placeholder="Room Id - Only if you want to join a room"
			/>
			<div style="display: flex;justify-content:space-evenly;">
				{#if loading}
					<h4>Loading...</h4>
				{:else}
					<button on:click={() => handleRoom('join', true)} class="friends-play-btn"
						>Join Room</button
					>
					<button on:click={() => handleRoom('create', true)} class="friends-play-btn"
						>Create new room</button
					>
				{/if}
			</div>
		</div>
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
	.friends-play {
		display: flex;
		flex-direction: column;
		width: 100%;
		height: 100%;
		align-items: center;
		justify-content: center;
	}
	.friends-play-field {
		margin-top: 0.5em;
		width: 80%;
	}
	.friends-play-btn {
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
