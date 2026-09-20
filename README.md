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

The UI uses the current Tailwind v4 shadcn setup. `components.json` is the
source of truth for the component aliases and theme configuration, while
generated primitives live in `src/components/ui`. Add components with:

```bash
bunx shadcn@latest add <component>
```

Keep application-specific composition in `src/components` and keep the
generated primitives small and local. The generated primitives use the shared
`cn` adapter in `src/lib/utils.ts`.

### Removing Tailwind CSS

If you prefer not to use Tailwind CSS:

1. Remove the demo pages in `src/routes/demo/`
2. Replace the Tailwind import in `src/styles.css` with your own styles
3. Remove `tailwindcss()` from the plugins array in `vite.config.ts`
4. Remove `@tailwindcss/vite` and `tailwindcss` from `package.json`



## Routing

This project uses [TanStack Router](https://tanstack.com/router) with file-based routing. Routes are managed as files in `src/routes`.

### Adding A Route

To add a new route to your application just add a new file in the `./src/routes` directory.

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

In the File Based Routing setup the layout is located in `src/routes/__root.tsx`. Anything you add to the root route will appear in all the routes. The route content will appear in the JSX where you render `{children}` in the `shellComponent`.

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
bun --bun run dev
```

The Vite dev server and browser tests use `http://localhost:5173`, so keep
`BETTER_AUTH_URL` aligned with that origin. If you use the Wrangler preview
server instead, set it to `http://localhost:8787` for that process.

For production, set `BETTER_AUTH_SECRET` with `wrangler secret put` and set
`BETTER_AUTH_URL` to the deployed origin. Keep the cookie plugin last in the
Better Auth plugin list so TanStack Start can attach auth cookies to responses.
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
