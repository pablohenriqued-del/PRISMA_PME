"""Backend tests for Núcleo IA - all endpoints under /api"""
import os
import json
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://pme-all-in-one.preview.emergentagent.com").rstrip("/")
TOKEN = "test_session_1785228939986"
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"})
    return sess


# ---------- Auth ----------
class TestAuth:
    def test_me_ok(self, s):
        r = s.get(f"{API}/auth/me")
        assert r.status_code == 200
        u = r.json()["user"]
        assert u["email"] == "test.user@example.com"
        assert u["org_id"] == "org-1785228939986"

    def test_me_unauthorized(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_leads_unauthorized(self):
        r = requests.get(f"{API}/crm/leads")
        assert r.status_code == 401


# ---------- Dashboard ----------
class TestDashboard:
    def test_overview(self, s):
        r = s.get(f"{API}/dashboard/overview")
        assert r.status_code == 200
        j = r.json()
        assert "kpis" in j and "pipeline" in j and "revenue_series" in j
        for k in ("leads", "ganhos", "receita", "despesa", "saldo"):
            assert k in j["kpis"]
        assert isinstance(j["revenue_series"], list)


# ---------- CRM CRUD ----------
class TestCRM:
    def test_list_leads_seeded(self, s):
        r = s.get(f"{API}/crm/leads")
        assert r.status_code == 200
        items = r.json()["items"]
        assert isinstance(items, list) and len(items) >= 1
        assert all(x["org_id"] == "org-1785228939986" for x in items)

    def test_crud_lead(self, s):
        # create
        r = s.post(f"{API}/crm/leads", json={"name": "TEST_Lead", "company": "TEST Co", "value": 999, "stage": "Lead"})
        assert r.status_code == 200
        lead = r.json()
        lid = lead["lead_id"]
        assert lead["org_id"] == "org-1785228939986"
        # verify GET
        r = s.get(f"{API}/crm/leads")
        assert any(x["lead_id"] == lid for x in r.json()["items"])
        # patch stage
        r = s.patch(f"{API}/crm/leads/{lid}", json={"stage": "Ganho"})
        assert r.status_code == 200
        r = s.get(f"{API}/crm/leads")
        assert next(x for x in r.json()["items"] if x["lead_id"] == lid)["stage"] == "Ganho"
        # delete
        r = s.delete(f"{API}/crm/leads/{lid}")
        assert r.status_code == 200
        r = s.get(f"{API}/crm/leads")
        assert not any(x["lead_id"] == lid for x in r.json()["items"])


# ---------- WhatsApp ----------
class TestWhatsApp:
    def test_chats_and_messages(self, s):
        r = s.get(f"{API}/wa/chats")
        assert r.status_code == 200
        chats = r.json()["items"]
        assert len(chats) >= 1
        cid = chats[0]["chat_id"]
        r = s.get(f"{API}/wa/chats/{cid}/messages")
        assert r.status_code == 200
        msgs_before = len(r.json()["items"])
        # send
        r = s.post(f"{API}/wa/chats/{cid}/messages", json={"body": "TEST_msg"})
        assert r.status_code == 200
        assert r.json()["direction"] == "out"
        r = s.get(f"{API}/wa/chats/{cid}/messages")
        assert len(r.json()["items"]) == msgs_before + 1

    def test_create_chat(self, s):
        r = s.post(f"{API}/wa/chats", json={"name": "TEST_Chat", "phone": "+55 11 99999-0000"})
        assert r.status_code == 200
        assert r.json()["org_id"] == "org-1785228939986"


# ---------- Projetos ----------
class TestProjects:
    def test_projects_and_tasks(self, s):
        r = s.get(f"{API}/projects")
        assert r.status_code == 200
        # Create new project + task
        r = s.post(f"{API}/projects", json={"name": "TEST_Proj", "description": "d"})
        assert r.status_code == 200
        pid = r.json()["project_id"]
        r = s.post(f"{API}/projects/{pid}/tasks", json={"title": "TEST_Task", "status": "a_fazer"})
        assert r.status_code == 200
        tid = r.json()["task_id"]
        r = s.get(f"{API}/projects/{pid}/tasks")
        assert any(t["task_id"] == tid for t in r.json()["items"])
        r = s.patch(f"{API}/tasks/{tid}", json={"status": "concluido"})
        assert r.status_code == 200
        r = s.get(f"{API}/projects/{pid}/tasks")
        assert next(t for t in r.json()["items"] if t["task_id"] == tid)["status"] == "concluido"


# ---------- Financeiro ----------
class TestFinance:
    def test_finance_crud(self, s):
        r = s.get(f"{API}/finance")
        assert r.status_code == 200
        j = r.json()
        for k in ("items", "receita", "despesa", "saldo"):
            assert k in j
        r = s.post(f"{API}/finance", json={"description": "TEST_tx", "amount": 100, "kind": "receita", "date": "2026-02-15"})
        assert r.status_code == 200
        tid = r.json()["tx_id"]
        r = s.delete(f"{API}/finance/{tid}")
        assert r.status_code == 200


# ---------- Documentos ----------
class TestDocs:
    def test_doc_crud(self, s):
        r = s.get(f"{API}/documents")
        assert r.status_code == 200
        r = s.post(f"{API}/documents", json={"title": "TEST_Doc.pdf", "kind": "geral", "size": 100})
        assert r.status_code == 200
        did = r.json()["doc_id"]
        r = s.delete(f"{API}/documents/{did}")
        assert r.status_code == 200


# ---------- Automations ----------
class TestAutomations:
    def test_auto_crud(self, s):
        r = s.get(f"{API}/automations")
        assert r.status_code == 200
        r = s.post(f"{API}/automations", json={"name": "TEST_Auto", "trigger": "novo_lead", "action": "enviar_email", "active": True})
        assert r.status_code == 200
        aid = r.json()["auto_id"]
        r = s.patch(f"{API}/automations/{aid}", json={"active": False})
        assert r.status_code == 200
        r = s.delete(f"{API}/automations/{aid}")
        assert r.status_code == 200


# ---------- Copilot SSE ----------
class TestCopilot:
    def test_copilot_stream(self, s):
        r = requests.post(
            f"{API}/copilot/chat",
            json={"message": "Diga apenas 'oi' em 2 palavras.", "session_id": "TEST_cop"},
            headers={"Authorization": f"Bearer {TOKEN}"},
            stream=True,
            timeout=60,
        )
        assert r.status_code == 200
        got_data = False
        got_done = False
        content = ""
        for raw in r.iter_lines(decode_unicode=True):
            if raw is None:
                continue
            if raw.startswith("data: "):
                payload = raw[6:]
                if payload == "[DONE]":
                    got_done = True
                    break
                got_data = True
                content += payload
            if "event: done" in raw:
                got_done = True
        r.close()
        assert got_data, f"No data chunks received. content={content!r}"
        assert got_done, "No done event received"
        assert len(content.strip()) > 0
