# Bootstrap

One-time setup of GCP foundational resources. Run once per environment.

Creates:
- GCS bucket for `tfstate` (used by `envs/dev`)
- Artifact Registry repo `driftguard`
- Service account `driftguard-deployer` with roles for CI deploy
- Workload Identity Federation pool + provider tied to your GitHub repo
- Secret Manager placeholder secrets (no values yet)
- Cloud Run runtime SA granted `secretAccessor` on each secret

State for this module is local. Keep `terraform.tfstate` out of git (already in `.gitignore`).

## Usage

```bash
cp terraform.tfvars.example terraform.tfvars
# edit terraform.tfvars

terraform init
terraform apply

# capture outputs
terraform output -raw wif_provider
terraform output -raw deployer_sa
terraform output -raw tfstate_bucket
```

See `docs/DEPLOY.md` in repo root for the full deploy flow.
