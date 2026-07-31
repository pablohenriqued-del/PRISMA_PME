"""Iteration 4 backend tests: Ordem de Serviço (OS), Stripe/PIX payments,
Copilot ops (create-task, generate-proposal, generate-report), Founder Deal public counter."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://pme-all-in-one.preview.emergentagent.com").rstrip("/")
TOKEN = "test_session_1785228939986"
API = f"{BASE_URL}/api"
ORG = "org-1785228939986"
ORIGIN = BASE_URL


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Authorization": f"Bearer {TOKEN}"})
    return sess


# ---------------- OS CRUD ----------------
class TestOSCrud:
    def test_os_requires_auth(self):
        assert requests.get(f"{API}/os").status_code == 401
        assert requests.post(f"{API}/os", json={"title": "x", "client_name": "y"}).status_code == 401

    def test_os_crud_flow(self, s):
        r = s.post(f"{API}/os", json={
            "title": "TEST_OS Manual",
            "client_name": "TEST Cliente",
            "client_email": "c@x.com",
            "items": [
                {"description": "Serviço A", "quantity": 2, "unit_price": 150},
                {"description": "Serviço B", "quantity": 1, "unit_price": 100},
            ],
        })
        assert r.status_code == 200, r.text
        os_doc = r.json()
        assert os_doc["os_id"].startswith("os_")
        assert os_doc["org_id"] == ORG
        assert os_doc["total"] == 400.00
        assert os_doc["status"] == "orcamento"
        oid = os_doc["os_id"]

        # list contains it
        lst = s.get(f"{API}/os").json()["items"]
        assert any(x["os_id"] == oid for x in lst)

        # patch: change status + items
        r = s.patch(f"{API}/os/{oid}", json={
            "status": "aprovada",
            "items": [{"description": "Novo", "quantity": 3, "unit_price": 50}],
        })
        assert r.status_code == 200
        lst2 = s.get(f"{API}/os").json()["items"]
        updated = next(x for x in lst2 if x["os_id"] == oid)
        assert updated["status"] == "aprovada"
        assert updated["total"] == 150.00

        # delete
        assert s.delete(f"{API}/os/{oid}").status_code == 200
        lst3 = s.get(f"{API}/os").json()["items"]
        assert not any(x["os_id"] == oid for x in lst3)


# ---------------- OS from-lead and to-project ----------------
class TestOSIntegrations:
    @pytest.fixture(scope="class")
    def a_lead(self, s):
        leads = s.get(f"{API}/crm/leads").json().get("items", [])
        if leads:
            return leads[0]
        r = s.post(f"{API}/crm/leads", json={
            "name": "TEST_LeadForOS", "company": "AcmeCo", "value": 2500, "stage": "Lead",
            "email": "lead@x.com", "phone": "+5511900000000",
        })
        assert r.status_code == 200
        return r.json()

    def test_os_from_lead(self, s, a_lead):
        r = s.post(f"{API}/os/from-lead", json={"lead_id": a_lead["lead_id"]})
        assert r.status_code == 200, r.text
        os_doc = r.json()
        assert os_doc["lead_id"] == a_lead["lead_id"]
        assert os_doc["client_name"] == a_lead["name"]
        assert os_doc["total"] >= 0
        # cleanup
        s.delete(f"{API}/os/{os_doc['os_id']}")

    def test_os_to_project_and_idempotent(self, s, a_lead):
        # create OS with items so tasks are generated
        r = s.post(f"{API}/os", json={
            "title": "TEST_OS_ToProject",
            "client_name": "TEST X",
            "items": [
                {"description": "Setup", "quantity": 1, "unit_price": 500},
                {"description": "Deploy", "quantity": 1, "unit_price": 300},
            ],
        })
        oid = r.json()["os_id"]
        try:
            r1 = s.post(f"{API}/os/{oid}/to-project")
            assert r1.status_code == 200, r1.text
            j1 = r1.json()
            assert j1.get("ok") is True and j1.get("project_id")
            proj_id = j1["project_id"]

            # OS updated
            lst = s.get(f"{API}/os").json()["items"]
            os_after = next(x for x in lst if x["os_id"] == oid)
            assert os_after["project_id"] == proj_id
            assert os_after["status"] == "em_execucao"

            # Tasks created (one per item)
            tasks = s.get(f"{API}/projects/{proj_id}/tasks").json().get("items", [])
            assert len(tasks) >= 2, tasks

            # Idempotent second call
            r2 = s.post(f"{API}/os/{oid}/to-project")
            assert r2.status_code == 200
            assert r2.json().get("already") is True
            assert r2.json().get("project_id") == proj_id
        finally:
            s.delete(f"{API}/os/{oid}")


# ---------------- Payments ----------------
class TestPayments:
    def test_checkout_subscription_trial_guest(self):
        r = requests.post(f"{API}/payments/checkout", json={
            "lookup_key": "prisma_starter_monthly",
            "origin_url": ORIGIN,
            "trial_days": 30,
        })
        assert r.status_code == 200, r.text
        j = r.json()
        assert "checkout.stripe.com" in j["checkout_url"]
        assert j["session_id"].startswith("cs_")
        # Subscription => pix_enabled should be False
        assert j["pix_enabled"] is False

    def test_checkout_founder_deal_pix_or_card(self):
        r = requests.post(f"{API}/payments/checkout", json={
            "lookup_key": "prisma_founder_deal",
            "origin_url": ORIGIN,
        })
        assert r.status_code == 200, r.text
        j = r.json()
        assert "checkout.stripe.com" in j["checkout_url"]
        assert j["session_id"].startswith("cs_")
        # pix_enabled either True or False, but URL must be present
        assert isinstance(j["pix_enabled"], bool)

    def test_status_endpoint_no_auth(self):
        r = requests.post(f"{API}/payments/checkout", json={
            "lookup_key": "prisma_starter_monthly",
            "origin_url": ORIGIN,
            "trial_days": 30,
        })
        sid = r.json()["session_id"]
        rs = requests.get(f"{API}/payments/status/{sid}")
        assert rs.status_code == 200, rs.text
        j = rs.json()
        assert set(["session_id", "status", "payment_status", "amount", "currency", "lookup_key"]).issubset(j.keys())
        assert j["session_id"] == sid
        assert j["payment_status"] == "pending"

    def test_os_checkout_authed(self, s):
        # OS with total > 0
        r = s.post(f"{API}/os", json={
            "title": "TEST_OS_Charge", "client_name": "TEST C",
            "items": [{"description": "X", "quantity": 1, "unit_price": 200}],
        })
        oid = r.json()["os_id"]
        try:
            r1 = s.post(f"{API}/payments/os-checkout", json={"os_id": oid, "origin_url": ORIGIN})
            assert r1.status_code == 200, r1.text
            assert "checkout.stripe.com" in r1.json()["checkout_url"]

            # No auth => 401
            r2 = requests.post(f"{API}/payments/os-checkout", json={"os_id": oid, "origin_url": ORIGIN})
            assert r2.status_code == 401
        finally:
            s.delete(f"{API}/os/{oid}")

    def test_os_checkout_no_total_400(self, s):
        r = s.post(f"{API}/os", json={"title": "TEST_OS_zero", "client_name": "TEST"})
        oid = r.json()["os_id"]
        try:
            r1 = s.post(f"{API}/payments/os-checkout", json={"os_id": oid, "origin_url": ORIGIN})
            assert r1.status_code == 400
        finally:
            s.delete(f"{API}/os/{oid}")


# ---------------- Founder Deal counter ----------------
class TestFounderDeal:
    def test_public_founder_deal(self):
        r = requests.get(f"{API}/public/founder-deal")
        assert r.status_code == 200
        j = r.json()
        assert j["cap"] == 100
        assert isinstance(j["claimed"], int)
        assert j["remaining"] == max(0, 100 - j["claimed"])


# ---------------- Copilot ops ----------------
class TestCopilotOps:
    def test_create_task(self, s):
        r = s.post(f"{API}/copilot/create-task", json={"title": "TEST_cop_task"})
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["title"] == "TEST_cop_task"
        assert j["status"] == "a_fazer"
        assert j["project_id"]
        assert j["org_id"] == ORG

    def test_generate_proposal(self, s):
        r = s.post(f"{API}/copilot/generate-proposal", json={
            "client_name": "TEST Cliente Prop",
            "scope": "Implantar Prisma e treinar equipe",
            "value": 5000.0,
        }, timeout=120)
        assert r.status_code == 200, r.text
        j = r.json()
        assert j.get("proposal") and len(j["proposal"]) > 50
        assert j.get("doc_id")
        # Verify doc appears in /api/documents
        docs = s.get(f"{API}/documents").json().get("items", [])
        assert any(d.get("doc_id") == j["doc_id"] and d.get("kind") == "proposta" for d in docs)

    def test_generate_report(self, s):
        r = s.post(f"{API}/copilot/generate-report", json={"type": "geral"}, timeout=120)
        assert r.status_code == 200, r.text
        j = r.json()
        assert j.get("report") and len(j["report"]) > 50
        data = j.get("data") or {}
        assert "crm" in data and "financeiro" in data and "projetos" in data
        # Present in documents
        docs = s.get(f"{API}/documents").json().get("items", [])
        assert any(d.get("kind") == "relatorio" and d.get("report_id") == j.get("report_id") for d in docs)

    def test_copilot_endpoints_require_auth(self):
        assert requests.post(f"{API}/copilot/create-task", json={"title": "x"}).status_code == 401
        assert requests.post(f"{API}/copilot/generate-proposal", json={}).status_code == 401
        assert requests.post(f"{API}/copilot/generate-report", json={"type": "geral"}).status_code == 401
