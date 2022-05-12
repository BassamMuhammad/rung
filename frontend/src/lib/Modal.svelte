<script lang="ts">
	export let show = false;
	export let onBackDropClick = () => {};
	export let transparentBackDrop = false;
	export let style = '';
</script>

{#if show}
	<div
		class="backdrop"
		style={`background-color:${transparentBackDrop ? 'transparent' : 'rgba(0, 0, 0, 0.5)'}`}
		on:click={onBackDropClick}
	>
		<div class="container" {style} on:click={(e) => e.stopPropagation()}>
			<slot />
		</div>
	</div>
{/if}

<style>
	.backdrop {
		height: 100vh;
		width: 100vw;
		position: absolute;
		display: flex;
		justify-content: center;
		align-items: center;
	}
	.container {
		width: 40%;
		min-width: 250px;
		height: 80%;
		background-color: #fff;
		border-radius: 10px;
		overflow: scroll;
	}
</style>
