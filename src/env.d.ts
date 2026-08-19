/// <reference types="vite/client" />

declare module "*?url" {
	const src: string;
	export default src;
}

declare global {
	namespace NodeJS {
		interface ProcessEnv {
			BETTER_AUTH_SECRET?: string;
			BETTER_AUTH_ALLOW_REGISTRATION?: string;
			BETTER_AUTH_URL?: string;
			NODE_ENV?: "development" | "production" | "test";
		}
	}
}
