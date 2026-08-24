import type React from "react";
import { vi } from "vitest";

export const Link = function MockLink({
	activeProps: _activeProps,
	children,
	to,
	href,
	params,
	ref,
	...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
	activeProps?: Record<string, unknown>;
	href?: string;
	params?: Record<string, string>;
	ref?: React.Ref<HTMLAnchorElement>;
	to?: string;
}) {
	let targetHref = to || href || "";
	if (params) {
		for (const [key, value] of Object.entries(params)) {
			targetHref = targetHref.replace(`$${key}`, value);
		}
	}
	return (
		<a href={targetHref} ref={ref} {...props}>
			{children}
		</a>
	);
};

export const createFileRoute = vi.fn(
	(path: string) => (config: Record<string, unknown>) => ({
		options: config,
		path,
		useLoaderData: vi.fn(() => ({})),
		useNavigate: vi.fn(() => vi.fn()),
		useParams: vi.fn(() => ({})),
		useRouteContext: vi.fn(() => ({})),
		useSearch: vi.fn(() => ({})),
		...config,
	}),
);

export const createRootRoute = vi.fn((config: Record<string, unknown>) => ({
	...config,
}));

export const createRouter = vi.fn((config: Record<string, unknown>) => ({
	...config,
}));

export const Outlet = () => <div data-testid="outlet" />;
export const ScrollRestoration = () => null;
export const HeadContent = () => null;
export const Meta = () => null;
export const Scripts = () => null;
export const redirect = vi.fn((opts: { to: string }) => {
	const err = new Error(`Redirect to ${opts.to}`);
	Object.assign(err, { isRedirect: true, ...opts });
	return err;
});
export const notFound = vi.fn((opts?: Record<string, unknown>) => {
	const err = new Error("Not Found");
	Object.assign(err, { isNotFound: true, ...opts });
	return err;
});
export const useNavigate = vi.fn(() => vi.fn());
export const useParams = vi.fn(() => ({}));
export const useRouteContext = vi.fn(() => ({}));
export const useSearch = vi.fn(() => ({}));

const routeApiRegistry = new Map<
	string,
	{
		useLoaderData: ReturnType<typeof vi.fn>;
		useNavigate: ReturnType<typeof vi.fn>;
		useParams: ReturnType<typeof vi.fn>;
		useRouteContext: ReturnType<typeof vi.fn>;
		useSearch: ReturnType<typeof vi.fn>;
	}
>();

export const getRouteApi = vi.fn((id: string) => {
	let existing = routeApiRegistry.get(id);
	if (!existing) {
		existing = {
			useLoaderData: vi.fn(() => ({})),
			useNavigate: vi.fn(() => vi.fn()),
			useParams: vi.fn(() => ({})),
			useRouteContext: vi.fn(() => ({})),
			useSearch: vi.fn(() => ({})),
		};
		routeApiRegistry.set(id, existing);
	}
	return existing;
});
