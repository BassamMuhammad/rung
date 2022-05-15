<script lang="ts">
	import cookie from 'cookie';
	import { myFetch } from './helper';
	import Modal from './Modal.svelte';

	export let open: boolean;

	let username = '';
	let email = '';
	let password = '';
	let profilePic: File;
	let profilePicUrl: string =
		'https://cdn4.iconfinder.com/data/icons/small-n-flat/24/user-alt-512.png';
	let profilePicRef: HTMLInputElement;
	let isSignup = true;
	let loading = false;

	const onClick = async (
		e: SubmitEvent & {
			currentTarget: EventTarget & HTMLFormElement;
		}
	) => {
		e.preventDefault();
		let res: Response;
		loading = true;
		try {
			if (isSignup) {
				if (!username.trim()) {
					alert('Username should have atleast 1 letter');
					return;
				}
				if (password.length < 8) {
					alert('Password should be minimum 8 charaters long');
					return;
				}
				res = await myFetch('http://localhost:4003/signup', 'POST', {
					username,
					email,
					password,
					profilePic
				});
			} else {
				res = await myFetch('http://localhost:4003/signin', 'POST', { email, password });
			}
			const jsonRes = await res.json();
			if (res.ok) {
				const { userId, username } = jsonRes['data'];
				localStorage.setItem('authUsername', username);
				localStorage.setItem('authUserId', userId);
				open = false;
			} else {
				alert(jsonRes['error']['message'].replace('Firebase', ''));
			}
			loading = false;
		} catch (error) {
			alert('Error occured. Please try again' + error);
			loading = false;
		}
	};
	const onFileSelected = (
		e: Event & {
			currentTarget: EventTarget & HTMLInputElement;
		}
	) => {
		profilePic = e.currentTarget.files[0];
		let reader = new FileReader();
		reader.readAsDataURL(profilePic);
		reader.onload = (e) => {
			profilePicUrl = e.target.result as string;
		};
	};
</script>

<Modal
	show={open}
	onBackDropClick={() => (open = false)}
	style={`width:30%;height:${isSignup ? '70%' : '50%'};overflow:hidden`}
>
	<form class="container" action="" on:submit={onClick}>
		{#if isSignup}
			<input
				style="display: none;"
				on:change={onFileSelected}
				type="file"
				accept=".jpg, .jpeg, .png"
				bind:this={profilePicRef}
			/>
			<img
				on:click={() => profilePicRef.click()}
				class="pic"
				src={profilePicUrl}
				alt="profile pic"
			/>
			<input class="input" type="text" placeholder="username" bind:value={username} required />
		{/if}
		<input class="input" type="email" placeholder="email" bind:value={email} required />
		<input class="input" type="password" placeholder="password" bind:value={password} required />
		{#if loading}
			<h4>Loading...</h4>
		{:else}
			<button class="btn">{isSignup ? 'Signup' : 'Login'}</button>
			<p style="cursor: pointer;" on:click={() => (isSignup = !isSignup)}>
				{isSignup ? 'Already have an account. Login' : 'Dont have an account. Signup'}
			</p>
		{/if}
	</form>
</Modal>

<style>
	.container {
		display: flex;
		flex-direction: column;
		width: 100%;
		height: 100%;
		align-items: center;
		justify-content: center;
	}
	.pic {
		width: 75px;
		height: 75px;
		border-radius: 50%;
	}
	.input {
		margin-top: 0.5em;
		width: 80%;
	}
	.btn {
		padding: 0.25em;
		margin-top: 0.5em;
		margin-right: 0.5em;
	}
</style>
