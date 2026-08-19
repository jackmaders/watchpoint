const server = Bun.serve({
	fetch(request) {
		const url = new URL(request.url);
		const path = url.pathname === "/" ? "/index.html" : url.pathname;
		return new Response(Bun.file(`storybook-static${path}`));
	},
	hostname: "127.0.0.1",
	port: Number(process.env.PORT ?? 6106),
});

console.log(`Serving Storybook on ${server.url}`);
