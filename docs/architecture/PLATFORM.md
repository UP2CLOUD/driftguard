# DriftGuard Platform Architecture
## Production-Grade Kubernetes Infrastructure — Staff Platform Engineer Design

---

## 1. Cluster Topology

```
┌─────────────────────────────────────────────────────────────────────────┐
│  CONTROL PLANE — GKE Standard (regional, 3 AZ)                          │
│  Shielded nodes · Binary Authorization · Workload Identity              │
└─────────────────────────────────────────────────────────────────────────┘

┌─── eu-west-1 (primary, GDPR) ──────────────────────────────────────────┐
│                                                                          │
│  ┌─ system pool ──────┐  ┌─ app pool ──────────┐                       │
│  │  n2d-standard-4    │  │  n2d-standard-8      │                       │
│  │  3–9 nodes         │  │  3–60 nodes          │                       │
│  │  spot: 0%          │  │  spot: 60%           │                       │
│  │  No taint          │  │  no taint            │                       │
│  └────────────────────┘  └──────────────────────┘                       │
│                                                                          │
│  ┌─ infra pool ───────┐  ┌─ gpu pool ──────────┐                       │
│  │  n2d-highmem-4     │  │  a2-highgpu-1g       │                       │
│  │  3 nodes, no spot  │  │  0–4 nodes, spot 80% │                       │
│  │  taint: infra      │  │  taint: nvidia/gpu   │                       │
│  │  Postgres + Redis  │  │  T4 · scale-to-zero  │                       │
│  └────────────────────┘  └──────────────────────┘                       │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘

┌─── us-east-1 (DR, passive) ────────────────────────────────────────────┐
│  Postgres async replica (5-min RPO)                                     │
│  Velero restore target (30-min RTO)                                     │
│  No app traffic until failover                                          │
└──────────────────────────────────────────────────────────────────────────┘

┌─── self-hosted enterprise ─────────────────────────────────────────────┐
│  Single Helm install (driftguard/driftguard chart)                     │
│  Air-gap compatible: images mirrored to customer registry               │
│  BYOK encryption (customer-managed KMS)                                 │
│  Supports: GKE, EKS, AKS, RKE2, k3s ≥1.28                            │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Namespace Strategy

| Namespace | Workloads | PSS level | Notes |
|---|---|---|---|
| `driftguard-system` | API, worker, scheduler, streaming | restricted | Core product |
| `driftguard-data` | Postgres (CNPG), Redis HA | baseline | PVC mount requires baseline |
| `driftguard-ai` | Embedding worker, inference | baseline | GPU access |
| `driftguard-gateway` | NGINX Gateway Fabric, cert-manager, external-dns | baseline | |
| `driftguard-observability` | Prometheus, Loki, Tempo, Grafana, OTel | baseline | |
| `driftguard-security` | Falco, Trivy Operator, Kyverno | privileged | Kernel access required |
| `driftguard-argocd` | ArgoCD controller + UI | restricted | GitOps |
| `driftguard-tenant-{slug}` | Per-enterprise-tenant workloads | restricted | Isolated per customer |

---

## 3. Service Mesh — Decision

**Chosen: Cilium (eBPF) over Istio/Linkerd**

| Factor | Cilium | Istio |
|---|---|---|
| Overhead | ~0MB sidecar | ~50MB/pod sidecar |
| Latency | ~0% vs baseline | ~10% vs baseline |
| mTLS | WireGuard (kernel) | Envoy proxy |
| L7 policy | HTTP/gRPC aware | Full |
| Observability | Hubble (flow-level) | Jaeger via Envoy |
| FQDN egress rules | Native | Requires ServiceEntry |
| Complexity | Low | High |

WireGuard transparent encryption: enabled cluster-wide (`encryption.type: wireguard`).
Hubble enabled for flow-level East-West visibility without tracing overhead.

---

## 4. PostgreSQL HA — CloudNativePG

- **Operator**: CloudNativePG v1.23
- **Topology**: 3-node (1 primary, 2 replicas), async streaming replication
- **Extension**: `pgvector` (semantic memory, 384-d embeddings)
- **Auth**: SCRAM-SHA-256, per-role secrets via External Secrets
- **Backup**: Barman → GCS, WAL every 30s, base every 24h
- **Failover**: Automatic (CNPG operator), ~30s RTO, 0 RPO
- **Row-level security**: Per-tenant isolation via `SET LOCAL app.tenant_id`
- **Connection pooling**: PgBouncer (transaction mode, max 200 → 20 DB connections)
- **PDB**: `minAvailable: 2` — safe rolling upgrades

---

## 5. Redis HA — Sentinel

- **Topology**: 1 primary, 2 replicas, 3 Sentinel nodes
- **Persistence**: AOF (`appendfsync everysec`) + RDB snapshots
- **Eviction**: `allkeys-lru`, 1500MB limit
- **Auth**: Requirepass via Kubernetes Secret
- **PDB**: `minAvailable: 2`
- **Use cases**: Celery task broker, rate limit counters, analysis queue, WebSocket presence

---

## 6. Object Storage

| Bucket | Purpose | Storage class | Retention | Encryption |
|---|---|---|---|---|
| `dg-plans` | Terraform plan artifacts | STANDARD | 1 day | CMEK |
| `dg-audit-logs` | Compliance audit archive | NEARLINE → COLDLINE | 7 years (WORM) | CMEK |
| `dg-models` | Embedding model weights | STANDARD | Versioned | CMEK |
| `dg-pg-backups` | Postgres WAL + base | NEARLINE | 30 days | CMEK |
| `dg-velero` | Cluster state backups | NEARLINE | 30 days | GCP-managed |

CMEK: Cloud KMS key rotation every 90 days. Audit logs bucket has retention lock (cannot be shortened).

---

## 7. Secrets Management

**External Secrets Operator** (ESO) with:
- SaaS: GCP Secret Manager (Workload Identity — no SA key files)
- Enterprise: Customer choice — AWS Secrets Manager, HashiCorp Vault, Azure Key Vault
- Air-gap: Kubernetes Secrets (ESO provider `kubernetes`)

Zero static credentials:
- GKE nodes: Workload Identity (pod SA → GCP SA mapping)
- GitHub App: private key in Secret Manager, rotated quarterly
- Anthropic / Stripe: version-pinned secrets, ESO auto-refreshes every 1h

---

## 8. CI/CD + GitOps

```
Developer push → GitHub Actions → Test → Build → Grype scan → Cosign sign
                                                               ↓
                                              Update gitops repo (image digest)
                                                               ↓
                                              ArgoCD webhook → auto-sync → deploy
                                                               ↓
                                              Smoke test → Slack notify
