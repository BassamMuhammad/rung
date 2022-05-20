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
	import { browser } from '$app/env';
	import { gameState } from '$lib/stores/gameState';

	export let roomId: string;
	export let username: string;

	let history: Record<string, string>[] = [{}];
	let sidesLeft: string[] = [];
	let allowed = false;
	let rungChoosingUserSide: Side;
	let isRungChooser: boolean;
	let deckComp: Deck;
	let centerDiv: HTMLDivElement;
	let showRungChooser = false;
	let rung: Suit;
	let playedCardsProps: SvelteAllProps[] = [];
	let connected = false;
	let loading = true;
	let turn = '';
	let deck: CardType[] = [];
	let trickSuit: Suit;
	let dealStatus: DealStatus = 'aboutTo';
	let totalTricksPlayed = 0;
	let consecutiveTricksWon = 0;
	let consecutiveTricksUser = '';
	let myTeamTricks = 0;
	let opponentTeamTricks = 0;
	let startGame = false;
	let gameComplete = false;
	let didWeWon = false;
	let playedCards: CardType[] = [];
	let moveTimer = 0;
	let moveTimerStopper: NodeJS.Timer;
	let forceTimer = 0;
	let forceTimerStopper: NodeJS.Timer;
	let forceChange = false;
	let fastTransition = false;
	let movesUptoDate = false;
	let synchronize = false;

	type Side = 'top' | 'bottom' | 'left' | 'right';
	type DealStatus = 'aboutTo' | 'start' | 'rung' | 'first' | 'second' | 'done';

	const usersWithSides: Record<Side, string> = { bottom: '', right: '', top: '', left: '' };
	const sides: Record<Side, number> = { bottom: 0, right: 1, top: 2, left: 3 };
	const sideDivs: HTMLDivElement[] = [].fill(4);
	const sidesCardsProps: SvelteAllProps[][] = [[], [], [], []];
	const allRenderedCards: Record<Side, Card[]> = { top: [], bottom: [], left: [], right: [] };
	const gameplaySocket = io('http://localhost:4002/');

	gameplaySocket.on('connect', () => {
		connected = true;
		gameplaySocket.on('allowed', (uName) => {
			$gameState = JSON.stringify({ roomId, username, place: 'play' });
			allowed = true;
			loading = false;
			username = uName;
		});
		gameplaySocket.on('not-allowed', (msg) => {
			alert(msg);
			$gameState = '';
			goto('/', { replaceState: true });
		});
		gameplaySocket.on('rung', (rung: Suit) => {
			chooseRung(rung, false);
			alert(`Rung is ${rung}`);
		});
		gameplaySocket.on('move-history', async (_history: Record<string, string>[]) => {
			history = _history;
			if (!startGame || dealStatus !== 'done') return;
			await playFromHistory(true);
			synchronize = false;
		});
		gameplaySocket.on('reject-force', () => {
			forceChange = true;
		});
		gameplaySocket.on('positions', (_users: string[], _usersLeft: string[]) => {
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
			if (_usersLeft && _usersLeft.length > 0) {
				_usersLeft.forEach((userLeft) => {
					const sideLeft = Object.entries(usersWithSides).find(
						([side, user]) => user === userLeft
					)[0];
					sidesLeft = [...sidesLeft, sideLeft];
				});
			}
		});
		gameplaySocket.on('deck', (_deck) => {
			if (_deck) deck = _deck;
		});
		gameplaySocket.on('turn', (_user) => {
			const newTurn = Object.entries(usersWithSides).find(([side, user]) => user === _user)[0];
			turn = newTurn;
		});
		gameplaySocket.on('start-game', (_startGame: boolean, _history: Record<string, string>[]) => {
			if (forceTimerStopper) clearInterval(forceTimerStopper);
			startGame = _startGame;
			if (
				_history &&
				(history.length < _history.length ||
					Object.entries(history[history.length]).length <
						Object.entries(_history[_history.length]).length)
			) {
				history = _history;
			} else movesUptoDate = true;
		});
		gameplaySocket.on('user-left', (_user) => {
			const userSide = Object.entries(usersWithSides).find(([side, user]) => user === _user)[0];
			sidesLeft = [...sidesLeft, userSide];
		});
		gameplaySocket.on('reconnect', (_user) => {
			const userSide = Object.entries(usersWithSides).find(([side, user]) => user === _user)[0];
			sidesLeft = sidesLeft.filter((sideLeft) => sideLeft !== userSide);
			usersWithSides[userSide] = _user;
		});
	});
	const playFromHistory = async (addToHistory: boolean) => {
		for (let i = totalTricksPlayed; i < history.length; i++) {
			const move = history[i];
			playedCards;
			const moves = Object.entries(move);
			for (let j = 0; j < moves.length; j++) {
				const [username, card] = moves[j];
				if (playedCards.includes(card as CardType)) continue;
				const turnMakerWithSide = Object.entries(usersWithSides).find(
					([side, uName]) => uName === username
				);
				const cardIndex = allRenderedCards[turnMakerWithSide[0] as Side].findIndex(
					(renderedCard) => card === renderedCard.getCard()
				);
				await makeTurn(cardIndex, turnMakerWithSide[1], false, false, addToHistory);
			}
		}
	};

	$: if (connected) {
		gameplaySocket.emit('check', username, roomId);
	}

	$: if (startGame && !moveTimerStopper && dealStatus === 'done' && !synchronize && movesUptoDate) {
		if (moveTimer) clearInterval(moveTimer);
		moveTimerStopper = setInterval(() => (moveTimer += 1), 1000);
	}
	forceTimerStopper = setInterval(() => (forceTimer += 1), 1000);

	const makeMovesUptoDate = async () => {
		synchronize = true;
		fastTransition = true;
		await playFromHistory(false);
		fastTransition = false;
		movesUptoDate = true;
		setTimeout(() => {
			synchronize = false;
		}, 1000 * 30);
	};

	$: if (startGame && dealStatus === 'done' && !movesUptoDate) {
		makeMovesUptoDate();
	}

	const forceStart = () => {
		let event: string;
		if (!usersWithSides['bottom']) event = 'positions';
		else if (!rungChoosingUserSide && deck.length === 0) {
			if (deckComp) {
				deck = deckComp.getDeck();
				event = 'deck';
			}
		} else if (!rung) {
			chooseRung('SPADES', false);
			alert('Rung is SPADES');
			event = 'rung';
		} else event = 'start';
		gameplaySocket.emit(
			'force-start',
			roomId,
			event,
			forceChange,
			deckComp && deckComp.getDeck(),
			rung
		);
	};
	$: if (forceTimer - 60 === 0) {
		forceTimer = 0;
		forceStart();
	}
	const deal = async (
		index: number,
		numCards: 5 | 4,
		_dealStatus: DealStatus,
		changeDealStatus: boolean,
		duration = 1000
	) => {
		if (_dealStatus === 'rung') await deckComp.gettingReady(500 * 8);
		if (isRungChooser && _dealStatus === 'rung' && !fastTransition) {
			gameplaySocket.emit('deck', deckComp.getDeck(), roomId);
		}
		let { x, y } = sideDivs[index].getBoundingClientRect();
		const cards = await deckComp.drawCards(numCards, x, y, {
			duration: fastTransition ? 5 : duration
		});
		sidesCardsProps[index] = sidesCardsProps[index].concat(cards[2]);
		if (changeDealStatus) dealStatus = _dealStatus;
		if (_dealStatus === 'rung' && !rung) {
			showRungChooser = true;
		}
	};
	const dealToAll = async (numCards: 5 | 4, dealStatus: DealStatus, dealRungChooser = true) => {
		for (let i = sides[rungChoosingUserSide]; i < 4; i++) {
			if (!dealRungChooser && i === sides[rungChoosingUserSide]) continue;
			const changeDealStatus = sides[rungChoosingUserSide] === 0 && i === 3;
			await deal(i, numCards, dealStatus, changeDealStatus);
		}
		for (let i = 0; i < sides[rungChoosingUserSide]; i++) {
			await deal(i, numCards, dealStatus, i === sides[rungChoosingUserSide] - 1);
		}
	};
	$: if (
		deckComp &&
		allowed &&
		rungChoosingUserSide &&
		dealStatus === 'aboutTo' &&
		(isRungChooser || deck.length > 0)
	) {
		dealStatus = 'start';
		deal(sides[rungChoosingUserSide], 5, 'rung', true);
	}

	$: if (rung && dealStatus === 'rung') {
		dealToAll(5, 'first', false);
	}
	$: if (rung && dealStatus === 'first') dealToAll(4, 'second');
	$: if (rung && dealStatus === 'second') {
		dealToAll(4, 'done');
	}
	$: if (dealStatus === 'done') {
		gameplaySocket.emit('deal', username, roomId);
	}

	const chooseRung = (chosenRung: Suit, emitToOthers = true) => {
		rung = chosenRung;
		if (emitToOthers) gameplaySocket.emit('rung', rung, roomId);
		showRungChooser = false;
	};

	const isMoveValid = (playedCard: CardType, turnMakerRenderedCards: Card[]) => {
		if (!trickSuit) return true;
		if (playedCard.includes(trickSuit)) return true;
		for (const turnMakerRenderedCard of turnMakerRenderedCards) {
			const turnMakerCard = turnMakerRenderedCard.getCard();
			if (turnMakerCard.includes(trickSuit) && !playedCards.includes(turnMakerCard)) return false;
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
				(consecutiveTricksWon === 2 && totalTricksPlayed > 3) ||
				(consecutiveTricksWon === 3 && totalTricksPlayed <= 3) ||
				totalTricksPlayed === 13
			) {
				const tricksWon = totalTricksPlayed - myTeamTricks - opponentTeamTricks;
				if (seniorUser === username || seniorUser === usersWithSides['top'])
					myTeamTricks += tricksWon;
				else opponentTeamTricks += tricksWon;
				consecutiveTricksWon = 0;
			}
		} else {
			consecutiveTricksUser = seniorUser;
			consecutiveTricksWon = 1;
		}
		return seniorUser;
	};
	const addToHistory = (turnMakerName: string, playedCard: CardType) => {
		let changedTurn = false;
		playedCards.push(playedCard);
		const lastTrick = history[history.length - 1];
		const lastTrickLen = Object.entries(lastTrick).length;
		if (lastTrickLen === 4) {
			history = [...history, { [turnMakerName]: playedCard }];
		} else {
			history[history.length - 1][turnMakerName] = playedCard;
			//prev trick len + 1 added now === 4
			if (lastTrickLen + 1 === 4) {
				totalTricksPlayed++;
				const nextTurnUser = determineRoundWinner();
				const nextTurnSide = Object.entries(usersWithSides).find(
					([side, user]) => user === nextTurnUser
				)[0];
				trickSuit = null;
				turn = nextTurnSide;
				changedTurn = true;
			}
		}
		gameplaySocket.emit('history', history, roomId);
		return changedTurn;
	};

	const makeBotTurn = async () => {
		const turnMakerName = Object.entries(usersWithSides).find(([side, user]) => side === turn)[1];
		for (let i = 0; i < allRenderedCards[turn].length; i++) {
			if (playedCards.includes(allRenderedCards[turn][i].getCard())) continue;
			const success = await makeTurn(i, turnMakerName, false, true);
			if (success) break;
		}
	};
	$: if ((turn && sidesLeft.includes(turn)) || (moveTimer % 10 === 0 && moveTimer !== 0)) {
		moveTimer = 0;
		makeBotTurn();
	}
	const makeTurn = async (
		index: number,
		turnMakerName: string,
		emitToOthers = true,
		botMove = false,
		changeHistory = true
	) => {
		const turnMakerSide = Object.entries(usersWithSides).find(
			([side, user]) => user === turnMakerName
		)[0] as Side;
		const renderedCardToPlay = allRenderedCards[turnMakerSide][index];
		const cardToPlay = renderedCardToPlay.getCard();
		if (!trickSuit) trickSuit = cardToPlay.split('-')[2] as Suit;
		if (emitToOthers || botMove) {
			if (!isMoveValid(cardToPlay, allRenderedCards[turnMakerSide])) {
				if (!botMove) alert('Invalid card. Match the suit');
				return false;
			}
		}
		if (changeHistory) {
			const changedTurn = addToHistory(turnMakerName, cardToPlay);
			if (!changedTurn) nextTurn(turnMakerSide, emitToOthers);
		}
		if (emitToOthers) {
			gameplaySocket.emit('move-history', roomId, history);
		}
		const { x, y } = centerDiv.getBoundingClientRect();
		const cardProps = await renderedCardToPlay.transitionToTarget(x, y, {
			duration: fastTransition ? 5 : 1000
		});
		let topPosition = '0px';
		let leftPosition = '0px';

		switch (turnMakerSide) {
			case 'top':
				topPosition = '-110px';
				leftPosition = '0px';
				break;
			case 'left':
				leftPosition = '-80px';
				topPosition = '-55px';
				break;
			case 'right':
				leftPosition = '80px';
				topPosition = '-55px';
				break;
			default:
				break;
		}
		playedCardsProps = playedCardsProps.concat({
			...cardProps,
			topPosition,
			leftPosition
		});
		if (totalTricksPlayed === 13) {
			gameComplete = true;
			clearInterval(moveTimerStopper);
		}
		return true;
	};

	const nextTurn = (side: string, emitToOthers = true) => {
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
		if (emitToOthers) gameplaySocket.emit('turn', usersWithSides[turn], roomId);
	};

	$: if (gameComplete) {
		didWeWon = myTeamTricks > opponentTeamTricks;
		$gameState = '';
		let winners: [string, string];
		if (didWeWon) {
			winners = [usersWithSides['bottom'], usersWithSides['top']];
		} else {
			winners = [usersWithSides['left'], usersWithSides['right']];
		}
		gameplaySocket.emit('onEnd', rung, winners, history, roomId);
	}
	const confirmQuit = (e: BeforeUnloadEvent) => {
		e.preventDefault();
		if (e.type === 'beforeunload') {
			e.returnValue = '';
		}
	};
	onMount(() => window.addEventListener('beforeunload', confirmQuit));

	onDestroy(() => {
		if (browser) window.removeEventListener('beforeunload', confirmQuit);
	});
