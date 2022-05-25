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
	import { authUserId } from '$lib/stores/userCred';
	import CustomCard from '$lib/CustomCard.svelte';
	import Index from '../index.svelte';

	export let roomId: string;
	export let username: string;

	let frontCustomCards: Record<string, string> = {};
	let backCustomCard: string;
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
			$gameState = JSON.stringify({
				roomId,
				username,
				place: 'play',
				madeAt: new Date().getTime()
			});
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
		gameplaySocket.on('move', async (index: number, username: string) => {
			makeTurn(index, username, false);
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
					Object.entries(history[history.length - 1]).length <
						Object.entries(_history[_history.length - 1]).length)
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

	const getUserData = async () => {
		if (!$authUserId) return;
		try {
			const res = await fetch(`http://localhost:4004/get-user-data?userId=${$authUserId}`);
			const jsonRes = await res.json();
			if (res.ok) {
				const user = jsonRes['data']['user'];
				if (user) {
					frontCustomCards = user['frontCustomCards'];
					backCustomCard = user['backCustomCard'];
				}
			}
		} catch (error) {
			alert('Error fetching data');
		}
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
		if (consecutiveTricksUser === seniorUser || totalTricksPlayed === 13) {
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
				consecutiveTricksUser = '';
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
			const card = allRenderedCards[turn][i].getCard();
			if (playedCards.includes(card)) continue;
			const valid = isMoveValid(card, allRenderedCards[turn]);
			if (valid) {
				gameplaySocket.emit(
					'force-move',
					roomId,
					`${totalTricksPlayed}-${Object.entries(history[history.length - 1]).length % 4}`,
					i,
					turnMakerName
				);
				break;
			}
		}
	};
	const makeTurn = async (
		index: number,
		turnMakerName: string,
		emitToOthers = true,
		botMove = false,
		changeHistory = true
	) => {
		moveTimer = 0;
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
			gameplaySocket.emit('move', roomId, index, turnMakerName);
		}
		const { x, y } = centerDiv.getBoundingClientRect();
		const cardProps = await renderedCardToPlay.transitionToTarget(x, y, {
			duration: fastTransition ? 5 : 1000
		});
		let topPosition = '0';
		let leftPosition = '0';

		switch (turnMakerSide) {
			case 'top':
				topPosition = '-18vmin';
				leftPosition = '0';
				break;
			case 'left':
				leftPosition = '-18vmin';
				topPosition = '-9vmin';
				break;
			case 'right':
				leftPosition = '18vmin';
				topPosition = '-9vmin';
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

	const confirmQuit = (e: BeforeUnloadEvent) => {
		e.preventDefault();
		if (e.type === 'beforeunload') {
			e.returnValue = '';
		}
	};

	const returnToHomePage = () => {
		$gameState = '';
		goto('/', { replaceState: true });
	};

	onMount(() => window.addEventListener('beforeunload', confirmQuit));

	getUserData();

	$: if (connected) {
		gameplaySocket.emit('check', username, roomId);
	}

	$: if (startGame && !moveTimerStopper && dealStatus === 'done' && !synchronize && movesUptoDate) {
		if (moveTimer) clearInterval(moveTimer);
		moveTimerStopper = setInterval(() => (moveTimer += 1), 1000);
	}
	forceTimerStopper = setInterval(() => (forceTimer += 1), 1000);

	$: if (startGame && dealStatus === 'done' && !movesUptoDate) {
		makeMovesUptoDate();
	}

	$: if (forceTimer - 60 === 0) {
		forceTimer = 0;
		forceStart();
	}

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

	$: if ((moveTimer !== 0 && turn && sidesLeft.includes(turn)) || moveTimer - 60 === 0) {
		moveTimer = 0;
		makeBotTurn();
	}

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
						customFront={frontCustomCards[cardProps['card']] ? CustomCard : null}
						customFrontProps={frontCustomCards[cardProps['card']]
							? { src: frontCustomCards[cardProps['card']], alt: cardProps['card'] }
							: {}}
						customBack={backCustomCard ? CustomCard : null}
						customBackProps={backCustomCard
							? { src: backCustomCard, alt: 'backside of a card' }
							: {}}
						topPosition={side === 'top' || side === 'bottom' ? '0px' : `${index * 13}vmin`}
						leftPosition={side === 'left' || side === 'right' ? '30px' : `${index * 13}vmin`}
						showBackSide={side !== 'bottom'}
						shouldRotate={side === 'left' || side === 'right'}
						width="13vmin"
						height="13vmin"
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
						cardWidth="100px"
						cardHeight="100px"
					/>
				</div>
			{/key}
			{#each playedCardsProps as cardProps}
				<svelte:component
					this={Card}
					{...cardProps}
					showBackSide={false}
					shouldRotate={false}
					customFront={frontCustomCards[cardProps['card']] ? CustomCard : null}
					customFrontProps={frontCustomCards[cardProps['card']]
						? { src: frontCustomCards[cardProps['card']], alt: cardProps['card'] }
						: {}}
					customBack={backCustomCard ? CustomCard : null}
					customBackProps={backCustomCard ? { src: backCustomCard, alt: 'backside of a card' } : {}}
				/>
			{/each}
		</div>
		<Modal
			transparentBackDrop
			show={showRungChooser}
			style="height:200px;width:500px;overflow-x:hidden;overflow-y:scroll;padding:5px"
		>
			<div>
				<h1>
					{isRungChooser
						? 'Choose Rung'
						: `${usersWithSides[rungChoosingUserSide]} is choosing Rung`}
				</h1>
				{#if isRungChooser}
					<div class="choose-rung">
						<button on:click={() => chooseRung('SPADES')}>SPADES</button>
						<button on:click={() => chooseRung('DIAMONDS')}>DIAMONDS</button>
						<button on:click={() => chooseRung('HEARTS')}>HEARTS</button>
						<button on:click={() => chooseRung('CLUBS')}>CLUBS</button>
					</div>
				{/if}
			</div>
		</Modal>
		<Modal
			onBackDropClick={returnToHomePage}
			show={gameComplete}
			style="height:200px;padding:5px;overflow:hidden"
		>
			<h1>You {didWeWon ? 'Won' : `Lose`}</h1>
			<button style="width:100%" on:click={returnToHomePage}>Return</button>
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
	.choose-rung {
		display: flex;
		justify-content: space-evenly;
	}
	.center {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
	}
	.left {
		position: absolute;
		top: 10vh;
		height: 80vh;
		width: 9.5vw;
		background-color: green;
		overflow-y: scroll;
	}
	.right {
		position: absolute;
		top: 10vh;
		right: 0;
		height: 80vh;
		width: 9.5vw;
		background-color: green;
		overflow-y: scroll;
	}
	.top {
		position: absolute;
		left: 10vw;
		top: 0;
		width: 80vw;
		height: 20vmin;
		background-color: blue;
		overflow-x: scroll;
	}

	.bottom {
		position: absolute;
		left: 10vw;
		bottom: 0;
		width: 80vw;
		height: 20vmin;
		background-color: blue;
		overflow-x: scroll;
	}
	.top-name {
		position: absolute;
		top: 0;
		right: 1.5vw;
		background-color: blue;
	}
	.left-name {
		position: absolute;
		top: 1.5vh;
		left: 0;
		background-color: green;
	}
	.right-name {
		position: absolute;
		top: 90.5vh;
		left: 91vw;
		background-color: green;
	}
	.bottom-name {
		position: absolute;
		left: 1.5vw;
		bottom: 0;
		background-color: blue;
	}
	button {
		padding: 1.5em;
		border-radius: 5px;
		font-weight: bold;
		min-width: 3em;
		margin-bottom: 5px;
		cursor: pointer;
	}
	.name {
		word-wrap: break-word;
		word-break: break-all;
		z-index: 10;
		height: 8vh;
		width: 8vw;
		margin: 0;
		overflow: hidden;
	}
	.trick-score {
		position: absolute;
		right: 0;
		bottom: 0;
		z-index: 20;
		margin: 0;
		font-size: clamp(8px, 1vw, 16px);
		background-color: white;
		color: black;
	}

	@media (max-width: 600px) {
		.choose-rung {
			flex-direction: column;
		}
	}
</style>
