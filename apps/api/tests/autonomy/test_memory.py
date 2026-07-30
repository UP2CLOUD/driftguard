from driftguard.autonomy.memory import (
    filter_rejected,
    is_rejected,
    load_memory,
    oscillating_keys,
    record_run,
    reject,
    save_memory,
)
from driftguard.autonomy.schemas import AgentFinding

FINDING_A = AgentFinding(role="security", severity="high", area="apps/api", title="A", description="d")
FINDING_B = AgentFinding(role="qa", severity="medium", area="apps/web", title="B", description="d")


def test_reject_is_idempotent():
    memory = {"rejected": [], "history": {}}
    reject(memory, FINDING_A.dedup_key())
    reject(memory, FINDING_A.dedup_key())
    assert memory["rejected"] == [FINDING_A.dedup_key()]


def test_is_rejected():
    memory = {"rejected": [FINDING_A.dedup_key()], "history": {}}
    assert is_rejected(memory, FINDING_A.dedup_key())
    assert not is_rejected(memory, FINDING_B.dedup_key())


def test_filter_rejected_splits_kept_and_suppressed():
    memory = {"rejected": [FINDING_A.dedup_key()], "history": {}}
    kept, suppressed = filter_rejected(memory, [FINDING_A, FINDING_B])
    assert kept == [FINDING_B]
    assert suppressed == [FINDING_A.dedup_key()]


def test_record_run_increments_consecutive_and_resets_absent():
    memory = {"rejected": [], "history": {}}
    memory = record_run(memory, "run-1", [FINDING_A, FINDING_B])
    assert memory["history"][FINDING_A.dedup_key()]["consecutive_runs"] == 1
    assert memory["history"][FINDING_B.dedup_key()]["consecutive_runs"] == 1

    memory = record_run(memory, "run-2", [FINDING_A])
    assert memory["history"][FINDING_A.dedup_key()]["consecutive_runs"] == 2
    assert memory["history"][FINDING_B.dedup_key()]["consecutive_runs"] == 0


def test_oscillating_keys_respects_window():
    memory = {"rejected": [], "history": {}}
    for run_id in ("r1", "r2", "r3"):
        memory = record_run(memory, run_id, [FINDING_A])
    assert oscillating_keys(memory, window=3) == [FINDING_A.dedup_key()]
    assert oscillating_keys(memory, window=4) == []


def test_load_memory_missing_file_returns_empty_shape(tmp_path):
    memory = load_memory(tmp_path / "nope.json")
    assert memory == {"rejected": [], "history": {}}


def test_save_then_load_roundtrip(tmp_path):
    path = tmp_path / "memory.json"
    memory = {"rejected": ["k1"], "history": {"k1": {"consecutive_runs": 2}}}
    save_memory(path, memory)
    assert load_memory(path) == memory
