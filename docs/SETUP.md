# Setup

## Prerequisites

- Docker + Docker Compose
- Python 3.12+
- [uv](https://docs.astral.sh/uv/) (`curl -LsSf https://astral.sh/uv/install.sh | sh`)
- Node 20+
- pnpm 9+
- Terraform 1.9+ (for infra changes)

## First-time setup

```bash
git clone <this-repo> driftguard
cd driftguard
cp .env.example .env

# start postgres + redis
docker compose up -d

# api
make api-install
make migrate
make api-dev

# web (new terminal)
make web-install
make web-dev
```

API → http://localhost:8000/docs
Web → http://localhost:3000

## GitHub App (dev)

1. Create a GitHub App: https://github.com/settings/apps/new
2. Webhook URL: use `ngrok http 8000` and point to `/api/v1/webhooks/github`
3. Permissions:
   - Pull requests: Read & write
   - Contents: Read
   - Metadata: Read
4. Subscribe to events: `Pull request`
5. Generate a private key (`.pem`), put contents in `GITHUB_APP_PRIVATE_KEY`
6. Set `GITHUB_APP_ID` and `GITHUB_WEBHOOK_SECRET` in `.env`

## API keys

- Anthropic: https://console.anthropic.com → put in `ANTHROPIC_API_KEY`
- Infracost (free): https://www.infracost.io/ → `INFRACOST_API_KEY`

## Common tasks

```bash
make help          # list targets
make api-test
make fmt
make lint
make migration m="add x table"
make migrate
```
