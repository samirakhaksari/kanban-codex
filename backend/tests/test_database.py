from concurrent.futures import ThreadPoolExecutor

from app.database import get_database_connection


def test_request_connection_can_be_used_and_closed_on_another_worker(tmp_path, monkeypatch):
    monkeypatch.setenv("KANBAN_DATA_DIR", str(tmp_path))
    dependency = get_database_connection()
    connection = next(dependency)
    try:
        with ThreadPoolExecutor(max_workers=1) as worker:
            assert worker.submit(lambda: connection.execute("SELECT 1").fetchone()[0]).result() == 1
            worker.submit(dependency.close).result()
    finally:
        dependency.close()
