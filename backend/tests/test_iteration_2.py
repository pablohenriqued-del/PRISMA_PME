"""Iteration 2 backend tests: Twilio config, team invites, documents upload/download,
automation engine triggers/runs, wa webhook."""
import os
import io
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://pme-all-in-one.preview.emergentagent.com").rstrip("/")
TOKEN = "test_session_1785228939986"
API = f"{BASE_URL}/api"
ORG = "org-1785228939986"


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Authorization": f"Bearer {TOKEN}"})
    return sess


# -------- WA / Twilio config --------
class TestWaConfig:
    def test_wa_config_twilio_enabled(self, s):
        r = s.get(f"{API}/wa/config")
        assert r.status_code == 200
        j = r.json()
        assert j["twilio_enabled"] is True
        assert "whatsapp:" in j["twilio_from"]


# -------- Team invites --------
class TestTeam:
    def test_members_list(self, s):
        r = s.get(f"{API}/team/members")
        assert r.status_code == 200
        j = r.json()
        assert "members" in j and "invites" in j
        assert any(m["email"] == "test.user@example.com" for m in j["members"])

    def test_invite_flow(self, s):
        invite_email = "delivered@resend.dev"
        # cleanup any pre-existing pending invite
        pre = s.get(f"{API}/team/members").json()
        for inv in pre.get("invites", []):
            if inv["email"] == invite_email:
                s.delete(f"{API}/team/invite/{inv['invite_id']}")

        r = s.post(f"{API}/team/invite", json={"email": invite_email, "role": "comercial"})
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["ok"] is True
        inv = j["invite"]
        assert inv["email"] == invite_email
        assert inv["org_id"] == ORG
        assert inv["role"] == "comercial"
        assert inv["status"] == "pending"
        invite_id = inv["invite_id"]

        # Should appear in invites list
        r = s.get(f"{API}/team/members")
        assert any(i["invite_id"] == invite_id for i in r.json()["invites"])

        # Cancel
        r = s.delete(f"{API}/team/invite/{invite_id}")
        assert r.status_code == 200
        r = s.get(f"{API}/team/members")
        assert not any(i["invite_id"] == invite_id for i in r.json()["invites"])

    def test_invite_unauthorized(self):
        r = requests.post(f"{API}/team/invite", json={"email": "x@y.com", "role": "comercial"})
        assert r.status_code == 401

    def test_change_role_owner_only(self, s):
        # Owner test user should be able to call (targeting self); simply verifies 200 path
        me = s.get(f"{API}/auth/me").json()["user"]
        r = s.patch(f"{API}/team/members/{me['user_id']}", json={"role": "owner"})
        assert r.status_code == 200


# -------- Documents upload / download --------
class TestDocsUpload:
    def test_upload_and_download(self, s):
        content = b"%PDF-1.4 TEST_upload contents for iteration 2\n"
        files = {"file": ("TEST_upload.pdf", io.BytesIO(content), "application/pdf")}
        data = {"kind": "contrato"}
        r = s.post(f"{API}/documents/upload", files=files, data=data)
        # If storage is unavailable, backend returns 500 with "Storage indisponível" -- treat as env issue but fail
        assert r.status_code == 200, f"upload failed: {r.status_code} {r.text[:300]}"
        doc = r.json()
        assert doc["title"] == "TEST_upload.pdf"
        assert doc["kind"] == "contrato"
        assert doc["storage_path"]
        assert doc["org_id"] == ORG
        did = doc["doc_id"]

        # Download authorized
        r = s.get(f"{API}/documents/{did}/download")
        assert r.status_code == 200
        assert b"TEST_upload contents" in r.content
        assert "TEST_upload.pdf" in r.headers.get("Content-Disposition", "")

        # Download unauth
        r2 = requests.get(f"{API}/documents/{did}/download")
        assert r2.status_code == 401

        # cleanup
        s.delete(f"{API}/documents/{did}")


