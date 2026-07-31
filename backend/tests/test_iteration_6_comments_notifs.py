"""Iteration 6 — Comments + @mentions + Notifications + /api/tasks/all."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://pme-all-in-one.preview.emergentagent.com").rstrip("/")
TOKEN_A = "test_session_1785228939986"          # owner, user_id test-user-1785228939986
TOKEN_B = "sess_ana_2"                          # user_id test-user-2 (same org)
USER_A = "test-user-1785228939986"
USER_B = "test-user-2"


def _h(tok):
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def project_id():
    r = requests.post(f"{BASE_URL}/api/projects", headers=_h(TOKEN_A),
                      json={"name": "TEST_prj_iter6"})
    assert r.status_code in (200, 201), r.text
    return r.json()["project_id"]


@pytest.fixture(scope="module")
def task_id(project_id):
    r = requests.post(f"{BASE_URL}/api/projects/{project_id}/tasks", headers=_h(TOKEN_A),
                      json={"title": "TEST_task_iter6", "status": "backlog",
                            "due_date": "2026-02-15"})
    assert r.status_code in (200, 201), r.text
    return r.json()["task_id"]


# ---------- /api/tasks/all ----------
def test_tasks_all_returns_org_tasks(task_id):
    r = requests.get(f"{BASE_URL}/api/tasks/all", headers=_h(TOKEN_A))
    assert r.status_code == 200, r.text
    data = r.json()
    assert "items" in data and isinstance(data["items"], list)
    ids = [t.get("task_id") for t in data["items"]]
    assert task_id in ids


def test_tasks_all_requires_auth():
    r = requests.get(f"{BASE_URL}/api/tasks/all")
    assert r.status_code in (401, 403)


# ---------- Comments CRUD + mentions ----------
def test_list_comments_empty(task_id):
    r = requests.get(f"{BASE_URL}/api/tasks/{task_id}/comments", headers=_h(TOKEN_A))
    assert r.status_code == 200
    assert isinstance(r.json()["items"], list)


def test_create_comment_with_mention_creates_notification(task_id):
    # Snapshot B's unread count before
    r0 = requests.get(f"{BASE_URL}/api/notifications", headers=_h(TOKEN_B))
    assert r0.status_code == 200
    unread_before = r0.json()["unread"]

    # A mentions B
    payload = {"body": "Olá @Ana, revisar por favor",
               "mentions": [{"user_id": USER_B, "name": "Ana Colega"}]}
    r = requests.post(f"{BASE_URL}/api/tasks/{task_id}/comments",
                      headers=_h(TOKEN_A), json=payload)
    assert r.status_code in (200, 201), r.text
    c = r.json()
    assert c["author_id"] == USER_A
    assert c["body"] == payload["body"]
    assert c["mentions"][0]["user_id"] == USER_B
    assert "_id" not in c

    # Verify persistence via GET
    rg = requests.get(f"{BASE_URL}/api/tasks/{task_id}/comments", headers=_h(TOKEN_A))
    assert rg.status_code == 200
    ids = [x["comment_id"] for x in rg.json()["items"]]
    assert c["comment_id"] in ids

    # B should now have +1 unread mention notification
    r1 = requests.get(f"{BASE_URL}/api/notifications", headers=_h(TOKEN_B))
    assert r1.status_code == 200
    unread_after = r1.json()["unread"]
    assert unread_after == unread_before + 1
    top = r1.json()["items"][0]
    assert top["kind"] == "mention"
    assert top["target"]["task_id"] == task_id


def test_self_mention_does_not_notify(task_id):
    r0 = requests.get(f"{BASE_URL}/api/notifications", headers=_h(TOKEN_A))
    unread_before = r0.json()["unread"]

    payload = {"body": "@me nota interna",
               "mentions": [{"user_id": USER_A, "name": "Usuario Teste"}]}
    r = requests.post(f"{BASE_URL}/api/tasks/{task_id}/comments",
                      headers=_h(TOKEN_A), json=payload)
    assert r.status_code in (200, 201)

    r1 = requests.get(f"{BASE_URL}/api/notifications", headers=_h(TOKEN_A))
    assert r1.json()["unread"] == unread_before  # unchanged


def test_delete_comment_forbidden_for_non_author(task_id):
    # A creates a comment
    r = requests.post(f"{BASE_URL}/api/tasks/{task_id}/comments",
                      headers=_h(TOKEN_A), json={"body": "TEST_delete_target"})
    cid = r.json()["comment_id"]

    # B tries to delete → 403
    rd = requests.delete(f"{BASE_URL}/api/tasks/{task_id}/comments/{cid}",
                         headers=_h(TOKEN_B))
    assert rd.status_code == 403, rd.text

    # A deletes → 200
    rd2 = requests.delete(f"{BASE_URL}/api/tasks/{task_id}/comments/{cid}",
                          headers=_h(TOKEN_A))
    assert rd2.status_code == 200
    assert rd2.json().get("ok") is True

    # Verify removal
    rg = requests.get(f"{BASE_URL}/api/tasks/{task_id}/comments", headers=_h(TOKEN_A))
    assert cid not in [x["comment_id"] for x in rg.json()["items"]]


# ---------- Notifications ----------
def test_notifications_list_shape():
    r = requests.get(f"{BASE_URL}/api/notifications", headers=_h(TOKEN_B))
    assert r.status_code == 200
    d = r.json()
    assert "items" in d and "unread" in d
    assert isinstance(d["unread"], int)


def test_mark_single_read_decrements_unread(task_id):
    # Ensure B has at least 1 unread by mentioning
    requests.post(f"{BASE_URL}/api/tasks/{task_id}/comments", headers=_h(TOKEN_A),
                  json={"body": "@Ana ping", "mentions": [{"user_id": USER_B, "name": "Ana"}]})
    r = requests.get(f"{BASE_URL}/api/notifications", headers=_h(TOKEN_B))
    unread_before = r.json()["unread"]
    assert unread_before >= 1
    # Find an unread one
    unread_item = next(x for x in r.json()["items"] if not x["read"])
    rp = requests.post(f"{BASE_URL}/api/notifications/{unread_item['notif_id']}/read",
                       headers=_h(TOKEN_B))
    assert rp.status_code == 200
    r2 = requests.get(f"{BASE_URL}/api/notifications", headers=_h(TOKEN_B))
    assert r2.json()["unread"] == unread_before - 1


def test_mark_all_read():
    # Trigger a few mentions for B
    # Just call read-all and verify unread == 0
    r = requests.post(f"{BASE_URL}/api/notifications/read-all", headers=_h(TOKEN_B))
    assert r.status_code == 200
    r2 = requests.get(f"{BASE_URL}/api/notifications", headers=_h(TOKEN_B))
    assert r2.json()["unread"] == 0


def test_notifications_requires_auth():
    r = requests.get(f"{BASE_URL}/api/notifications")
    assert r.status_code in (401, 403)
