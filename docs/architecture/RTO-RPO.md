# DriftGuard — RTO / RPO Targets

## SaaS (Managed)

| Scenario | RTO | RPO | Method |
|---|---|---|---|
| Pod crash | 30s | 0 | K8s self-heal |
| Node failure | 2 min | 0 | Multi-AZ pods |
| Zone failure | 5 min | 0 | Regional GKE |
| Postgres primary failure | 30s | 0 | CloudNativePG automatic failover |
| Region failure | 30 min | 5 min | Velero restore + PG WAL streaming |
| Full cluster loss | 4 hours | 1 hour | Terraform rebuild + Velero restore |

## RPO Detail
- Postgres: WAL streamed to GCS every 30s → RPO ~30s within region
- Cross-region replica lag: ~5 min (async streaming)
- Velero snapshot: hourly (configurable)
- Redis: RDB + AOF every 30s → RPO ~30s

## Runbooks
1. Postgres failover: `kubectl cnpg promote driftguard-postgres/driftguard-postgres-2`
2. Full restore: `velero restore create --from-backup <name>`
3. Region failover: Update DNS CNAME → secondary cluster Gateway IP
4. Verify: `kubectl run smoke-test --image=curlimages/curl -- curl https://api.driftguard.io/api/v1/health`