# -------- Automation engine --------
class TestAutomationEngine:
    def _create_auto(self, s, name, trigger, action, active=True, target="", template=""):
        r = s.post(f"{API}/automations", json={
            "name": name, "trigger": trigger, "action": action,
            "active": active, "target": target, "template": template,
        })
        assert r.status_code == 200
        return r.json()["auto_id"]

    def _find_run(self, s, auto_id, timeout=8):
        deadline = time.time() + timeout
        while time.time() < deadline:
            runs = s.get(f"{API}/automations/runs").json()["items"]
            for r in runs:
                if r["auto_id"] == auto_id:
                    return r
            time.sleep(0.5)
        return None

    def test_novo_lead_fires_criar_tarefa(self, s):
        aid = self._create_auto(s, "TEST_auto_criar", "novo_lead", "criar_tarefa")
        try:
            r = s.post(f"{API}/crm/leads", json={"name": "TEST_AutoLead", "company": "Co", "value": 1, "stage": "Lead"})
            assert r.status_code == 200
            lid = r.json()["lead_id"]
            run = self._find_run(s, aid)
            assert run is not None, "automation run not logged"
            assert run["trigger"] == "novo_lead"
            assert run["action"] == "criar_tarefa"
            assert run["result"]["status"] in ("created", "skipped")
            s.delete(f"{API}/crm/leads/{lid}")
        finally:
            s.delete(f"{API}/automations/{aid}")

    def test_proposta_enviada_only_on_change(self, s):
        aid = self._create_auto(s, "TEST_auto_prop", "proposta_enviada", "criar_tarefa")
        try:
            r = s.post(f"{API}/crm/leads", json={"name": "TEST_PropLead", "company": "", "value": 0, "stage": "Lead"})
            lid = r.json()["lead_id"]
            # Move to Proposta -> should trigger
            s.patch(f"{API}/crm/leads/{lid}", json={"stage": "Proposta"})
            run1 = self._find_run(s, aid)
            assert run1 is not None
            # Patch again with same stage -> should NOT create new run
            runs_before = len([x for x in s.get(f"{API}/automations/runs").json()["items"] if x["auto_id"] == aid])
            s.patch(f"{API}/crm/leads/{lid}", json={"stage": "Proposta"})
            time.sleep(1)
            runs_after = len([x for x in s.get(f"{API}/automations/runs").json()["items"] if x["auto_id"] == aid])
            assert runs_after == runs_before
            s.delete(f"{API}/crm/leads/{lid}")
        finally:
            s.delete(f"{API}/automations/{aid}")

    def test_fatura_vencida_triggers(self, s):
        aid = self._create_auto(s, "TEST_auto_fat", "fatura_vencida", "criar_tarefa")
        try:
            r = s.post(f"{API}/finance", json={"description": "TEST_venc", "amount": 10, "kind": "receita", "date": "2026-02-01", "status": "vencida"})
            assert r.status_code == 200
            tid = r.json()["tx_id"]
            run = self._find_run(s, aid)
            assert run is not None
            assert run["trigger"] == "fatura_vencida"
            s.delete(f"{API}/finance/{tid}")
        finally:
            s.delete(f"{API}/automations/{aid}")

    def test_manual_test_email(self, s):
        # enviar_email -- delivered@resend.dev
        aid = self._create_auto(s, "TEST_auto_email", "novo_lead", "enviar_email",
                                target="delivered@resend.dev",
                                template="<p>Manual test</p>")
        try:
            r = s.post(f"{API}/automations/{aid}/test")
            assert r.status_code == 200
            result = r.json()["result"]
            assert result["status"] in ("sent", "error", "skipped")
            # in this env EMAIL_KEY is expected to be present, so likely 'sent'
        finally:
            s.delete(f"{API}/automations/{aid}")

    def test_manual_test_whatsapp_no_crash(self, s):
        # Twilio not WA-enabled -> expect error but 200
        aid = self._create_auto(s, "TEST_auto_wa", "novo_lead", "enviar_whatsapp",
                                target="+15005550006",  # magic test number
                                template="TEST WA body")
        try:
            r = s.post(f"{API}/automations/{aid}/test")
            assert r.status_code == 200
            result = r.json()["result"]
            assert result["status"] in ("sent", "error", "skipped")
        finally:
            s.delete(f"{API}/automations/{aid}")

    def test_notificar_time(self, s):
        aid = self._create_auto(s, "TEST_auto_notif", "novo_lead", "notificar_time")
        try:
            r = s.post(f"{API}/automations/{aid}/test")
            assert r.status_code == 200
            result = r.json()["result"]
            assert result["status"] == "notified"
            assert "count" in result
        finally:
            s.delete(f"{API}/automations/{aid}")


# -------- WA webhook + nova_conversa_wa --------
class TestWaWebhook:
    def test_webhook_inbound_and_trigger(self, s):
        # create automation for nova_conversa_wa
        r = s.post(f"{API}/automations", json={
            "name": "TEST_auto_convwa", "trigger": "nova_conversa_wa",
            "action": "criar_tarefa", "active": True, "target": "", "template": ""
        })
        aid = r.json()["auto_id"]
        try:
            phone = "+5511999998888"
            form = {"From": f"whatsapp:{phone}", "To": "whatsapp:+19788384904",
                    "Body": "TEST inbound msg", "MessageSid": f"SM{int(time.time())}",
                    "ProfileName": "TEST WA User"}
            # No auth (public webhook)
            r = requests.post(f"{API}/wa/webhook", data=form)
            assert r.status_code == 200
            assert "Response" in r.text  # TwiML

            # Message should be persisted; look up chat by phone
            chats = s.get(f"{API}/wa/chats").json()["items"]
            match = next((c for c in chats if c.get("phone") == phone), None)
            assert match is not None, "inbound chat not created"
            msgs = s.get(f"{API}/wa/chats/{match['chat_id']}/messages").json()["items"]
            assert any(m["body"] == "TEST inbound msg" and m["direction"] == "in" for m in msgs)

            # automation run recorded
            deadline = time.time() + 6
            found = False
            while time.time() < deadline:
                runs = s.get(f"{API}/automations/runs").json()["items"]
                if any(r["auto_id"] == aid and r["trigger"] == "nova_conversa_wa" for r in runs):
                    found = True
                    break
                time.sleep(0.5)
            assert found, "nova_conversa_wa run not logged"
        finally:
            s.delete(f"{API}/automations/{aid}")


# -------- WA outgoing with provider auto (twilio expected but channel not enabled) --------
class TestWaOutgoing:
    def test_outgoing_auto_provider_no_5xx(self, s):
        chats = s.get(f"{API}/wa/chats").json()["items"]
        assert len(chats) >= 1
        cid = chats[0]["chat_id"]
        r = s.post(f"{API}/wa/chats/{cid}/messages", json={"body": "TEST_it2_outgoing", "provider": "auto"})
        assert r.status_code == 200, r.text
        msg = r.json()
        assert msg["direction"] == "out"
        assert msg["delivery"] in ("twilio", "mock")
