"""
Iteration 5: Prisma v1.3 — OS enhancements:
- Custom fields, recurrence (lazy), templates, from-template
- OS send (email/whatsapp), Public portal (get/related/sign/checkout/receipt)
- Task time tracking (start/stop/manual) + PATCH custom_fields
"""
import os
import time
import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"
SESSION_TOKEN = "test_session_1785228939986"
ORG_ID = "org-1785228939986"
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({
        "Authorization": f"Bearer {SESSION_TOKEN}",
        "Content-Type": "application/json",
    })
    return s


@pytest.fixture(scope="module")
def mongo():
    c = MongoClient(MONGO_URL)
    return c[DB_NAME]


# ---------- Sanity ----------
def test_auth_me(client):
    r = client.get(f"{API}/auth/me")
    assert r.status_code == 200
    data = r.json()
    user = data.get("user", data)
    assert user.get("org_id") == ORG_ID


# ---------- OS Create with custom_fields + recurrence ----------
@pytest.fixture(scope="module")
def created_os(client):
    payload = {
        "title": "TEST_OS_v13",
        "client_name": "Cliente Teste v13",
        "client_email": "test.user@example.com",
        "client_phone": "+5511999999999",
        "items": [{"description": "Serviço A", "quantity": 2, "unit_price": 500.0}],
        "custom_fields": [
            {"name": "prioridade", "type": "select",
             "value": "alta", "options": ["baixa", "media", "alta"]}
        ],
        "recurrence": {"enabled": True, "interval": "monthly"},
    }
    r = client.post(f"{API}/os", json=payload)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["public_token"]
    assert data["total"] == 1000.0
    assert data["recurrence"]["enabled"] is True
    assert data["recurrence"]["next_run_at"]  # server auto-fills
    assert len(data["custom_fields"]) == 1
    yield data
    # Cleanup handled at end


def test_os_created_has_all_fields(created_os):
    assert created_os["os_id"]
    assert created_os["public_token"]
    assert created_os["custom_fields"][0]["value"] == "alta"


def test_os_patch_custom_fields_and_recurrence(client, created_os):
    r = client.patch(f"{API}/os/{created_os['os_id']}", json={
        "custom_fields": [{"name": "prioridade", "type": "text", "value": "urgente"}],
        "recurrence": {"enabled": True, "interval": "weekly"},
    })
    assert r.status_code == 200
    # verify persistence
    r2 = client.get(f"{API}/os")
    items = r2.json()["items"]
    ours = next(i for i in items if i["os_id"] == created_os["os_id"])
    assert ours["custom_fields"][0]["value"] == "urgente"
    assert ours["recurrence"]["interval"] == "weekly"


# ---------- Templates CRUD ----------
@pytest.fixture(scope="module")
def created_template(client):
    r = client.post(f"{API}/os/templates", json={
        "name": "TEST_TPL_v13",
        "title": "Consultoria Padrão",
        "items": [{"description": "Consultoria 1h", "quantity": 1, "unit_price": 300}],
        "custom_fields": [{"name": "modalidade", "type": "text", "value": "remoto"}],
        "notes": "Notas padrão",
    })
    assert r.status_code == 200, r.text
    return r.json()


def test_list_templates_contains_created(client, created_template):
    r = client.get(f"{API}/os/templates")
    assert r.status_code == 200
    ids = [t["template_id"] for t in r.json()["items"]]
    assert created_template["template_id"] in ids


def test_os_from_template(client, created_template):
    r = client.post(f"{API}/os/from-template", json={
        "template_id": created_template["template_id"],
        "client_name": "Cliente Do Template",
        "client_email": "cliente_tpl@example.com",
    })
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["client_name"] == "Cliente Do Template"
    assert len(data["items"]) == 1
    assert data["items"][0]["unit_price"] == 300
    assert data["total"] == 300
    assert data["custom_fields"][0]["name"] == "modalidade"
    assert data["public_token"]
    # cleanup
    client.delete(f"{API}/os/{data['os_id']}")


# ---------- OS Send ----------
def test_os_send_email_and_whatsapp(client, created_os):
    r = client.post(f"{API}/os/{created_os['os_id']}/send", json={
        "channels": ["email", "whatsapp"],
        "origin_url": BASE_URL,
    })
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["ok"] is True
    assert d.get("url", "").endswith(created_os["public_token"])
    # email should have status
    assert "email" in d
    # WhatsApp may fail (expected per context), just ensure key present
    assert "whatsapp" in d


def test_os_send_no_contact_still_ok(client):
    # create minimal OS with no email/phone
    r = client.post(f"{API}/os", json={
        "title": "TEST_OS_nocontact",
        "client_name": "Sem Contato",
        "items": [{"description": "x", "quantity": 1, "unit_price": 10}],
    })
    os_id = r.json()["os_id"]
    token = r.json()["public_token"]
    r2 = client.post(f"{API}/os/{os_id}/send", json={"channels": ["email", "whatsapp"], "origin_url": BASE_URL})
    assert r2.status_code == 200
    d = r2.json()
    assert d["ok"] is True
    assert token in d["url"]
    client.delete(f"{API}/os/{os_id}")


# ---------- Public portal ----------
def test_public_get_os(created_os):
    r = requests.get(f"{API}/public/os/{created_os['public_token']}")
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["os"]["os_id"] == created_os["os_id"]
    assert "brand" in d and "name" in d["brand"]
    # sensitive fields should not include public_token, org_id
    assert "public_token" not in d["os"]
    assert "org_id" not in d["os"]


