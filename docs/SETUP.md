# New Project Setup

## Project Setup

Prerequisites:

- [Vite+](https://viteplus.dev/guide/) 1.5.1: validate with `vp --version`.
- [Git](https://git-scm.com/downloads) 2.28 or newer: validate with `git --version`.
- [GitHub CLI](https://cli.github.com/) 2.x: validate with `gh --version` and authenticate with `gh auth login`.
- [jq](https://jqlang.org/): validate with `jq --version`.
- Bash and OpenSSL for the setup scripts below.

Create the project and enter the generated directory:

```bash
vp create github:jackmaders/vite-plus
cd <project-name>
vp install
```

Set the project name in `package.json` and `wrangler.jsonc` from the current directory:

```bash
PROJECT_NAME="$(basename "$PWD")"
jq --arg name "$PROJECT_NAME" '.name = $name' package.json > package.json.tmp && mv package.json.tmp package.json
jq --arg name "$PROJECT_NAME" '.name = $name' wrangler.jsonc > wrangler.jsonc.tmp && mv wrangler.jsonc.tmp wrangler.jsonc
```

## Local development and preview

Development uses `http://localhost:5173`; preview uses `http://localhost:4173`.

Generate a local secret, migrate local D1, and start development:

```bash
# Generate local auth values.
sed "s/<your-generated-secret>/$(openssl rand -hex 32)/" .dev.vars.example > .dev.vars

# Apply local database migrations.
vpr db:migrate --local

# Optional: seed initial local data when a seed script is configured.
vpr db:seed

# Start the development server.
vp dev
```

```bash
# The local secret in .dev.vars is shared by development and preview.

# Build for the local preview origin and migrate its local D1 binding.
CLOUDFLARE_ENV=preview vp build
vpr db:migrate --local --env preview
vp preview
```

Validate full CI parity locally before opening or updating a pull request:

```bash
vpr check:ci
```

## Cloudflare Workers production setup

Run once from Bash. Enter your account ID and workers.dev subdomain when prompted:

```bash
(
  set -eu

  # Authenticate and select the Cloudflare account and workers.dev subdomain.
  pnpm exec wrangler login
  pnpm exec wrangler whoami
  read -rp "Cloudflare account ID: " CLOUDFLARE_ACCOUNT_ID
  read -rp "Account subdomain (without .workers.dev): " WORKERS_SUBDOMAIN
  export CLOUDFLARE_ACCOUNT_ID

  # Configure the deployed Worker origin and account.
  WORKER_NAME="$(jq -er '.name' wrangler.jsonc)"
  PRODUCTION_WORKER_NAME="${WORKER_NAME}-production"
  WORKERS_URL="https://${PRODUCTION_WORKER_NAME}.${WORKERS_SUBDOMAIN}.workers.dev"

  jq --arg account "$CLOUDFLARE_ACCOUNT_ID" --arg url "$WORKERS_URL" \
    '.account_id = $account | .env.production.vars.BETTER_AUTH_URL = $url' \
    wrangler.jsonc > wrangler.jsonc.tmp
  mv wrangler.jsonc.tmp wrangler.jsonc

  # Create and bind production D1, retaining the existing migration settings.
  pnpm exec wrangler d1 create "${WORKER_NAME}-db" --binding DB --update-config --env production
  vpr cf:generate

  # Generate a production auth secret; remove the temporary file on exit.
  ENV_FILE="$(mktemp "${TMPDIR:-/tmp}/worker-secrets.XXXXXX")"
  trap 'rm -f "$ENV_FILE"' EXIT
  printf 'BETTER_AUTH_SECRET="%s"\n' "$(openssl rand -hex 32)" > "$ENV_FILE"
  install -m 600 "$ENV_FILE" .dev.vars

  # Build and validate the deployment without changing remote resources.
  CLOUDFLARE_ENV=production vp build
  pnpm exec wrangler deploy --dry-run --secrets-file "$ENV_FILE"

  # Migrate production D1 and deploy code with the generated secret.
  vpr db:migrate --remote --env production
  pnpm exec wrangler deploy --secrets-file "$ENV_FILE"
)
```

## GitHub Setup

Create and push the repository:

```bash
export GH_OWNER="$(gh api user --jq .login)"
export GH_REPO="${GH_OWNER}/$(jq -r '.name' package.json)"

git add .
git commit -m "chore: initialize project"
gh repo create "$GH_REPO" --public --source=. --remote=origin --push
gh repo edit --default-branch main \
  --delete-branch-on-merge --enable-squash-merge \
  --enable-merge-commit=false --enable-rebase-merge=false
```

Apply the repository settings to restrict pull request creation to collaborators:

```bash
gh api --method PATCH 'repos/{owner}/{repo}' --input .github/settings.json
```

Apply the main-branch ruleset:

```bash
gh api --method POST 'repos/{owner}/{repo}/rulesets' \
  --input .github/rulesets/protect-main.json
gh api 'repos/{owner}/{repo}/rules/branches/main'
```
