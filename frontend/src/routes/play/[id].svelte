<script lang="ts" context="module">
	import type { Load } from '@sveltejs/kit';

	export const load: Load = async ({ params, url }) => {
		const roomId = params['id'];
		const username = url.searchParams.get('username');
		return {
			props: {
				roomId,
				username
			}
		};
	};
</script>

<script lang="ts">
	import Deck from 'svelte-playing-cards/Deck.svelte';
	import Card, {
		type CardType,
		type Suit,
		type ValueWithoutJoker
	} from 'svelte-playing-cards/Card.svelte';
	import Modal from '$lib/Modal.svelte';
	import { io } from 'socket.io-client';
	import { goto } from '$app/navigation';
	import { onDestroy, onMount } from 'svelte';

	export let roomId: string;
	export let username: string;

	let history: Record<string, string>[] = [{}];
	let allowed = false;
	let rungChoosingUserSide: Side = null;
	let isRungChooser: boolean = null;
	let deckComp: Deck;
	let centerDiv: HTMLDivElement;
	let showRungChooser = false;
	let rung: Suit;
	let playedCardsProps: SvelteAllProps[] = [];
	let connected = false;
	let loading = true;
	let turn = '';
	let deck: CardType[] = [];
	let turnStarterSuit: Suit;
	let initialDeal = false;
	let totalTricksPlayed = 0;
	let consecutiveTricksWon = 0;
	let consecutiveTricksUser = '';
	let myTeamTricks = 0;
	let opponentTeamTricks = 0;
	let gameComplete = false;
	let didWeWon = false;

	type Side = 'top' | 'bottom' | 'left' | 'right';

	const usersWithSides: Record<Side, string> = { bottom: '', right: '', top: '', left: '' };
	const sides: Record<Side, number> = { bottom: 0, right: 1, top: 2, left: 3 };
	const sideDivs: HTMLDivElement[] = [].fill(4);
	const sidesCardsProps: SvelteAllProps[][] = [[], [], [], []];
	const allRenderedCards: Record<Side, Card[]> = { top: [], bottom: [], left: [], right: [] };
	const gameplaySocket = io('http://localhost:4002/');

	gameplaySocket.on('connect', () => {
		connected = true;
		gameplaySocket.on('allowed', (uName) => {
			allowed = true;
			loading = false;
			username = uName;
		});
		gameplaySocket.on('not-allowed', (msg) => {
			alert(msg);
			goto('/', { replaceState: true });
		});
		gameplaySocket.on('rung', (rung: Suit) => chooseRung(rung, false));
		gameplaySocket.on('move', (username: string, index: number) => {
			makeTurn(index, username, false);
		});
		gameplaySocket.on('positions', (_users: string[]) => {
			const myUserIndex = _users.findIndex((user) => user === username);
			isRungChooser = myUserIndex === 0;
			usersWithSides['bottom'] = username;
			switch (myUserIndex) {
				case 0:
					rungChoosingUserSide = 'bottom';
					turn = 'bottom';
					usersWithSides['right'] = _users[1];
					usersWithSides['top'] = _users[2];
					usersWithSides['left'] = _users[3];
					break;
				case 1:
					rungChoosingUserSide = 'left';
					turn = 'left';
					usersWithSides['right'] = _users[2];
					usersWithSides['top'] = _users[3];
					usersWithSides['left'] = _users[0];
					break;
				case 2:
					rungChoosingUserSide = 'top';
					turn = 'top';
					usersWithSides['right'] = _users[3];
					usersWithSides['top'] = _users[0];
					usersWithSides['left'] = _users[1];
					break;
				default:
					rungChoosingUserSide = 'right';
					turn = 'right';
					usersWithSides['right'] = _users[0];
					usersWithSides['top'] = _users[1];
					usersWithSides['left'] = _users[2];
					break;
			}
		});
		gameplaySocket.on('deck', (_deck) => {
			deck = _deck;
			console.log(deck, 'on');
		});
		gameplaySocket.on('turn', (_user) => {
			const newTurn = Object.entries(usersWithSides).find(([side, user]) => user === _user)[0];
			turn = newTurn;
		});
	});

	$: if (connected) {
		gameplaySocket.emit('check', username, roomId);
	}

	const deal = async (index: number, numCards: 5 | 4, rungDeal = false, duration = 1000) => {
		await deckComp.gettingReady();
		if (isRungChooser && rungDeal) {
			deck = deckComp.getDeck();
			console.log(deck, 'asd');
			alert('check clg');
			gameplaySocket.emit('deck', deck, roomId);
			console.log(deck, 'em');
		}
		const { x, y } = sideDivs[index].getBoundingClientRect();
		const cards = deckComp.drawCards(numCards, x, y, { duration });
		setTimeout(() => {
			if (cards) {
				sidesCardsProps[index] = sidesCardsProps[index].concat(cards[2]);
			}
			if (rungDeal && !rung) showRungChooser = true;
		}, duration);
	};
	$: if (
		deckComp &&
		allowed &&
		rungChoosingUserSide &&
		!initialDeal &&
		(isRungChooser || deck.length > 0)
	) {
		initialDeal = true;
		deal(sides[rungChoosingUserSide], 5, true);
	}

	const chooseRung = (chosenRung: Suit, emitToOthers = true) => {
		rung = chosenRung;
		if (emitToOthers) gameplaySocket.emit('rung', rung, roomId);
		showRungChooser = false;
		const dealToAll = (numCards: 5 | 4, dealRungChooser = true) => {
			for (let i = sides[rungChoosingUserSide]; i < 4; i++) {
				if (!dealRungChooser && i === sides[rungChoosingUserSide]) continue;
				setTimeout(() => {
					deal(i, numCards, false);
				}, 1000 * i);
			}
			for (let i = 0; i < sides[rungChoosingUserSide]; i++) {
				setTimeout(() => {
					deal(i, numCards, false);
				}, 1000 * i);
			}
		};
		dealToAll(5, false);
		setTimeout(() => {
			dealToAll(4);
		}, 3100);
		setTimeout(() => {
			dealToAll(4);
			console.log('done', deck);
		}, 7100);
	};

	const isMoveValid = (playedCard: CardType, turnMakerRenderedCards: Card[]) => {
		if (!turnStarterSuit) return true;
		if (playedCard.includes(turnStarterSuit)) return true;
		for (const turnMakerCard of turnMakerRenderedCards) {
			if (turnMakerCard.getCard().includes(turnStarterSuit)) return false;
		}
		return true;
	};

	const cardStrToNumVal = (cardStrVal: ValueWithoutJoker) => {
		switch (cardStrVal) {
			case 'ACE':
				return 14;
			case 'KING':
				return 13;
			case 'QUEEN':
				return 12;
			case 'JACK':
				return 11;
			default:
				return parseInt(cardStrVal);
		}
	};

	const isNewSeniorCard = (currentSeniorCard: CardType, contenderCard: CardType): boolean => {
		const currnetSeniorCardSuit = currentSeniorCard.split('-')[2] as Suit;
		const contenderCardSuit = contenderCard.split('-')[2] as Suit;
		if (currnetSeniorCardSuit === contenderCardSuit) {
			const card1StrValue = currentSeniorCard.split('-')[0] as ValueWithoutJoker;
			const card2StrValue = contenderCard.split('-')[0] as ValueWithoutJoker;
			return cardStrToNumVal(card1StrValue) < cardStrToNumVal(card2StrValue);
		}
		return contenderCardSuit === rung;
	};

	const determineRoundWinner = () => {
		const lastTrick = history[history.length - 1];
		const lastTrickEntries = Object.entries(lastTrick);
		let seniorUser = lastTrickEntries[0][0];
		let seniorCard = lastTrickEntries[0][1];
		for (let i = 1; i < lastTrickEntries.length; i++) {
			if (isNewSeniorCard(seniorCard as CardType, lastTrickEntries[i][1] as CardType)) {
				seniorUser = lastTrickEntries[i][0];
				seniorCard = lastTrickEntries[i][1];
			}
		}
		if (consecutiveTricksUser === seniorUser) {
			consecutiveTricksWon++;
			if (
				(consecutiveTricksWon >= 2 && totalTricksPlayed > 3) ||
				(consecutiveTricksWon >= 3 && totalTricksPlayed <= 3)
			) {
				if (seniorUser === username || seniorUser === usersWithSides['top']) myTeamTricks++;
				else opponentTeamTricks++;
				consecutiveTricksWon = 0;
				seniorUser = '';
			}
		} else {
			consecutiveTricksUser = seniorUser;
			consecutiveTricksWon = 1;
		}
		return seniorUser;
	};

	const addToHistory = (turnMakerName: string, playedCard: CardType) => {
		let changedTurn = false;
		totalTricksPlayed++;
		const lastTrick = history[history.length - 1];
		const lastTrickLen = Object.entries(lastTrick).length;
		if (lastTrickLen === 4) {
			history = [...history, { [turnMakerName]: playedCard }];
		} else {
			history[history.length - 1][turnMakerName] = playedCard;
			if (lastTrickLen + 1 === 4) {
				alert('history');
				gameplaySocket.emit('trick', history, roomId);
				const nextTurnUser = determineRoundWinner();
				const nextTurnSide = Object.entries(usersWithSides).find(
					([side, user]) => user === nextTurnUser
				)[0];
				turn = nextTurnSide;
				changedTurn = true;
			}
		}
		return changedTurn;
	};

	const makeTurn = (index: number, turnMakerName: string, emitToOthers = true) => {
		const turnMakerSide = Object.entries(usersWithSides).find(
			([side, user]) => user === turnMakerName
		)[0] as Side;
		const renderedCardToPlay = allRenderedCards[turnMakerSide][index];
		const cardToPlay = renderedCardToPlay.getCard();
		console.log({ cardToPlay, turnMakerSide, turnMakerName });
		if (emitToOthers && !isMoveValid(cardToPlay, allRenderedCards[turnMakerSide])) {
			alert('Invalid card. Match the suit');
			return;
		}
		turnStarterSuit = cardToPlay.split('-')[2] as Suit;
		const changedTurn = addToHistory(turnMakerName, cardToPlay);
		if (emitToOthers) {
			gameplaySocket.emit('move', roomId, turnMakerName, index);
			if (!changedTurn) nextTurn(turnMakerSide);
		}
		const { x, y } = centerDiv.getBoundingClientRect();
		const duration = 1000;
		const cardProps = renderedCardToPlay.transitionToTarget(x, y, { duration });
		let topPosition = '110px';
		let leftPosition = '0px';

		switch (turnMakerSide) {
			case 'top':
				topPosition = '-110px';
				leftPosition = '0px';
				break;
			case 'left':
				leftPosition = '-80px';
				topPosition = '0px';
				break;
			case 'right':
				leftPosition = '80px';
				topPosition = '0px';
				break;
			default:
				break;
		}
		setTimeout(() => {
			playedCardsProps = playedCardsProps.concat({
				...cardProps,
				topPosition,
				leftPosition
			});
			if (totalTricksPlayed === 13) gameComplete = true;
		}, duration);
	};

	const nextTurn = (side: string) => {
		switch (side as Side) {
			case 'bottom':
				turn = 'right';
				break;
			case 'right':
				turn = 'top';
				break;
			case 'top':
				turn = 'left';
				break;
			default:
				turn = 'bottom';
		}
		gameplaySocket.emit('turn', usersWithSides[turn], roomId);
	};
	$: console.log(deck, 'p');

	$: if (gameComplete) {
		didWeWon = myTeamTricks > opponentTeamTricks;
	}
	const confirmQuit = (e: BeforeUnloadEvent) => {
		e.preventDefault();
		if (e.type === 'beforeunload') {
			e.returnValue = '';
		}
	};
	onMount(() => window.addEventListener('beforeunload', confirmQuit));

	onDestroy(() => window.removeEventListener('beforeunload', confirmQuit));
