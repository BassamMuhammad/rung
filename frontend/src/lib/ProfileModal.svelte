<script lang="ts">
	import { generateFullDeckFun } from 'svelte-playing-cards/Deck.svelte';
	import Card, { type CardType } from 'svelte-playing-cards/Card.svelte';
	import CustomCard from './CustomCard.svelte';
	import Modal from './Modal.svelte';
	import { authUserId, authUsername } from './stores/userCred';
	import Resizer from 'react-image-file-resizer';

	export let open = false;
	export let profilePic: string;
	export let frontCustomCards: Record<string, string> = {};
	export let backCustomCard: string;

	let frontCustomCardsFile: Record<string, File> = {};
	let backCustomCardFile: File;
	let profilePicFile: File;
	let inputRef: HTMLInputElement;
	let selected: CardType | 'backside' | 'profilePic';
	let loading = false;

	const getCards = () => {
		const cards = generateFullDeckFun({
			withBlackJoker: true,
			withRedJoker: true,
			shouldShuffle: false
		});
		cards.push('10-of-CLUBS'); //extra for backside
		return cards;
	};
	const cards = getCards();

	const updateProfile = async () => {
		try {
			loading = true;
			if (profilePicFile) {
				const formData = new FormData();
				formData.append('profilePic', profilePicFile);
				formData.append('userId', $authUserId);
				const profilePicRes = await fetch('http://localhost:4004/edit-pic', {
					method: 'POST',
					body: formData
				});
				if (!profilePicRes.ok) {
					alert('Error occured. Please try again');
					loading = false;
					return;
				}
				console.log('pfp');
			}
			console.log('customizw');
			const frontCustomCardsFileEntries = Object.entries(frontCustomCardsFile);
			if (frontCustomCardsFileEntries.length > 0 || backCustomCardFile) {
				const formData = new FormData();
				formData.append('userId', $authUserId);
				if (backCustomCardFile) {
					formData.append('customCards', backCustomCardFile);
					formData.append('customCardsValue', 'back');
				}
				frontCustomCardsFileEntries.forEach(([cards, file]) => {
					formData.append('customCards', file);
					formData.append('customCardsValue', cards);
				});
				const cardsRes = await fetch('http://localhost:4004/customize-cards', {
					method: 'POST',
					body: formData
				});
				if (cardsRes.ok) {
					alert('Profile updated');
				} else {
					alert('Error occured. Please try again');
				}
				loading = false;
			}
		} catch (error) {
			alert('Error occured. Please try again');
			loading = false;
		}
	};

	const resizeFile = (file: File) =>
		new Promise((resolve) => {
			Resizer.imageFileResizer(
				file,
				75,
				75,
				'JPEG',
				70,
				0,
				(uri) => {
					resolve(uri);
				},
				'file'
			);
		});

	const onFileSelected = async (
		e: Event & {
			currentTarget: EventTarget & HTMLInputElement;
		}
	) => {
		const file = (await resizeFile(e.currentTarget.files[0])) as File;
		let reader = new FileReader();
		reader.readAsDataURL(file);
		reader.onload = (e) => {
			const url = e.target.result as string;
			if (selected === 'profilePic') {
				profilePic = url;
				profilePicFile = file;
			} else if (selected === 'backside') {
				backCustomCard = url;
				backCustomCardFile = file;
			} else {
				frontCustomCards[selected] = url;
				frontCustomCardsFile[selected] = file;
			}
		};
	};
	const logout = () => {
		$authUsername = '';
		$authUserId = '';
		open = false;
	};
</script>

<Modal show={open} onBackDropClick={() => (open = false)} style="width:80%;padding:20px">
	<img
		on:click={() => {
			if (loading) return;
			inputRef.click();
			selected = 'profilePic';
		}}
		src={profilePic}
		alt="profile pic"
		class="profilePic"
	/>
	<h1>Username: {$authUsername}</h1>
	<div class="cards">
		<input
			style="display: none;"
			on:change={onFileSelected}
			type="file"
			accept=".jpg, .jpeg, .png"
			bind:this={inputRef}
		/>
		{#each cards as card, index}
			<Card
				onClick={() => {
					if (loading) return;
					if (index > 53) selected = 'backside';
					else selected = card;
					inputRef.click();
				}}
				{card}
				customFront={frontCustomCards[card] ? CustomCard : null}
				customFrontProps={frontCustomCards[card] ? { src: frontCustomCards[card], alt: card } : {}}
				customBack={backCustomCard ? CustomCard : null}
				customBackProps={backCustomCard ? { src: backCustomCard, alt: 'backside of a card' } : {}}
				showBackSide={index > 53}
				position="relative"
				width="75px"
				height="100px"
			/>
		{/each}
	</div>
	<div class="btns">
		{#if loading}
			<h1>Loading...</h1>
		{:else}
			<button on:click={updateProfile}>Update Profile</button>
			<button on:click={logout}>Log out</button>
		{/if}
	</div>
</Modal>

<style>
	.profilePic {
		width: 100px;
		height: 100px;
		border-radius: 50%;
		display: grid;
		margin: auto;
		cursor: pointer;
	}
	.cards {
		display: grid;
		grid-template-columns: repeat(13, 1fr);
		gap: 10px;
	}
	button {
		padding: 1.5em;
		border-radius: 5px;
		font-weight: bold;
		min-width: 11em;
		cursor: pointer;
		margin-left: 10px;
	}
	.btns {
		display: flex;
		justify-content: center;
	}
</style>