```

**ArgoCD App-of-Apps** — single entry point:
- Each environment (dev/staging/prod) is an ArgoCD Application
- Platform components (Prometheus, CNPG, Kyverno) as separate Applications
- `ignoreDifferences: spec.replicas` — HPA owns replica count, not ArgoCD
- `selfHeal: true` — drift from gitops state auto-corrected

---

## 9. Autoscaling

| Workload | Mechanism | Min | Max | Trigger |
|---|---|---|---|---|
| API | HPA | 3 | 50 | CPU 70% + RPS 100/pod |
| Worker | KEDA (Redis list) | 1 | 20 | Queue depth 5 |
| Embedding worker | KEDA (Redis list) | 0 | 4 | Queue depth 10 |
| Analysis jobs | KEDA ScaledJob | 0 | 100 | Queue depth 1 |
| GPU nodes | GKE cluster autoscaler | 0 | 4 | Pod pending |

VPA in `Off` mode for recommendations; applied at deploy time.
Descheduler runs hourly — consolidates pods to spot nodes.

---

## 10. Cost Optimization

| Strategy | Saving |
|---|---|
| Spot instances (app pool 60%, GPU pool 80%) | ~45% |
| GPU scale-to-zero (22:00–08:00 CET) | ~58% GPU cost |
| Postgres on infra nodes (no Cloud SQL) | ~60% vs Cloud SQL |
| VPA right-sizing (weekly review) | ~15% |
| GCS lifecycle policies (NEARLINE/COLDLINE) | ~40% storage |

Estimated prod cost: **~€1,215/mo** at 50k PR reviews/month.
Cloud Run viable up to ~5k PR reviews/month (~€180/mo).
Kubernetes justified above ~20k PR reviews/month.

---

## 11. Disaster Recovery

| Scenario | RTO | RPO | Method |
|---|---|---|---|
| Pod crash | 30s | 0 | K8s self-heal |
| Node failure | 2 min | 0 | Multi-AZ |
| Zone failure | 5 min | 0 | Regional GKE |
| Postgres primary fail | 30s | 0 | CNPG auto-failover |
| Region failure | 30 min | 5 min | Velero + PG WAL replica |
| Full cluster loss | 4 hours | 1 hour | Terraform + Velero restore |

Backup schedule: Velero daily at 01:00 UTC (30-day retention). Postgres WAL every 30s.

---

## 12. Tenant Isolation (Enterprise)

- **Namespace per tenant**: `driftguard-tenant-{slug}`
- **ResourceQuota per tenant**: CPU/memory/pod hard limits
- **NetworkPolicy**: Zero cross-tenant traffic (Cilium deny-all + explicit allow)
- **DB isolation**: Row-level security via `app.tenant_id` session variable
- **ArgoCD ApplicationSet**: One Application per tenant (git-file generator)
- **RBAC**: Tenant admin role scoped to their namespace only
- **Encryption**: BYOK supported — tenant provides KMS key for their secrets

---

## 13. Observability Stack

```
Pods → OTel SDK (auto-instrumented Python)
     → OTel Collector (gateway: 2 replicas)
          ├── Traces  → Tempo  → Grafana (Explore)
          ├── Metrics → Prometheus → Grafana (Dashboards + Alerts)
          └── Logs    → Loki   → Grafana (Logs)

