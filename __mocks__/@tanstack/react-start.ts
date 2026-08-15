import { vi } from "vitest";

export const createServerFn = vi.fn(() => {
	let storedValidator: ((data: unknown) => unknown) | undefined;
	const chain = {
		handler: vi.fn((fn) => {
			const serverFn = async (ctx: { data: unknown }) => {
				const validatedData = storedValidator
					? storedValidator(ctx.data)
					: ctx.data;
				return fn({ data: validatedData });
			};
			return serverFn;
		}),
		validator: vi.fn((valFn) => {
			storedValidator = valFn;
			return chain;
		}),
	};
	return chain;
});

export const json = vi.fn((data: unknown) => data);
export const StartClient = () => null;
