"""Unit tests for driftguard.services.embeddings — pure/deterministic
functions, plus embed() itself: `_voyage_embed` used to authenticate with
`settings.anthropic_api_key`, a Claude key, against api.voyageai.com — a
separate provider with its own key format. That call always failed, so
`embed()` had zero test coverage over the branch that was actually broken;
these tests exist to close that gap and pin the fix.
"""

from __future__ import annotations

import math
from unittest.mock import AsyncMock, patch

import pytest

from driftguard.services.embeddings import (
    EMBED_DIM,
    _dev_embed,
    _truncate_normalize,
    cosine_similarity,
    embed,
    intent_text,
    vec_to_pg,
)

# ── _dev_embed ─────────────────────────────────────────────────────────────────


class TestDevEmbed:
    def test_returns_correct_dimension(self):
        vec = _dev_embed("hello world")
        assert len(vec) == EMBED_DIM

    def test_is_normalized(self):
        vec = _dev_embed("some text")
        norm = math.sqrt(sum(x * x for x in vec))
        assert abs(norm - 1.0) < 1e-6

    def test_deterministic(self):
        v1 = _dev_embed("terraform drift detected")
        v2 = _dev_embed("terraform drift detected")
        assert v1 == v2

    def test_different_inputs_produce_different_vectors(self):
        v1 = _dev_embed("aws_s3_bucket publicly accessible")
        v2 = _dev_embed("gcp_storage_bucket publicly accessible")
        assert v1 != v2

    def test_empty_string_returns_normalized_vector(self):
        vec = _dev_embed("")
        assert len(vec) == EMBED_DIM
        norm = math.sqrt(sum(x * x for x in vec))
        assert abs(norm - 1.0) < 1e-6

    def test_long_text_truncated_correctly(self):
        long_text = "drift " * 500
        vec = _dev_embed(long_text)
        assert len(vec) == EMBED_DIM

    def test_all_floats(self):
        vec = _dev_embed("security finding")
        assert all(isinstance(v, float) for v in vec)


# ── _truncate_normalize ────────────────────────────────────────────────────────


class TestTruncateNormalize:
    def test_truncates_to_dim(self):
        vec = list(range(512))
        result = _truncate_normalize(vec, 384)
        assert len(result) == 384

    def test_normalizes_to_unit_length(self):
        vec = [3.0, 4.0]
        result = _truncate_normalize(vec, 2)
        norm = math.sqrt(sum(x * x for x in result))
        assert abs(norm - 1.0) < 1e-9
        assert abs(result[0] - 0.6) < 1e-9
        assert abs(result[1] - 0.8) < 1e-9

    def test_zero_vector_doesnt_divide_by_zero(self):
        vec = [0.0, 0.0, 0.0]
        result = _truncate_normalize(vec, 3)
        assert len(result) == 3
        assert all(v == 0.0 for v in result)

    def test_dim_larger_than_vec_returns_full_vec(self):
        vec = [1.0, 0.0]
        result = _truncate_normalize(vec, 100)
        assert len(result) == 2


# ── cosine_similarity ─────────────────────────────────────────────────────────


class TestCosineSimilarity:
    def test_identical_vectors_give_one(self):
        vec = _dev_embed("s3 bucket exposed")
        sim = cosine_similarity(vec, vec)
        assert abs(sim - 1.0) < 1e-6

    def test_orthogonal_vectors_give_zero(self):
        a = [1.0, 0.0]
        b = [0.0, 1.0]
        assert abs(cosine_similarity(a, b)) < 1e-9

    def test_opposite_vectors_give_negative_one(self):
        a = [1.0, 0.0]
        b = [-1.0, 0.0]
        assert abs(cosine_similarity(a, b) - (-1.0)) < 1e-9

    def test_similar_texts_higher_than_dissimilar(self):
        base = _dev_embed("aws_s3_bucket publicly accessible security")
        similar = _dev_embed("aws_s3_bucket public access security finding")
        dissimilar = _dev_embed("kubernetes pod memory limit unset")
        sim_close = cosine_similarity(base, similar)
        sim_far = cosine_similarity(base, dissimilar)
        assert sim_close > sim_far

    def test_returns_float(self):
        a = [0.6, 0.8]
        b = [0.8, 0.6]
        result = cosine_similarity(a, b)
        assert isinstance(result, float)

    def test_mismatched_lengths_uses_zip(self):
        a = [1.0, 0.0, 0.0]
        b = [1.0, 0.0]
        result = cosine_similarity(a, b)
        assert result == 1.0


# ── vec_to_pg ─────────────────────────────────────────────────────────────────


class TestVecToPg:
    def test_format_single_element(self):
        assert vec_to_pg([1.5]) == "[1.500000]"

    def test_format_multiple_elements(self):
        result = vec_to_pg([1.0, 2.0, 3.0])
        assert result == "[1.000000,2.000000,3.000000]"

    def test_starts_with_bracket_ends_with_bracket(self):
        result = vec_to_pg([0.1, 0.2])
        assert result.startswith("[")
        assert result.endswith("]")

    def test_six_decimal_places(self):
        result = vec_to_pg([0.123456789])
        assert result == "[0.123457]"  # rounded to 6 decimal places

    def test_negative_values(self):
        result = vec_to_pg([-1.0, -0.5])
        assert result == "[-1.000000,-0.500000]"

    def test_empty_vector(self):
        assert vec_to_pg([]) == "[]"

    def test_full_embed_dim_vector(self):
        vec = _dev_embed("test")
        pg = vec_to_pg(vec)
        assert pg.startswith("[")
        assert pg.endswith("]")
        assert pg.count(",") == EMBED_DIM - 1


