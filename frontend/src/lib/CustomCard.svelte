<script>
	export let src;
	export let alt;
	export let width = '75px';
	export let height = '100px';
</script>

<img {src} {alt} style={`width: ${width};height:${height}`} />
