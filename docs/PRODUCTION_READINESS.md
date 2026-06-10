# DriftGuard — Production Readiness Report

**Data:** 2026-06-10
**Branch base:** `main` @ `2a40ebf`
**Método:** audit estático do repo + probes live ao deployment Vercel/Render

---

## TL;DR

Estado: **funcional mas com gaps de segurança e operacionais que bloqueiam um go-live sério.** Nada catastrófico em produção agora, mas há 4 itens P0 que exponho abaixo. A maior dívida é **drift entre a infra declarada (Terraform/Cloud Run) e a realidade operacional (Render)** — o que torna o IaC enganador e o disaster recovery não-testável.

---

## P0 — Bloqueadores (corrigir antes de qualquer divulgação pública)

| # | Gap | Evidência | Risco |
|---|-----|-----------|-------|
| P0-1 | **Debug endpoints sem auth nem env-guard** | `api/v1/health.py`: `/debug/run-migrations` (exec subprocess alembic), `/debug/schema` (dump schema + counts), `/debug/run-analyze`, `/debug/analyze-steps`. Incluídos no router sem proteção. | Qualquer um corre migrations ou enumera o schema. RCE-adjacente via `/debug/run-migrations`. |
| P0-2 | **Secret defaults inseguros silenciosos** | `config.py`: `secret_key = "dev-only-change-me"`. `web/lib/api.ts` e `backend.ts`: mesmo fallback. Sem fail-fast se o env não for setado em prod. | Se o env falhar em prod, o serviço arranca com secret conhecido → forja de tokens internos. |
| P0-3 | **Drift Terraform ↔ realidade (Cloud Run vs Render)** | IaC só tem `modules/cloud-run`. Operação usa Render (`your-api.onrender.com`, cron warm-up Render). Sem `render.yaml`. | Infra não reproduzível. DR impossível. O `terraform apply` da sessão anterior (cpu_idle/boost) não tem efeito — o serviço real não é Cloud Run. |
| P0-4 | **`your-api.onrender.com` hardcoded como fallback** | `policies/page.tsx:68`, `settings/page.tsx:94` | Se `NEXT_PUBLIC_API_URL` faltar, o dashboard e o webhook URL mostrado ao cliente apontam para um placeholder inexistente. |

---

## P1 — Alto (corrigir no primeiro ciclo pós-launch)

| # | Gap | Evidência | Risco |
|---|-----|-----------|-------|
| P1-1 | **Sem error tracking ativo** | `@sentry/nextjs` instalado mas sem `withSentryConfig`, sem `instrumentation-client.ts`, sem `global-error.tsx`. Backend tem `init_sentry` mas DSN provavelmente não setado. | Erros de prod invisíveis. Debugging às cegas. |
| P1-2 | **Sem distributed tracing** | Nenhuma instrumentação OTel no FastAPI. Latências (o problema original deste projeto) medidas por inferência, não dados. | Impossível diagnosticar regressões de latência objetivamente. |
| P1-3 | **`/metrics` e `/debug/*` sem rate limit** | `core/ratelimit.py` existe mas só aplicado em `ingest.py`/`webhooks.py`. | Endpoints de leitura DB (`/debug/schema`, `/metrics`) abusáveis. |
| P1-4 | **Stripe webhook — sem idempotency tracking** | `stripe_webhooks.py` verifica assinatura (✓) mas não regista `event.id` para dedupe. | Stripe reenvia eventos; processamento duplicado de subscription state. |

---

## P2 — Médio (hardening)

| # | Gap | Nota |
|---|-----|------|
| P2-1 | CSP header ausente | `next.config.js` tem X-Frame/nosniff mas sem `Content-Security-Policy`. |
| P2-2 | Sem health check de readiness separado de liveness | `/health` mistura uptime + redis check. K8s/Render querem `/healthz` (liveness) vs `/readyz` (deps). |
| P2-3 | Stripe API version não pinada | SDK usa default da conta. Best practice: pinar `2026-05-27` explícito no client. |
| P2-4 | Cron warm-up a cada 5min | Mitiga cold start mas é band-aid. Render paid tier ou Cloud Run `min-instances` resolve na raiz. |

---

## O que JÁ está bem (não mexer)

- Stripe usa **Checkout Sessions** (`mode=subscription`, `automatic_tax`, `client_reference_id`) — alinhado com best practices. Não usa Charges API. ✓
- Webhook signature verification presente. ✓
- WIF keyless para GitHub Actions (sem service account keys). ✓
- Migrations versionadas e idempotentes (010, `ADD COLUMN IF NOT EXISTS`). ✓
- `docs_url` desligado em prod. ✓
- Rate limiting existe (parcial). ✓
- CI roda pytest + lint + build + checkov + container scan. ✓
- i18n 6 locales, validado em CI. ✓

---

## Plano de execução (ordem)

1. **P0-1** remover/proteger debug endpoints → env-guard `environment != "prod"` + auth
2. **P0-2** fail-fast em secrets default em prod (backend + web)
3. **P0-4** remover hardcoded `your-api.onrender.com`, fail-fast no env
4. **P1-1** Sentry completo (web + confirmar backend DSN)
5. **P1-2** OpenTelemetry no FastAPI (graceful no-op sem endpoint)
6. **P1-4** Stripe webhook idempotency
7. **P2-3** pinar Stripe API version
8. **P0-3** documentar/reconciliar drift Render — **não automatizável daqui** (sem creds), entregue como runbook + decisão

Itens que **não** executo nesta sessão e porquê:
- **P0-3 apply real:** sem credenciais GCP/Render nem state backend. Entrego decisão + runbook.
- **P2-4 tier change:** decisão de custo do founder, não de código.
