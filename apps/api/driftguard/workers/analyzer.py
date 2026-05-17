from driftguard.core.logging import log

# MVP: in-process background task. Migrate to Celery/Temporal when:
# - p95 analysis time > 60s
# - >100 concurrent PR events
# - need for retries/visibility


async def enqueue_pr_analysis(payload: dict) -> None:
    repo = payload["repository"]["full_name"]
    pr_number = payload["pull_request"]["number"]
    head_sha = payload["pull_request"]["head"]["sha"]
    base_sha = payload["pull_request"]["base"]["sha"]
    installation_id = payload["installation"]["id"]

    log.info(
        "analysis_queued",
        repo=repo,
        pr=pr_number,
        head=head_sha,
        base=base_sha,
        installation=installation_id,
    )

    # Pipeline (to implement):
    # 1. Get installation token (integrations.github.installation_token)
    # 2. Sparse-clone repo at head_sha into tmpdir
    # 3. Detect terraform dirs (look for *.tf, exclude .terraform/)
    # 4. For each dir: terraform init -backend=false, terraform plan -out=tfplan.bin
    # 5. terraform show -json tfplan.bin > plan.json
    # 6. Parallel:
    #    - infracost diff (integrations.infracost.cost_diff)
    #    - state drift compare (against remote state if accessible)
    #    - checkov scan
    # 7. Aggregate findings -> list[dict]
    # 8. ai.reviewer.review(findings, pr_context) -> markdown
    # 9. github.post_pr_comment(token, repo, pr_number, body)
    # 10. Persist Analysis + Finding rows


async def run_analysis(*, installation_id: int, repo: str, head_sha: str, base_sha: str) -> str:
    """Returns analysis_id."""
    raise NotImplementedError