</script>

<div class="container">
	{#if loading || !rungChoosingUserSide}
		<h1 class="center">{loading ? 'Loading' : 'Waiting for others'}...</h1>
	{:else}
		{#each Object.entries(sides) as [side, num]}
			<h3 class={`${side}-name name`} style={`color: ${turn === side ? 'yellow' : 'white'}`}>
				{sidesLeft.includes(side) ? `Bot ${side}` : usersWithSides[side]}{turn === side ? '*' : ''}
				<h5 class="trick-score">
					{side === 'bottom'
						? `x${myTeamTricks}`
						: side === 'right'
						? `x${opponentTeamTricks}`
						: ''}
				</h5>
			</h3>
			<div bind:this={sideDivs[num]} class={side}>
				{#each sidesCardsProps[num] as cardProps, index (`${side}-${index}`)}
					<svelte:component
						this={Card}
						bind:this={allRenderedCards[side][index]}
						{...cardProps}
						onDblClick={async () => {
							if (turn === 'bottom' && startGame && movesUptoDate) {
								await makeTurn(index, username);
							}
						}}
						topPosition={side === 'top' || side === 'bottom' ? '0px' : `${index * 80}px`}
						leftPosition={side === 'left' || side === 'right' ? '10px' : `${index * 80}px`}
						showBackSide={side !== 'bottom'}
						shouldRotate={side === 'left' || side === 'right'}
					/>
				{/each}
			</div>
		{/each}
		<div bind:this={centerDiv} class="center">
			{#key deck}
				<div style={`display:${dealStatus === 'done' ? 'none' : 'inline'}`}>
					<Deck
						shouldShuffle={false}
						{deck}
						onClick={() => {}}
						onDblClick={() => {}}
						bind:this={deckComp}
						cardWidth="75px"
						cardHeight="100px"
					/>
				</div>
			{/key}
			{#each playedCardsProps as cardProps}
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
		<Modal
			onBackDropClick={() => goto('/', { replaceState: true })}
			show={gameComplete}
			style="height:150px;overflow:hidden"
		>
			<h1>You {didWeWon ? 'Won' : `Lose`}</h1>
			<button on:click={() => goto('/', { replaceState: true })}>Return</button>
		</Modal>
		<Modal
			transparentBackDrop
			show={dealStatus === 'done' && !startGame}
			style="height:100px;overflow:hidden"
		>
			<h1>Waiting for others...</h1>
		</Modal>
		<Modal transparentBackDrop show={synchronize} style="height:100px;overflow:hidden">
			<h1>Synchronizing with others</h1>
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
		top: 0;
		background-color: blue;
	}
	.left-name {
		position: absolute;
		top: 1.5%;
		left: 0;
		background-color: green;
	}
	.right-name {
		position: absolute;
		top: 90.5%;
		left: calc(100% - 125px);
		background-color: green;
	}
	.bottom-name {
		position: absolute;
		left: 1.5%;
		top: 92%;
		background-color: blue;
	}
	.name {
		word-wrap: break-word;
		word-break: break-all;
		z-index: 10;
		height: 8%;
		width: 8%;
		margin: 0;
	}
	.trick-score {
		position: absolute;
		right: -5%;
		bottom: 0;
		z-index: 20;
		margin: 0;
		background-color: white;
		color: black;
	}
</style>
