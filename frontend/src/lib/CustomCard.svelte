<script>
	export let src;
	export let alt;
	export let width = '13vmin';
	export let height = '17vmin';
</script>

<img {src} {alt} style={`width: ${width};height:${height}`} />