Node → OTel Collector (daemonset)
     → kubeletstats + k8s_events → gateway collector
```

Dashboards: API latency (P50/P95/P99), incident rate, policy block rate,
memory recall latency, Postgres connections/replication lag, GPU utilization.

SLO alerts: error rate >1% (critical), P99 >2s (warning), queue depth >50 (warning).

---

## 14. Security Hardening

### Cluster
- Shielded nodes (Secure Boot + Integrity Monitoring)
- Binary Authorization: only Cosign-signed images
- Private nodes: no public IPs on worker nodes
- VPC-native networking: pod-level firewall rules
- GKE Dataplane V2 (Cilium eBPF): replaces kube-proxy

### Workloads (Kyverno policies)
1. Require resource limits
2. Disallow `latest` tag
3. Require image digest (`@sha256:`)
4. Disallow privileged containers
5. Require non-root user
6. Require read-only root filesystem
7. Verify Cosign signatures
8. Auto-inject `securityContext` (seccomp RuntimeDefault, drop ALL caps)

### Supply Chain (SLSA Level 3)
- GitHub Actions OIDC → GCP Workload Identity (no long-lived credentials)
- Syft SBOM generated at build, attached as Cosign attestation
- Grype CVE scan on every build — blocks on CRITICAL
- Cosign keyless signing via Sigstore (Fulcio + Rekor transparency log)
- Trivy Operator: continuous cluster scanning (weekly reports)

### Network
- Cilium NetworkPolicy: deny-all default, explicit allow
- L7 policy: HTTP method-aware rules
- FQDN egress: explicit allowlist (Anthropic, GitHub, Stripe)
- WireGuard pod-to-pod encryption

### Secrets
- No static credentials anywhere in CI or cluster
- ESO + Workload Identity: secrets fetched at pod start, refreshed hourly
- KMS encryption: all GCS buckets, Postgres at rest
- GitHub App key rotation: quarterly automated workflow

---

## 15. SBOM + Supply Chain

```
Build → Syft generates SBOM (SPDX-JSON) → stored in GCS
                                        → attached as Cosign attestation
      → Grype scans SBOM against NVD/OSV/GitHub Advisory
      → SARIF uploaded to GitHub Security tab
      → Block deploy on CRITICAL CVE

Deploy → Kyverno verifies Cosign signature at pod admission
       → Binary Authorization validates attestation chain
       → Trivy Operator runs continuous scheduled scans
```

SBOM artifacts retained for 7 years (NIS2 Art. 20 software supply chain requirement).

---

## File Map

```
infra/
├── helm/driftguard/
│   └── values.yaml                 # Self-hosted install values
├── k8s/
│   ├── argocd/app-of-apps.yaml     # GitOps root
│   ├── cost/cost-optimization.yaml # Descheduler, PDBs, topology spread
│   ├── gpu/embedding-worker.yaml   # T4 inference + KEDA scale-to-zero
│   ├── ingress/gateway.yaml        # Gateway API + cert-manager
│   ├── namespaces/namespaces.yaml  # All NS + ResourceQuota + LimitRange
│   ├── observability/
│   │   ├── grafana-dashboards.yaml # API + infra dashboards
│   │   ├── otel-stack.yaml         # OTel gateway + daemonset + Python auto-instrument
│   │   └── prometheus-rules.yaml   # SLO alerts
│   ├── policies/kyverno-policies.yaml  # 8 admission policies
│   ├── security/
│   │   ├── disaster-recovery.yaml  # Velero schedules + CNPG DR
│   │   ├── external-secrets.yaml   # ESO ClusterSecretStore + bundles
│   │   ├── hpa-vpa.yaml            # HPA + VPA + KEDA
│   │   ├── network-policies.yaml   # Cilium deny-all + explicit allow
│   │   └── sbom-pipeline.yaml      # Trivy + Kyverno CVE policy
│   └── tenants/tenant-isolation.yaml  # Namespace + quota + RBAC + NP per tenant
└── terraform/
    └── modules/
        ├── gke/main.tf             # 4 node pools, Workload Identity, Binary Auth
        ├── object-storage/main.tf  # 5 buckets with CMEK, lifecycle, WORM
        ├── postgres-ha/main.tf     # CloudNativePG 3-node + Barman + PDB
        └── redis-ha/main.tf        # Sentinel HA + AOF + PDB
```