def test_public_related(created_os):
    r = requests.get(f"{API}/public/os/{created_os['public_token']}/related")
    assert r.status_code == 200
    assert "items" in r.json()


def test_public_sign_flow(client, created_os):
    # create fresh OS so we can sign it
    r = client.post(f"{API}/os", json={
        "title": "TEST_OS_sign",
        "client_name": "Sign Client",
        "client_email": "sign@example.com",
        "items": [{"description": "x", "quantity": 1, "unit_price": 100}],
    })
    assert r.status_code == 200
    os_data = r.json()
    token = os_data["public_token"]

    # Signing without accept_terms -> 400
    r1 = requests.post(f"{API}/public/os/{token}/sign",
                       json={"full_name": "Fulano", "email": "sign@example.com", "accept_terms": False})
    assert r1.status_code == 400

    # First sign OK
    r2 = requests.post(f"{API}/public/os/{token}/sign",
                       json={"full_name": "Fulano", "email": "sign@example.com", "accept_terms": True})
    assert r2.status_code == 200, r2.text
    d = r2.json()
    assert d["signature_hash"] and len(d["signature_hash"]) == 64
    assert d["signed_at"]

    # Second sign -> 400
    r3 = requests.post(f"{API}/public/os/{token}/sign",
                       json={"full_name": "Fulano", "email": "sign@example.com", "accept_terms": True})
    assert r3.status_code == 400

    # Receipt PDF only after sign
    r4 = requests.get(f"{API}/public/os/{token}/receipt")
    assert r4.status_code == 200
    assert r4.headers["content-type"].startswith("application/pdf")
    assert len(r4.content) > 1000

    # Cleanup
    client.delete(f"{API}/os/{os_data['os_id']}")


def test_public_receipt_before_sign_fails(client):
    r = client.post(f"{API}/os", json={
        "title": "TEST_OS_no_sign",
        "client_name": "NS",
        "items": [{"description": "x", "quantity": 1, "unit_price": 50}],
    })
    token = r.json()["public_token"]
    os_id = r.json()["os_id"]
    r2 = requests.get(f"{API}/public/os/{token}/receipt")
    assert r2.status_code == 400
    client.delete(f"{API}/os/{os_id}")


def test_public_checkout(created_os):
    r = requests.post(f"{API}/public/os/{created_os['public_token']}/checkout",
                      json={"origin_url": BASE_URL})
    assert r.status_code == 200, r.text
    d = r.json()
    assert "checkout.stripe.com" in d["checkout_url"]
    assert "pix_enabled" in d  # true or false both acceptable


# ---------- Task time tracking ----------
@pytest.fixture(scope="module")
def created_task(client):
    # need a project first
    p = client.post(f"{API}/projects", json={"name": "TEST_PRJ_v13", "description": "x"})
    assert p.status_code == 200
    project_id = p.json()["project_id"]
    t = client.post(f"{API}/projects/{project_id}/tasks", json={"title": "TEST_TASK_v13"})
    assert t.status_code == 200
    return t.json()


def test_task_time_start_stop(client, created_task):
    tid = created_task["task_id"]
    r1 = client.post(f"{API}/tasks/{tid}/time/start", json={})
    assert r1.status_code == 200
    assert r1.json()["ok"] is True
    time.sleep(2)
    r2 = client.post(f"{API}/tasks/{tid}/time/stop", json={})
    assert r2.status_code == 200
    assert r2.json()["total_seconds"] >= 1


def test_task_time_manual_log(client, created_task):
    tid = created_task["task_id"]
    r = client.post(f"{API}/tasks/{tid}/time/log", json={"seconds": 120, "note": "manual"})
    assert r.status_code == 200
    assert r.json()["total_seconds"] >= 120


def test_task_patch_custom_fields_and_status(client, created_task):
    tid = created_task["task_id"]
    r = client.patch(f"{API}/tasks/{tid}", json={
        "custom_fields": [{"name": "sla", "type": "text", "value": "24h"}]
    })
    assert r.status_code == 200
    # backward compat: status only still works
    r2 = client.patch(f"{API}/tasks/{tid}", json={"status": "em_progresso"})
    assert r2.status_code == 200


# ---------- Recurrence lazy generation ----------
def test_recurrence_lazy_generates_child(client, mongo, created_os):
    # Force next_run_at to the past via mongo (server env)
    mongo.ordem_servico.update_one(
        {"os_id": created_os["os_id"]},
        {"$set": {"recurrence.enabled": True,
                  "recurrence.interval": "monthly",
                  "recurrence.next_run_at": "2020-01-01T00:00:00+00:00"}},
    )
    # count children before
    before = mongo.ordem_servico.count_documents({"parent_recurrence_id": created_os["os_id"]})
    # trigger lazy generator
    r = client.get(f"{API}/os")
    assert r.status_code == 200
    after = mongo.ordem_servico.count_documents({"parent_recurrence_id": created_os["os_id"]})
    assert after == before + 1, f"Expected child OS to be created, before={before}, after={after}"
    # cleanup children
    mongo.ordem_servico.delete_many({"parent_recurrence_id": created_os["os_id"]})


# ---------- Cleanup at teardown ----------
def test_zzz_cleanup(client, created_os, created_template):
    client.delete(f"{API}/os/{created_os['os_id']}")
    client.delete(f"{API}/os/templates/{created_template['template_id']}")
