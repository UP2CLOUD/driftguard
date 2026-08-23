# DriftGuard — Production Readiness Report

**Revalidated:** 2026-08-23 (original assessment 2026-06-10)
**Método:** re-verificação item a item contra o código actual, não releitura do relatório anterior. Cada linha abaixo tem a evidência que a sustenta.

> Como ler: **Resolvido** = verificado no código, com teste. **Em aberto** = confirmado ainda presente. **Regressão** = estava resolvido e voltou. **Bloqueado** = a acção não é de código.

---

## TL;DR

Dos 12 itens do relatório original, **10 estão resolvidos**, 1 está **em aberto por decisão de custo** e 1 está **parcialmente resolvido**. Nenhuma regressão.

Existe **um P0 novo, e é o mais grave do documento**: um webhook secret real esteve commitado num repositório público e continua alcançável no histórico Git. Não é fechável por código — depende de rotação pelo proprietário. Ver [`SECRET_ROTATION.md`](SECRET_ROTATION.md).

---

## P0 — Bloqueadores

| # | Gap | Estado | Evidência |
|---|-----|--------|-----------|
| **P0-0** | **Webhook secret real commitado em repo público** | 🔴 **EM ABERTO — bloqueia go-live** | Introduzido em `1fa6914` (PR #32), removido da árvore em 2026-08-23. Continua no histórico. Rotação externa por confirmar. [`SECRET_ROTATION.md`](SECRET_ROTATION.md) |
| P0-1 | Debug endpoints sem env-guard | ✅ Resolvido | As rotas `/debug/*` passaram para `health.debug_router`, que `api/v1/__init__.py` **não monta** quando `environment == "prod"`. Ausentes da route table e do schema OpenAPI, não apenas rejeitadas. `tests/test_debug_routes_absent_in_prod.py` (6 testes) |
| P0-2 | Secret defaults inseguros silenciosos | ✅ Resolvido | `config.py` `_fail_fast_insecure_prod` levanta `ValueError` se `SECRET_KEY == "dev-only-change-me"` em prod. Espelhado em `web/lib/api.ts`, `backend.ts`, `backend-jwt.ts` sob `VERCEL_ENV === "production"` |
| P0-3 | Drift Terraform ↔ realidade (Cloud Run vs Render) | 🟡 Parcial | `render.yaml` existe agora na raiz, portanto o runtime real está declarado. O módulo `modules/cloud-run` continua a coexistir. Reconciliação documentada em `INFRA_RECONCILIATION.md`; o `apply` real continua a exigir credenciais que não estão nesta sessão |
| P0-4 | `your-api.onrender.com` hardcoded | ✅ Resolvido | Sem ocorrências em `apps/web` (grep em `.ts`/`.tsx`) |

---

## P1 — Alto

| # | Gap | Estado | Evidência |
|---|-----|--------|-----------|
| P1-1 | Sem error tracking activo | ✅ Resolvido | `withSentryConfig` em `next.config.js:69`; `instrumentation.ts`, `instrumentation-client.ts` e `app/global-error.tsx` presentes. Backend tem `init_sentry` |
| P1-2 | Sem distributed tracing | ✅ Resolvido | `core/observability.py` instrumenta FastAPI/httpx/SQLAlchemy via OTLP. No-op explícito e logado (`otel.disabled`) quando `OTEL_EXPORTER_OTLP_ENDPOINT` está vazio — degradação silenciosa era o risco, e não acontece |
| P1-3 | `/metrics` e `/debug/*` sem rate limit | ✅ Resolvido | `/debug/*` já não existe em prod (P0-1). `/metrics` passou a ter `rate_limit(per_minute=60, per_hour=1200)`. `pid` foi removido do payload: nenhum dashboard precisa dele e o endpoint é anónimo |
| P1-4 | Stripe webhook sem idempotency | ✅ Resolvido | `stripe_webhooks.py` faz `INSERT INTO processed_stripe_events … ON CONFLICT DO NOTHING RETURNING`, e reverte a linha se o processamento falhar — reentrega volta a ser processável |

---

## P2 — Médio

| # | Gap | Estado | Evidência |
|---|-----|--------|-----------|
| P2-1 | CSP header ausente | ✅ Resolvido | `Content-Security-Policy` em `next.config.js:42` |
| P2-2 | Readiness não separado de liveness | ✅ Resolvido | `/health` (liveness, sem I/O) e `/ready` (DB + Redis, devolve 503 em degradação) |
| P2-3 | Stripe API version não pinada | ✅ Resolvido | `services/billing.py:25` — `stripe.api_version = "2026-05-27"` |
| P2-4 | Cron warm-up a cada 5 min | 🟡 Em aberto — decisão de custo | Continua a ser um band-aid para cold start. A raiz resolve-se com tier pago ou `min-instances`; é uma decisão do proprietário, não de código |

---

## Itens novos encontrados nesta revalidação

| # | Gap | Severidade | Estado |
|---|-----|-----------|--------|
| N-1 | **Redacção de plano só disparava com a máscara do Terraform** | Alta | ✅ Corrigido. `sensitive = true` só suprime *output do CLI*; valores montados em `local` ou injectados via `user_data` chegavam em claro. O parser já os listava em `sensitive_paths` e devolvia o valor à mesma. Agora o nome do atributo também dispara redacção. `tests/test_plan_redaction.py` |
| N-2 | **Valores redigidos colapsavam todos em `"[REDACTED]"`** | Média | ✅ Corrigido. `before == after` para qualquer segredo, portanto **uma rotação de password de produção pontuava como "sem alteração"**. O placeholder passou a derivar de um digest com salt por processo: mantém "isto mudou?" respondível sem expor o valor |
| N-3 | Debug step reporter ecoava prefixo do installation token | Média | ✅ Corrigido. `token[:10]` não é redacção — estreita um brute force e chega para identificar a credencial num screenshot. Passou a reportar só o comprimento |
| N-4 | Sem secret scanning em CI ou pre-commit | Alta | ✅ Corrigido. Gitleaks em PR + pre-commit, `scripts/check-no-tfstate.sh`, e `scripts/secrets-selftest.sh` que prova que o allowlist não falhou em aberto |
| N-5 | Sem `SECURITY.md` | Média | ✅ Corrigido. Canal de reporte, prazos de resposta, versões suportadas |
| N-6 | Duas implementações paralelas de rate limiting | Baixa | ⚠️ Conhecido, não corrigido. `core/ratelimit.py` (usado por `webhooks.py`) e `core/rate_limit.py` (usado por `ingest`/`policies`/`scans`) têm buckets separados. Ambas funcionam; unificar mexe no caminho do webhook, o que é mais arriscado do que a duplicação. Registado, não escondido |

---

## O que já estava bem (confirmado, não mexido)

- Stripe via **Checkout Sessions** (`mode=subscription`, `automatic_tax`, `client_reference_id`) — não usa Charges API ✓
- Verificação de assinatura de webhook presente ✓
- WIF keyless para GitHub Actions — sem service account keys ✓
- Migrations versionadas, cadeia com uma única head ✓
- `docs_url` desligado em prod ✓
- CI corre pytest + ruff + mypy + build + checkov + container scan ✓
- i18n 6 locales, paridade de chaves validada em CI ✓
- `.gitignore` já cobria `*.tfstate`, `*.tfstate.*`, `*.tfplan`, `.terraform/` — o que faltava era a **detecção**, agora em `scripts/check-no-tfstate.sh` ✓

---

## O que continua fora de alcance daqui, e porquê

- **P0-0 rotação:** exige acesso às definições da GitHub App. É a única remediação real; remover do tree não invalida a credencial.
- **P0-3 apply real:** sem credenciais GCP/Render nem state backend nesta sessão.
- **P2-4 mudança de tier:** decisão de custo do proprietário.
