# Infra Reconciliation — Render vs Cloud Run (P0-3)

**Estado atual:** o IaC (`infra/terraform/modules/cloud-run`) declara Cloud Run, mas o
serviço real corre no Render. O Terraform é hoje **ficção** — `terraform apply` não
afeta produção, e disaster recovery a partir do repo é impossível.

## Decisão necessária (founder)

| Opção | Custo/mês est. | Esforço | Prós | Contras |
|---|---|---|---|---|
| **A. Consolidar em Cloud Run** | ~€10–25 (min-instances=1, cpu_idle) | 1 dia | IaC já existe e validado; WIF/CI já configurado p/ GCP; warm-up + boost já no módulo | Migração de envs/DNS; secret rotation |
| B. Consolidar em Render + IaC | €19+ (starter sem sleep) | 1 dia | Zero migração | Escrever `render.yaml` + Terraform provider Render (imaturo); CI novo |
| C. Manter híbrido | atual | 0 | nada | drift permanente; DR impossível — **não recomendado** |

**Recomendação: A.** O repo já tem todo o caminho GCP pavimentado (WIF, deploy-api.yml,
módulo Terraform com `cpu_idle`/`startup_cpu_boost`/`command` fix). Render foi um
atalho de bootstrap; mantê-lo duplica superfícies operacionais.

## Runbook — Opção A (Cloud Run cutover)

1. **Pré-requisitos**
   ```bash
   gcloud auth login && gcloud config set project <PROJECT_ID>
   cd infra/terraform/envs/prod && terraform init
   ```
2. **Plan/apply do serviço** (já inclui min_instances=1, boost, command fix)
   ```bash
   terraform plan -out=tfplan    # esperar in-place/create, NUNCA replace inesperado
   terraform apply tfplan
   ```
3. **Secrets** → Secret Manager (`SECRET_KEY`, `DATABASE_URL`, `STRIPE_*`, `SENTRY_DSN`,
   `GITHUB_APP_*`, `ANTHROPIC_API_KEY`). Conferir `secret_env` no módulo.
4. **Migrations**: `alembic upgrade head` via Cloud Run job ou `/debug/run-migrations`
   com `X-Debug-Token` (agora gated).
5. **Smoke**: `curl $CLOUDRUN_URL/api/v1/health` e `/api/v1/ready`.
6. **Cutover**: atualizar `NEXT_PUBLIC_API_URL` na Vercel → redeploy → validar dashboard.
7. **Webhooks**: atualizar URL no GitHub App e no Stripe Dashboard (endpoint `/api/v1/webhooks/stripe`).
8. **Descomissionar Render**: suspender serviço + remover cron warm-up (o overlay/warm-up
   do setup route continua válido).
9. **Rollback**: reverter `NEXT_PUBLIC_API_URL` para o URL Render (manter o serviço
   suspenso-mas-existente durante 7 dias).

## Validação pós-cutover

```bash
gcloud run services describe driftguard-api --region=<REGION> \
  --format='value(status.url, spec.template.spec.containers[0].command)'
# worker deve mostrar o comando celery — confirma o fix do command
```
