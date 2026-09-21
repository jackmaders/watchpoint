Welcome to your new TanStack Start app!

# Getting Started

To run this application:

```bash
bun install
bun --bun run dev
```

# Building For Production

To build this application for production:

```bash
bun --bun run build
```

## Styling

This project uses [Tailwind CSS](https://tailwindcss.com/) for styling.

### shadcn/ui

The UI uses the current Tailwind v4 shadcn setup. `.config/components.json` is
the source of truth for the component aliases and theme configuration, while
generated primitives live in `src/shared/ui`. Add components with:

```bash
bun run shadcn:add button
```

The `shadcn:add` script includes `--cwd .config`, which tells shadcn to load
`.config/components.json`. When invoking the CLI directly, include the same
option:

```bash
bunx --bun shadcn@latest add button --cwd .config
```

Keep application-specific composition in the relevant feature, page, or
widget slice and keep the generated primitives small and local. The generated
primitives use the shared `cn` adapter in `src/shared/lib/utils.ts`.

### Removing Tailwind CSS

If you prefer not to use Tailwind CSS:

1. Remove the demo pages in `src/app/routes/demo/`
2. Replace the Tailwind import in `src/app/styles.css` with your own styles
3. Remove `tailwindcss()` from the plugins array in `vite.config.ts`
4. Remove `@tailwindcss/vite` and `tailwindcss` from `package.json`

## Source Architecture

The `src` directory follows a feature-first, FSD-style structure enforced by
[Steiger](https://github.com/feature-sliced/steiger):

- `app` contains framework setup and route adapters.
- `pages/<page>` contains screen-level composition, such as `home`.
- `entities/<noun>` contains shared business logic for an entity, such as `post`.
- `features/<noun>-<verb>` contains one user interaction, such as `post-create`.
- `widgets/<noun>-<purpose>` contains read-only or composite UI, such as `post-feed`.
- `shared/db/schema` contains the relational persistence schema and relations;
  `shared` otherwise contains business-agnostic infrastructure.

Feature and widget slices may be used by only one page when their interface is
still a meaningful user interaction or composition. Steiger therefore applies
its insignificant-slice heuristic to other sliced layers, but not to these two.

Keep entity reads and reusable entity UI in `entities`; keep mutations that
represent a user action in `features`. Server function boundaries use
`*.functions.ts` and export `*ServerFn`; server-only implementations use
`*.server.ts` and export noun–verb `*Operation` functions. TanStack Query
modules may use `QueryOptions` and `use...Mutation` terminology explicitly.



## Routing

This project uses [TanStack Router](https://tanstack.com/router) with file-based routing. Routes are managed as files in `src/app/routes`.

### Adding A Route

To add a new route to your application just add a new file in the `./src/app/routes` directory.

TanStack will automatically generate the content of the route file for you.

Now that you have two routes you can use a `Link` component to navigate between them.

### Adding Links

To use SPA (Single Page Application) navigation you will need to import the `Link` component from `@tanstack/react-router`.

```tsx
import { Link } from "@tanstack/react-router";
```

Then anywhere in your JSX you can use it like so:

```tsx
<Link to="/about">About</Link>
```

This will create a link that will navigate to the `/about` route.

More information on the `Link` component can be found in the [Link documentation](https://tanstack.com/router/v1/docs/framework/react/api/router/linkComponent).

### Using A Layout

In the File Based Routing setup the layout is located in `src/app/routes/__root.tsx`. Anything you add to the root route will appear in all the routes. The route content will appear in the JSX where you render `{children}` in the `shellComponent`.

Here is an example layout that includes a header:

```tsx
import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'My App' },
    ],
  }),
  shellComponent: ({ children }) => (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <header>
          <nav>
            <Link to="/">Home</Link>
            <Link to="/about">About</Link>
          </nav>
        </header>
        {children}
        <Scripts />
      </body>
    </html>
  ),
})
```

More information on layouts can be found in the [Layouts documentation](https://tanstack.com/router/latest/docs/framework/react/guide/routing-concepts#layouts).

## Server Functions

TanStack Start provides server functions that allow you to write server-side code that seamlessly integrates with your client components.

```tsx
import { createServerFn } from '@tanstack/react-start'

const getServerTime = createServerFn({
  method: 'GET',
}).handler(async () => {
  return new Date().toISOString()
})

// Use in a component
function MyComponent() {
  const [time, setTime] = useState('')
  
  useEffect(() => {
    getServerTime().then(setTime)
  }, [])
  
  return <div>Server time: {time}</div>
}
```

## API Routes

You can create API routes by using the `server` property in your route definitions:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'

export const Route = createFileRoute('/api/hello')({
  server: {
    handlers: {
      GET: () => json({ message: 'Hello, World!' }),
    },
  },
})
```

## Data Fetching

There are multiple ways to fetch data in your application. You can use TanStack Query to fetch data from a server. But you can also use the `loader` functionality built into TanStack Router to load the data for a route before it's rendered.

For example:

```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/people')({
  loader: async () => {
    const response = await fetch('https://swapi.dev/api/people')
    return response.json()
  },
  component: PeopleComponent,
})

function PeopleComponent() {
  const data = Route.useLoaderData()
  return (
    <ul>
      {data.results.map((person) => (
        <li key={person.name}>{person.name}</li>
      ))}
    </ul>
  )
}
```

## Authentication

Authentication is wired with [Better Auth](https://better-auth.com/) using its
official TanStack Start cookie plugin and the Drizzle adapter over the existing
Cloudflare D1 database:

- `src/lib/auth.ts` is server-only and owns the Better Auth instance.
- `src/lib/auth-client.ts` is the browser client and uses Better Auth's
  same-origin `/api/auth` default.
- `src/routes/api/auth/$.ts` mounts Better Auth's GET and POST handlers.
- `src/lib/auth.functions.ts` provides the server-side session helper used by
  protected server functions.
- `src/db/auth-schema.ts` and the generated Drizzle migration own the Better
  Auth tables alongside the existing `posts` table.

Create local secrets before starting the app:

```bash
cp .config/.dev.vars.example .config/.dev.vars
# Replace BETTER_AUTH_SECRET in .config/.dev.vars with a value from:
openssl rand -base64 32
bun run db:migrate
bun run dev
```

There are three auth origins, one for each way to run the application:

| Mode | Command | `BETTER_AUTH_URL` | Where it is set |
| --- | --- | --- | --- |
| Local development | `bun run dev` | `http://localhost:5173` | `.config/.dev.vars` |
| Production build preview | `bun run build && bun run db:migrate && bun run preview` | `http://localhost:8787` | `bun run preview` override |
| Cloudflare deployment | `bun run build && bun run deploy` | `https://watchpoint.jackmaders.workers.dev` | `.config/wrangler.json` |

The preview command deliberately overrides the deployment value generated in
`dist/server/wrangler.json`, so the same build artifact can be previewed
locally without editing `.config/.dev.vars`. The preview E2E suite exercises
this command directly:

```bash
E2E_USE_PREVIEW=true bun run test:browser
```

For production, set `BETTER_AUTH_SECRET` with `wrangler secret put` and set
the deployed origin in `.config/wrangler.json` as `BETTER_AUTH_URL`. Keep the
cookie plugin last in the Better Auth plugin list so TanStack Start can attach
auth cookies to responses.
Post reads are public for the home page, while post creation is protected at
the server boundary with `ensureSession`. Route redirects are a second layer
for navigation UX, not a replacement for server-side authorization.

Loaders simplify your data fetching logic dramatically. Check out more information in the [Loader documentation](https://tanstack.com/router/latest/docs/framework/react/guide/data-loading#loader-parameters).



# Learn More

You can learn more about all of the offerings from TanStack in the [TanStack documentation](https://tanstack.com).

For TanStack Start specific documentation, visit [TanStack Start](https://tanstack.com/start).

## Dependency Health

Run `bun run check:knip` for the full and strict-production checks, or run either
focused script separately. See the
[Knip and Better Auth integration guide](docs/knip.md) for the rules,
exceptions, and authentication dependency policy.
