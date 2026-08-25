# DriftGuard — Production Readiness Report

**Revalidated:** 2026-08-25 (previous: 2026-08-23; original assessment 2026-06-10)
**Método:** re-verificação item a item contra o código actual, não releitura do relatório anterior. Cada linha abaixo tem a evidência que a sustenta.

Este documento é a fonte única de verdade sobre prontidão para produção e é
actualizado, não substituído, em cada auditoria: novos achados somam-se à
tabela abaixo com um novo `N-#`; nenhum achado é apagado quando corrigido,
apenas passa a **✅ Resolvido**, para que o histórico de riscos já cobertos
não se perca. Ver [Histórico de revalidações](#histórico-de-revalidações)
no final.

> Como ler: **Resolvido** = verificado no código, com teste. **Em aberto** = confirmado ainda presente. **Regressão** = estava resolvido e voltou. **Bloqueado** = a acção não é de código.

---

## TL;DR

Dos 12 itens do relatório original, **10 estão resolvidos**, 1 está **em aberto por decisão de custo** e 1 está **parcialmente resolvido**. Nenhuma regressão.

Nesta revalidação foram encontrados e corrigidos mais cinco defeitos críticos fora do relatório original: a página pública `/status` inventava dados e assumia "tudo operacional" quando não conseguia sequer contactar o backend (N-7); o readiness check reportava a IA como saudável apenas por a chave estar configurada, sem nunca verificar se as chamadas reais estavam a ter sucesso — a mesma lacuna que deixou os dois providers falharem em produção durante três semanas sem qualquer sinal público (N-8); um cliente pagante em retry de pagamento via-se apresentado como "Free plan" sem qualquer aviso (N-9); seis páginas públicas anunciavam um audit log criptograficamente assinado e à prova de adulteração com cadeia de hashes que nunca foi implementado (N-10); e, provavelmente o mais grave de todos por afectar **toda** instalação desde sempre e não apenas as mal configuradas: **a memória semântica autenticava contra o fornecedor de embeddings errado e corria sempre no fallback não-semântico, silenciosamente, em qualquer organização, sem nenhuma cobertura de testes a verificar o caminho real** (N-11).

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
| N-7 | **A página pública /status inventava dados e mentia por defeito** | Crítica | ✅ Corrigido. Três defeitos: (1) o gráfico de uptime de 90 dias era 100% fabricado — repetia o check *actual* em todas as 90 barras, sem nenhuma fonte de histórico real (não existe tabela `status_history` nem job de snapshot em nenhuma migração); (2) `ready === null ? true : ...` — quando o backend estava inalcançável, a página assumia "tudo operacional" em vez de "não sabemos", o único modo de falha que uma status page existe para não ter; (3) o sinal `checks.ai_review` estava mapeado a uma linha rotulada "Security" sem relação, enquanto duas linhas ("Cost analysis", "Dashboard") tinham estado fixo "operational" sem nenhum check real por trás. Corrigido: gráfico substituído por aviso honesto de que não há histórico; estado "unknown" distinto de "operational" quando o backend não responde; linhas removidas ou re-rotuladas para corresponder ao sinal real. `apps/web/lib/status-page.test.ts` (14 testes, com controlo negativo confirmando que apanha a forma exacta do bug original) |
| N-8 | **`/api/v1/ready` reportava `ai_review: "ok"` mesmo com ambos os providers exaustos** | Crítica | ✅ Corrigido. O check só confirmava que uma chave estava configurada, nunca que as chamadas com essa chave estavam a funcionar — exactamente a lacuna que permitiu que os dois providers falhassem em produção durante três semanas sem nada o reportar (ver linha "AI review" em `FEATURE_MATRIX.md`). `services/ai_health.py` (novo) grava, a cada tentativa real em `ai/reviewer.py` e `services/analysis/ai_review.py`, qual camada respondeu de facto; `/ready` lê essa última observação em vez de re-derivar "ok" da presença da chave. Sem chamada viva ao provider no probe de readiness — seria lento, instável e cobrado |
| N-9 | **Cliente pagante em retry de pagamento via visto como "Free plan" sem qualquer aviso** | Alta | ✅ Corrigido. `services/billing.py::apply_subscription_event` reinicia `org.plan` para `"free"` em qualquer status Stripe fora de `{active, trialing}` — incluindo `past_due`, que `is_premium()` continua a tratar como acesso válido via `subscription_status = "premium_past_due"` (período de retry de pagamento, não um cancelamento). Isto **não foi alterado** — os testes existentes (`test_subscription_updated_non_active_statuses`, `test_subscription_updated_past_due_keeps_plan_free`) fixam-no explicitamente e é uma decisão de produto sobre a qual não é minha função decidir sozinho. O que era um bug claro, sem ambiguidade: a página de settings usava só `org.plan` para decidir o que mostrar, então um cliente Team pagante em `past_due` via o cartão "Free" destacado como plano actual, um botão "Upgrade to Team" (como se fosse gratuito), e nenhuma indicação de que o pagamento falhou. `apps/web/lib/billing-actions.ts` (nova lógica pura, testável) deriva a visibilidade das acções a partir de `subscription_status`, não só `plan`; agora mostra um aviso claro de problema de pagamento com CTA directo para o portal Stripe. `apps/web/lib/billing-actions.test.ts` (7 testes, com controlo negativo) |
| N-10 | **Seis páginas anunciavam um audit log "assinado" e "à prova de adulteração" com cadeia de hashes — nada disso existe** | **Crítica** | ✅ Corrigido. `db/models.py::AuditLog` não tem coluna `seq`, `prev_hash` ou `hash`, e não existe lógica de encadeamento de hashes em lado nenhum de `apps/api` — confirmado por grep, não por inferência. `/docs/audit`, `/docs/dora`, `/docs/nis2`, `/docs/iso-27001`, a página de audit log do dashboard, e `/security` descreviam o log como "signed"/"tamper-evident"/"hash chain", incluindo um exemplo JSON inventado com campos `seq`, `prev_hash`, `hash`, `signed_at`, `decision`, `reviewer` que não correspondem ao schema real (`{id, actor, action, target, payload, created_at}`). Quatro páginas também mostravam um ficheiro de configuração `.github/driftguard.yml` (`compliance.frameworks`, `compliance.evidence.emit/retention_days/export`, e no NIS2 uma DSL YAML fictícia `policy.block: [...]`) que não é lido em lado nenhum — toda a gravação de auditoria é automática e incondicional, não há nada para activar. Corrigido em todas as seis superfícies; exemplos JSON substituídos por dados reais usando códigos de controlo genuínos de `compliance/controls.py::CATALOG` (confirmados um a um, não copiados às cegas — a primeira tentativa usou `TF006`, que **não** está na tabela de mapeamento; só `CKV_AWS_*` está). Encontrado também: um 4º controlo ISO 27001 citava `A.5.7` ("Threat intelligence"), que não existe no catálogo real — substituído por `A.8.13` (Information backup), e a alegação "Dependabot + Snyk on every PR" e "Bandit (Python)" em `/security` — nenhum dos dois está configurado em lado nenhum do repositório — corrigidas para o que é real (Checkov + ruff + ESLint). O demo interactivo `/evidence` (marketing.evidence.*) **não precisou de correcção** — já divulgava explicitamente que hasheia um dataset sintético no browser e que o DriftGuard não reclama assinaturas criptográficas reais; é o único lugar do site que já estava a tratar este tema com o rigor correcto. Confirmado antes de corrigir: exportação CSV do audit log **é real** (`apps/web/app/api/audit-log/route.ts`), limitada aos 500 registos mais recentes por download — a descrição foi ajustada para não apagar uma capacidade real ao corrigir as fabricadas |
| N-11 | **Memória semântica corria sempre no fallback não-semântico — em toda e qualquer instalação, não só nas mal configuradas** | **Crítica** | ✅ Corrigido. `services/embeddings.py::_voyage_embed` autenticava contra `api.voyageai.com` (um fornecedor separado da Anthropic, com o seu próprio formato de chave `pa-...`) usando `settings.anthropic_api_key` — uma chave Claude. Essa chamada falha sempre a autenticação, e o `try/except` à volta caía para `_dev_embed`, um pseudo-embedding hash-based explicitamente **não semântico** segundo o seu próprio docstring, registando apenas um `log.warning`. Isto significa que **todo o "incident embedding" alguma vez armazenado, em qualquer organização, correu neste fallback** — não havia sequer uma variável `VOYAGE_API_KEY` no código para configurar correctamente. Zero cobertura de testes sobre o caminho real (`embed()`/`_voyage_embed`) confirmou que isto nunca foi verificado end-to-end. Corrigido: nova definição `voyage_api_key`, cabeçalho de autenticação corrigido, e `services/embedding_health.py` (novo, espelha `ai_health.py`) grava qual caminho respondeu de facto; `/api/v1/ready` → `checks.embeddings` e a linha "Memory" em `/status` agora reflectem isto — a linha Memory lia antes `checks.db`, que se manteve "ok" durante toda a falha porque o Postgres nunca foi o problema. `tests/test_embedding_health.py` (4 testes) e `tests/test_embeddings.py::TestEmbed` (3 testes, com controlo negativo confirmando que apanha exactamente o bug original — reverti a chave para `anthropic_api_key` e o teste `test_voyage_success_uses_the_voyage_key_not_anthropic` falhou como esperado) |
| N-12 | **Mapeamento de compliance (DORA/NIS2/ISO27001) só cobre findings do Checkov** | Baixa | ⚠️ Conhecido, não corrigido. `compliance/controls.py::CATALOG` / `CHECKOV_RULE_TO_CONTROLS` mapeia ~200 regras Checkov para citações reais de artigo/cláusula. As regras nativas do scanner do próprio DriftGuard (`TF00x`, `K8S00x`, `GHA00x`) não estão nesta tabela e não citam nenhum controlo no "Compliance notes" do PR review — não é um bug de exibição, é cobertura real em falta. Registado em `FEATURE_MATRIX.md` linha "DORA / NIS2 / ISO 27001 evidence in PR review". Corrigi-lo exige decidir o mapeamento regra-a-regra para cada framework, o que é trabalho de produto/compliance, não uma correcção mecânica — por isso fica registado e não escondido, tal como N-6 |

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

---

## Histórico de revalidações

Cada entrada é um checkpoint independente: o que foi corrido, contra que
commit, e o resultado. Uma revalidação futura acrescenta uma entrada nova
no topo desta lista — não reescreve as anteriores.

### 2026-08-25 — verificação de fecho pós-merge

Todos os PRs desta auditoria (#137–#143) já estavam mesclados em `main`
(`2b0c6a2`). Suite completa corrida contra `main`, não contra a branch de
trabalho, para confirmar o estado real após o merge:

| Gate | Resultado |
|---|---|
| `ruff check` / `ruff format --check` (`apps/api`) | limpo |
| `mypy driftguard` | 0 problemas, 137 ficheiros |
| `pytest` (`apps/api`, exclui `tests/eval`) | 1201 passed |
| `node scripts/validate-i18n.mjs` | 6 locales, 1762 chaves, 0 avisos |
| `tsc --noEmit` (`apps/web`) | limpo |
| `vitest run` (`apps/web`) | 103 passed |
| `eslint` (`apps/web`) | 0 avisos/erros |
| `pnpm build` (`apps/web`) | exit 0, "Compiled successfully" |

Nenhuma regressão encontrada. Nenhum item novo além de N-12 (acima). O
único bloqueador que continua aberto é P0-0 — rotação externa do webhook
secret — que por definição não é fechável nesta revalidação nem em
nenhuma futura que não envolva o proprietário do repositório.

**Como actualizar este documento numa próxima revalidação:**
1. Não reler apenas este ficheiro como fonte de verdade — verificar cada
   linha `Estado` contra o código actual, exactamente como o método
   descrito no topo do documento.
2. Achados novos entram como `N-#` seguinte (não reutilizar números);
   achados corrigidos mudam de estado, não são removidos.
3. Correr a suite completa (tabela de gates acima) e acrescentar uma nova
   entrada nesta secção com a data e o resultado.
4. Actualizar a linha `**Revalidated:**` no topo do documento e o TL;DR
   se a contagem de itens resolvidos/abertos mudou.
5. Se `docs/SECRET_ROTATION.md` ainda não tiver a rotação confirmada,
   P0-0 mantém-se `EM ABERTO` — não marcar como resolvido por decisão
   unilateral de código.