</script>

<div class="container">
	{#if loading}
		<h1 class="center">Loading...</h1>
	{:else}
		{#each Object.entries(sides) as [side, num]}
			<h3 class={`${side}-name name`} style={`color: ${turn === side ? 'yellow' : 'white'}`}>
				{usersWithSides[side]}{turn === side ? '*' : ''}
			</h3>
			<div bind:this={sideDivs[num]} class={side}>
				{#each sidesCardsProps[num] as cardProps, index (`${side}-${index}`)}
					<svelte:component
						this={Card}
						bind:this={allRenderedCards[side][index]}
						{...cardProps}
						onDblClick={() => {
							if (turn === 'bottom') {
								makeTurn(index, username);
							}
						}}
						topPosition={side === 'top' || side === 'bottom' ? '0px' : `${index * 80}px`}
						showBackSide={false}
						shouldRotate={side === 'left' || side === 'right'}
						leftPosition={side === 'left' || side === 'right' ? '10px' : `${index * 80}px`}
					/>
				{/each}
			</div>
		{/each}
		<div bind:this={centerDiv} class="center">
			<h3>{rung}</h3>
			<Deck
				shouldShuffle={false}
				{deck}
				onClick={() => {}}
				onDblClick={() => {}}
				bind:this={deckComp}
				cardWidth="75px"
				cardHeight="100px"
			/>
			{#each playedCardsProps as cardProps, index}
				<svelte:component this={Card} {...cardProps} showBackSide={false} shouldRotate={false} />
			{/each}
		</div>
		<Modal transparentBackDrop show={showRungChooser} style="height:150px;overflow:hidden">
			<div>
				<h1>
					{isRungChooser
						? 'Choose Rung'
						: `${usersWithSides[rungChoosingUserSide]} is choosing Rung`}
				</h1>
				{#if isRungChooser}
					<div style="display: flex;justify-content:space-evenly">
						<button on:click={() => chooseRung('SPADES')}>SPADES</button>
						<button on:click={() => chooseRung('DIAMONDS')}>DIAMONDS</button>
						<button on:click={() => chooseRung('HEARTS')}>HEARTS</button>
						<button on:click={() => chooseRung('CLUBS')}>CLUBS</button>
					</div>
				{/if}
			</div>
		</Modal>
		<Modal transparentBackDrop show={gameComplete} style="height:100px;overflow:hidden">
			<div>
				<h1>
					You {didWeWon ? 'Won' : `Lose`}
				</h1>
			</div>
		</Modal>
	{/if}
</div>

<style>
	.container {
		width: 100vw;
		height: 100vh;
	}
	.center {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
	}
	.left {
		position: absolute;
		top: 10%;
		height: 80%;
		width: 125px;
		background-color: green;
		overflow-y: scroll;
	}
	.right {
		position: absolute;
		top: 10%;
		left: calc(100% - 125px);
		height: 80%;
		width: 125px;
		background-color: green;
		overflow-y: scroll;
	}
	.top {
		position: absolute;
		left: 10%;
		width: 80%;
		height: 125px;
		background-color: blue;
		overflow-x: scroll;
	}

	.bottom {
		position: absolute;
		left: 10%;
		top: calc(100% - 125px);
		width: 80%;
		height: 125px;
		background-color: blue;
		overflow-x: scroll;
	}
	.top-name {
		position: absolute;
		left: 90.5%;
		top: -10px;
		background-color: blue;
	}
	.left-name {
		position: absolute;
		top: -10px;
		left: -0px;
		background-color: green;
	}
	.right-name {
		position: absolute;
		top: 88%;
		left: calc(100% - 125px);
		background-color: green;
	}
	.bottom-name {
		position: absolute;
		left: 0px;
		top: 88%;
		background-color: blue;
	}
	.name {
		word-wrap: break-word;
		word-break: break-all;
		z-index: 10;
		height: 8%;
		width: 8%;
	}
</style>