# ── intent_text ───────────────────────────────────────────────────────────────


class TestIntentText:
    def test_empty_findings_returns_plan_summary(self):
        result = intent_text([], "This PR adds a new S3 bucket")
        assert result.strip() == "This PR adds a new S3 bucket"

    def test_findings_appended_after_summary(self):
        findings = [
            {"severity": "high", "resource": "aws_s3_bucket.logs", "message": "public access"},
        ]
        result = intent_text(findings, "Add storage")
        assert "Add storage" in result
        assert "high" in result
        assert "aws_s3_bucket.logs" in result
        assert "public access" in result

    def test_truncates_to_first_five_findings(self):
        findings = [{"severity": "high", "resource": f"aws_s3_{i}", "message": f"issue {i}"} for i in range(10)]
        result = intent_text(findings, "summary")
        for i in range(5):
            assert f"aws_s3_{i}" in result
        for i in range(5, 10):
            assert f"aws_s3_{i}" not in result

    def test_plan_summary_truncated_at_400_chars(self):
        long_summary = "x" * 600
        findings = [{"severity": "low", "resource": "res", "message": "msg"}]
        result = intent_text(findings, long_summary)
        plan_part = result.split("low")[0]
        assert len(plan_part.strip()) <= 400

    def test_missing_finding_fields_handled(self):
        findings = [{"severity": "high"}]
        result = intent_text(findings, "summary")
        assert "high" in result

    def test_returns_string(self):
        result = intent_text([], "")
        assert isinstance(result, str)


# ── embed() ──────────────────────────────────────────────────────────────────


class TestEmbed:
    @pytest.mark.asyncio
    async def test_no_voyage_key_uses_dev_fallback_and_records_it(self, monkeypatch):
        from driftguard.core.config import settings

        monkeypatch.setattr(settings, "voyage_api_key", "")
        recorded = AsyncMock()
        with patch("driftguard.services.embeddings.record_embedding_outcome", recorded):
            vec = await embed("aws_s3_bucket public access")

        assert len(vec) == EMBED_DIM
        assert vec == _dev_embed("aws_s3_bucket public access")
        recorded.assert_awaited_once_with(used="dev_fallback", error="VOYAGE_API_KEY not configured")

    @pytest.mark.asyncio
    async def test_voyage_success_uses_the_voyage_key_not_anthropic(self, monkeypatch):
        # Regression test for the actual bug: _voyage_embed authenticated
        # with settings.anthropic_api_key. Set both to different values so a
        # call using the wrong one is caught, not accidentally passed by
        # coincidence.
        from driftguard.core.config import settings

        monkeypatch.setattr(settings, "voyage_api_key", "pa-voyage-test-key")
        monkeypatch.setattr(settings, "anthropic_api_key", "sk-ant-should-not-be-used")

        captured_headers = {}

        class FakeResponse:
            def raise_for_status(self):
                pass

            def json(self):
                return {"data": [{"embedding": [1.0] * 1024}]}

        class FakeAsyncClient:
            def __init__(self, timeout=None):
                pass

            async def __aenter__(self):
                return self

            async def __aexit__(self, *a):
                return False

            async def post(self, url, headers=None, json=None):
                captured_headers.update(headers or {})
                return FakeResponse()

        recorded = AsyncMock()
        with (
            patch("driftguard.services.embeddings.httpx.AsyncClient", FakeAsyncClient),
            patch("driftguard.services.embeddings.record_embedding_outcome", recorded),
        ):
            vec = await embed("terraform drift detected")

        assert len(vec) == EMBED_DIM
        assert captured_headers.get("Authorization") == "Bearer pa-voyage-test-key"
        assert "sk-ant-should-not-be-used" not in captured_headers.get("Authorization", "")
        recorded.assert_awaited_once_with(used="voyage")

    @pytest.mark.asyncio
    async def test_voyage_failure_falls_back_to_dev_embed_and_records_the_reason(self, monkeypatch):
        from driftguard.core.config import settings

        monkeypatch.setattr(settings, "voyage_api_key", "pa-voyage-test-key")

        class FakeAsyncClient:
            def __init__(self, timeout=None):
                pass

            async def __aenter__(self):
                return self

            async def __aexit__(self, *a):
                return False

            async def post(self, *a, **kw):
                raise RuntimeError("401 Unauthorized")

        recorded = AsyncMock()
        with (
            patch("driftguard.services.embeddings.httpx.AsyncClient", FakeAsyncClient),
            patch("driftguard.services.embeddings.record_embedding_outcome", recorded),
        ):
            vec = await embed("some incident text")

        assert vec == _dev_embed("some incident text")
        recorded.assert_awaited_once()
        kwargs = recorded.await_args.kwargs
        assert kwargs["used"] == "dev_fallback"
        assert "401" in kwargs["error"]
