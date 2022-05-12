<script lang="ts">
	import Title from '$lib/Title.svelte';
</script>

<div class="container">
	<Title marginBottom="5px" />
	<div class="rules">
		The game is played with a full standard deck of 52 cards by four players in fixed partnerships,
		sitting crosswise. Cards are dealt in batches of 5{' – '}4{' – '}4. The player who sits after
		the dealer in the direction of play (which is typically counter-clockwise) is known as
		trump-caller. Having received the first five cards, this player announces the trump suit
		(usually called rung of the game - "rung" meaning "color" in Persian). The other players are not
		allowed to look at their cards before the trump suit has been announced. The trump-caller leads
		to the first trick. In trick-play the normal whist rules apply: Players must follow suit if
		possible, and the highest trump, or the highest card of the suit led, takes the trick. To choose
		the highest card, the cards must be 10 and below. The winner of a trick leads to the next trick.
		The party that wins seven or more tricks wins the hand. Winning seven tricks in one go is a
		special achievement known as kot or kap. Player have to call first for Continuing afterwards and
		winning all tricks is a rare achievement known as a bavney or baunie. The first trump-caller
		(and by implication the first dealer) is determined at random. The role of the trump-caller only
		passes on to the next player if the trump-caller's party did not win the hand.
	</div>
</div>

<style>
	.rules {
		padding: 0 1em;
		font-size: 1.25rem;
		line-height: 1.5;
	}
</style>
