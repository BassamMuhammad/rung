export const myFetch = async (url: string, method: string, json: Record<string, unknown>) =>
	await fetch(url, {
		method,
		body: JSON.stringify(json),
		headers: { 'Content-Type': 'application/json' }
	});
