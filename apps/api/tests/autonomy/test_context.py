from driftguard.autonomy.context import gather_context


def test_gather_context_includes_tree_and_docs(tmp_path):
    (tmp_path / "README.md").write_text("# Demo project\nThis is a test.")
    (tmp_path / "app").mkdir()
    (tmp_path / "app" / "main.py").write_text("print('hi')")
    (tmp_path / "node_modules").mkdir()
    (tmp_path / "node_modules" / "junk.js").write_text("ignored")

    context = gather_context(tmp_path)

    assert "README.md" in context
    assert "Demo project" in context
    assert "app/main.py" in context
    assert "node_modules" not in context


def test_gather_context_handles_missing_docs_and_no_git(tmp_path):
    (tmp_path / "src").mkdir()
    # No README, no .git — must not raise.
    context = gather_context(tmp_path)
    assert "Directory tree" in context
