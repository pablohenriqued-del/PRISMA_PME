"""
Núcleo IA - Plataforma modular para PMEs
FastAPI backend
"""
from fastapi import (
    FastAPI, APIRouter, HTTPException, Request, Response, Depends,
    Cookie, UploadFile, File, Header, Form,
)
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import httpx
import requests as pyrequests
from pathlib import Path
from pydantic import BaseModel
from typing import List, Optional, Literal, Any, Dict
from datetime import datetime, timezone, timedelta

from twilio.rest import Client as TwilioClient
from twilio.twiml.messaging_response import MessagingResponse

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

# Twilio
TWILIO_SID = os.environ.get('TWILIO_ACCOUNT_SID')
TWILIO_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN')
TWILIO_FROM = os.environ.get('TWILIO_WHATSAPP_FROM', '')
twilio_client = TwilioClient(TWILIO_SID, TWILIO_TOKEN) if TWILIO_SID and TWILIO_TOKEN else None

# Email
EMAIL_KEY = os.environ.get('EMERGENT_EMAIL_KEY')
EMAIL_FROM_NAME = os.environ.get('EMAIL_FROM_NAME', 'Núcleo IA')
EMAIL_BASE_URL = "https://integrations.emergentagent.com"

# Object storage
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
APP_NAME = os.environ.get('APP_NAME', 'nucleo-ia')
_storage_key: Optional[str] = None

app = FastAPI(title="Prisma API")
api = APIRouter(prefix="/api")

# ----------------- Helpers -----------------
def now_utc() -> datetime:
    return datetime.now(timezone.utc)

def iso(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()

def gen_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"

def wa_num(number: str) -> str:
    if not number: return ""
    n = number.strip()
    if n.startswith("whatsapp:"):
        return n
    # keep only digits + leading +
    digits = "".join(ch for ch in n if ch.isdigit() or ch == "+")
    if not digits.startswith("+"):
        digits = "+" + digits
    return f"whatsapp:{digits}"

async def get_user_from_token(token: Optional[str]) -> Optional[dict]:
    if not token:
        return None
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        return None
    exp = session["expires_at"]
    if isinstance(exp, str):
        exp = datetime.fromisoformat(exp)
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp < now_utc():
        return None
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    return user

async def current_user(request: Request, session_token: Optional[str] = Cookie(default=None)) -> dict:
    token = session_token
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth.split(" ", 1)[1]
    user = await get_user_from_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Não autenticado")
    return user

# ----------------- Object Storage -----------------
def init_storage() -> Optional[str]:
    global _storage_key
    if _storage_key:
        return _storage_key
    if not EMERGENT_LLM_KEY:
        return None
    try:
        r = pyrequests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_LLM_KEY}, timeout=30)
        r.raise_for_status()
        _storage_key = r.json().get("storage_key")
        return _storage_key
    except Exception as e:
        logging.warning(f"storage init failed: {e}")
        return None

def storage_put(path: str, data: bytes, content_type: str) -> Dict[str, Any]:
    key = init_storage()
    if not key:
        raise HTTPException(status_code=500, detail="Storage indisponível")
    r = pyrequests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120,
    )
    r.raise_for_status()
    return r.json()

def storage_get(path: str) -> tuple[bytes, str]:
    key = init_storage()
    if not key:
        raise HTTPException(status_code=500, detail="Storage indisponível")
    r = pyrequests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    r.raise_for_status()
    return r.content, r.headers.get("Content-Type", "application/octet-stream")

# ----------------- Email helper (Resend via Emergent) -----------------
async def send_email(to_email: str, subject: str, html: str, reply_to: Optional[str] = None) -> Dict[str, Any]:
    if not EMAIL_KEY:
        return {"status": "skipped", "reason": "no_email_key"}
    payload = {
        "to": [to_email],
        "subject": subject,
        "html": html,
        "from_name": EMAIL_FROM_NAME,
    }
    if reply_to:
        payload["contact_email"] = reply_to
    try:
        async with httpx.AsyncClient(timeout=30) as http:
            r = await http.post(f"{EMAIL_BASE_URL}/api/v1/email/send",
                                headers={"X-Email-Key": EMAIL_KEY}, json=payload)
        r.raise_for_status()
        return {"status": "sent", "id": r.json().get("id")}
    except Exception as e:
        logging.warning(f"email send failed: {e}")
        return {"status": "error", "detail": str(e)[:200]}

# ----------------- WhatsApp helper (Twilio) -----------------
async def send_whatsapp(to_phone: str, body: str) -> Dict[str, Any]:
    if not twilio_client or not TWILIO_FROM:
        return {"status": "skipped", "reason": "twilio_not_configured"}
    try:
        msg = twilio_client.messages.create(from_=TWILIO_FROM, to=wa_num(to_phone), body=body)
        return {"status": "sent", "sid": msg.sid, "twilio_status": msg.status}
    except Exception as e:
        logging.warning(f"twilio send failed: {e}")
        return {"status": "error", "detail": str(e)[:200]}

# ----------------- Auth (Emergent Google) -----------------
class SessionRequest(BaseModel):
    session_id: str

@api.post("/auth/session")
async def create_session(payload: SessionRequest, response: Response):
    async with httpx.AsyncClient(timeout=15) as http:
        r = await http.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": payload.session_id},
        )
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Session inválida")
    data = r.json()
    email = data["email"]
    name = data.get("name") or email.split("@")[0]
    picture = data.get("picture", "")
    session_token = data["session_token"]

    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        # Check pending invite
        invite = await db.team_invites.find_one({"email": email, "status": "pending"}, {"_id": 0})
        user_id = gen_id("user")
        if invite:
            org_id = invite["org_id"]
            role = invite.get("role", "comercial")
            await db.team_invites.update_one(
                {"invite_id": invite["invite_id"]},
                {"$set": {"status": "accepted", "accepted_at": iso(now_utc()), "user_id": user_id}},
            )
        else:
            org_id = gen_id("org")
            role = "owner"
            await db.orgs.insert_one({"org_id": org_id, "name": f"Espaço de {name.split()[0]}", "created_at": iso(now_utc())})
        user = {
            "user_id": user_id, "email": email, "name": name, "picture": picture,
            "org_id": org_id, "role": role, "created_at": iso(now_utc()),
        }
        await db.users.insert_one(user)
        if role == "owner":
            await seed_demo_data(org_id)
    else:
        await db.users.update_one({"email": email}, {"$set": {"name": name, "picture": picture}})
        user["name"] = name
        user["picture"] = picture

    expires_at = now_utc() + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user["user_id"], "session_token": session_token,
        "expires_at": iso(expires_at), "created_at": iso(now_utc()),
    })
    response.set_cookie(
        key="session_token", value=session_token,
        httponly=True, secure=True, samesite="none",
        max_age=7 * 24 * 60 * 60, path="/",
    )
    return {"user": {k: user[k] for k in ("user_id", "email", "name", "picture", "org_id", "role")}}

@api.get("/auth/me")
async def me(user: dict = Depends(current_user)):
    return {"user": {k: user[k] for k in ("user_id", "email", "name", "picture", "org_id", "role")}}

@api.post("/auth/logout")
async def logout(response: Response, session_token: Optional[str] = Cookie(default=None)):
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    response.delete_cookie("session_token", path="/")
    return {"ok": True}

# ----------------- Seed demo -----------------
async def seed_demo_data(org_id: str):
    now = iso(now_utc())
    stages = ["Lead", "Contato Feito", "Proposta", "Negociação", "Ganho", "Perdido"]
    leads_sample = [
        ("Ana Souza", "Padaria Bella", "Lead", 4500, "ana@bella.com", "+5511912345678"),
        ("Carlos Lima", "Contabilidade CL", "Contato Feito", 12000, "cl@cl.com.br", "+5521998765432"),
        ("Beatriz Rocha", "Clínica Vida", "Proposta", 8900, "bea@vida.com", "+5531981112222"),
        ("Diego Alves", "Studio D", "Negociação", 21000, "diego@studiod.com", "+5541990001111"),
        ("Eduarda Ma", "TechFlow", "Ganho", 33000, "edu@techflow.io", ""),
    ]
    for name, company, stage, value, email, phone in leads_sample:
        await db.leads.insert_one({
            "lead_id": gen_id("lead"), "org_id": org_id,
            "name": name, "company": company, "email": email, "phone": phone,
            "stage": stage, "value": value, "notes": "", "created_at": now,
        })
    chats = [
        ("Ana Souza", "+5511912345678", "Vou verificar e te retorno hoje."),
        ("Carlos Lima", "+5521998765432", "Perfeito, aguardo a proposta."),
        ("Beatriz Rocha", "+5531981112222", "Preciso da segunda via da NF."),
    ]
    for name, phone, last in chats:
        chat_id = gen_id("chat")
        await db.wa_chats.insert_one({
            "chat_id": chat_id, "org_id": org_id, "name": name, "phone": phone,
            "last_message": last, "unread": 1, "updated_at": now, "provider": "mock",
        })
        await db.wa_messages.insert_many([
            {"msg_id": gen_id("msg"), "chat_id": chat_id, "org_id": org_id, "direction": "in", "body": "Oi! Tudo bem?", "created_at": now},
            {"msg_id": gen_id("msg"), "chat_id": chat_id, "org_id": org_id, "direction": "out", "body": "Tudo ótimo, como posso ajudar?", "created_at": now},
            {"msg_id": gen_id("msg"), "chat_id": chat_id, "org_id": org_id, "direction": "in", "body": last, "created_at": now},
        ])
    proj_id = gen_id("proj")
    await db.projects.insert_one({"project_id": proj_id, "org_id": org_id, "name": "Lançamento Q1", "description": "Sprint principal do trimestre", "created_at": now})
    for title, status in [
        ("Definir escopo do site", "concluido"),
        ("Design da landing", "em_progresso"),
        ("Configurar analytics", "a_fazer"),
        ("Escrever copy", "em_progresso"),
        ("Publicar campanha", "a_fazer"),
    ]:
        await db.tasks.insert_one({
            "task_id": gen_id("task"), "org_id": org_id, "project_id": proj_id,
            "title": title, "status": status, "assignee": "", "due_date": "", "created_at": now,
        })
    for desc, amt, kind, dt, status in [
        ("Assinatura mensal - Cliente A", 3500, "receita", "2026-02-01", "pago"),
        ("Assinatura mensal - Cliente B", 2800, "receita", "2026-02-03", "pago"),
        ("Consultoria - Projeto X", 12000, "receita", "2026-02-10", "pago"),
        ("Hospedagem servidor", 320, "despesa", "2026-02-05", "pago"),
        ("Ferramentas SaaS", 890, "despesa", "2026-02-07", "pago"),
        ("Fatura Cliente Y", 4200, "receita", "2026-02-08", "vencida"),
    ]:
        await db.finance.insert_one({
            "tx_id": gen_id("tx"), "org_id": org_id, "description": desc,
            "amount": amt, "kind": kind, "date": dt, "status": status, "created_at": now,
        })
    for title, kind, size in [
        ("Contrato-Cliente-A.pdf", "contrato", 245000),
        ("Proposta-TechFlow.pdf", "proposta", 180000),
        ("NF-2026-001.pdf", "fiscal", 90000),
    ]:
        await db.documents.insert_one({
            "doc_id": gen_id("doc"), "org_id": org_id, "title": title,
            "kind": kind, "size": size, "storage_path": "", "created_at": now,
        })
    for name, trigger, action, active, target in [
        ("Boas-vindas WhatsApp", "novo_lead", "enviar_whatsapp", True, ""),
        ("E-mail de cobrança", "fatura_vencida", "enviar_email", True, ""),
        ("Follow-up 3 dias", "proposta_enviada", "criar_tarefa", False, ""),
    ]:
        await db.automations.insert_one({
            "auto_id": gen_id("auto"), "org_id": org_id, "name": name,
            "trigger": trigger, "action": action, "active": active,
            "target": target, "template": "", "runs": 0, "created_at": now,
        })

# ----------------- Automation engine -----------------
async def run_automations(org_id: str, trigger: str, ctx: Dict[str, Any]):
    """Fire all active automations matching trigger. Log runs."""
    autos = await db.automations.find({"org_id": org_id, "trigger": trigger, "active": True}, {"_id": 0}).to_list(50)
    results = []
    for a in autos:
        result = await execute_action(org_id, a, ctx)
        await db.automation_runs.insert_one({
            "run_id": gen_id("run"), "auto_id": a["auto_id"], "org_id": org_id,
            "trigger": trigger, "action": a["action"], "context": ctx,
            "result": result, "created_at": iso(now_utc()),
        })
        await db.automations.update_one({"auto_id": a["auto_id"]}, {"$inc": {"runs": 1}})
        results.append(result)
    return results

async def execute_action(org_id: str, auto: Dict[str, Any], ctx: Dict[str, Any]) -> Dict[str, Any]:
    action = auto["action"]
    template = auto.get("template") or ""
    target = auto.get("target") or ""

    if action == "enviar_whatsapp":
        to = target or ctx.get("phone") or ""
        if not to:
            return {"status": "skipped", "reason": "no_phone"}
        body = template or f"Olá {ctx.get('name','')}! Recebemos seu contato — em breve retornaremos. — Prisma"
        r = await send_whatsapp(to, body)
        # Also record chat if org exists
        if r.get("status") == "sent":
            chat = await db.wa_chats.find_one({"org_id": org_id, "phone": to}, {"_id": 0})
            if not chat:
                cid = gen_id("chat")
                await db.wa_chats.insert_one({
                    "chat_id": cid, "org_id": org_id, "name": ctx.get("name") or to,
                    "phone": to, "last_message": body, "unread": 0,
                    "updated_at": iso(now_utc()), "provider": "twilio",
                })
                chat_id = cid
            else:
                chat_id = chat["chat_id"]
                await db.wa_chats.update_one({"chat_id": chat_id}, {"$set": {"last_message": body, "updated_at": iso(now_utc())}})
            await db.wa_messages.insert_one({
                "msg_id": gen_id("msg"), "chat_id": chat_id, "org_id": org_id,
                "direction": "out", "body": body, "created_at": iso(now_utc()),
                "twilio_sid": r.get("sid"),
            })
        return r

    if action == "enviar_email":
        to = target or ctx.get("email") or ""
        if not to:
            return {"status": "skipped", "reason": "no_email"}
        subject = ctx.get("subject") or "Aviso do Prisma"
        html = template or f"<div style='font-family:Arial,sans-serif;padding:16px'><h2>{subject}</h2><p>Olá {ctx.get('name','')}, este é um aviso automático.</p></div>"
        return await send_email(to, subject, html)

    if action == "criar_tarefa":
        proj = await db.projects.find_one({"org_id": org_id}, {"_id": 0})
        if not proj:
            return {"status": "skipped", "reason": "no_project"}
        title = template or f"Follow-up: {ctx.get('name','contato')}"
        await db.tasks.insert_one({
            "task_id": gen_id("task"), "org_id": org_id, "project_id": proj["project_id"],
            "title": title, "status": "a_fazer", "assignee": "", "due_date": "",
            "created_at": iso(now_utc()),
        })
        return {"status": "created", "title": title}

    if action == "notificar_time":
        # Send email to all members
        members = await db.users.find({"org_id": org_id}, {"_id": 0}).to_list(50)
        sent = 0
        for m in members:
            r = await send_email(m["email"], "Alerta da equipe — Prisma",
                                 f"<div style='font-family:Arial,sans-serif'><h3>Alerta automático</h3><p>{ctx.get('summary','Uma automação foi disparada.')}</p></div>")
            if r.get("status") == "sent":
                sent += 1
        return {"status": "notified", "count": sent}

    return {"status": "unknown_action"}

# ----------------- CRM -----------------
class LeadIn(BaseModel):
    name: str
    company: str = ""
    email: str = ""
    phone: str = ""
    stage: str = "Lead"
    value: float = 0
    notes: str = ""

@api.get("/crm/leads")
async def list_leads(user: dict = Depends(current_user)):
    items = await db.leads.find({"org_id": user["org_id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return {"items": items}

@api.post("/crm/leads")
async def create_lead(body: LeadIn, user: dict = Depends(current_user)):
    doc = body.model_dump()
    doc.update({"lead_id": gen_id("lead"), "org_id": user["org_id"], "created_at": iso(now_utc())})
    await db.leads.insert_one(doc)
    doc.pop("_id", None)
    # Fire novo_lead automations
    await run_automations(user["org_id"], "novo_lead", {
        "name": doc["name"], "email": doc["email"], "phone": doc["phone"],
        "company": doc["company"], "value": doc["value"], "lead_id": doc["lead_id"],
    })
    return doc

class LeadUpdate(BaseModel):
    name: Optional[str] = None
    company: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    value: Optional[float] = None
    stage: Optional[str] = None
    notes: Optional[str] = None

@api.patch("/crm/leads/{lead_id}")
async def update_lead(lead_id: str, body: LeadUpdate, user: dict = Depends(current_user)):
    upd = {k: v for k, v in body.model_dump().items() if v is not None}
    if not upd:
        return {"ok": True}
    lead = await db.leads.find_one({"lead_id": lead_id, "org_id": user["org_id"]}, {"_id": 0})
    await db.leads.update_one({"lead_id": lead_id, "org_id": user["org_id"]}, {"$set": upd})
    # Trigger proposta_enviada if stage moved to Proposta
    if lead and body.stage == "Proposta" and lead.get("stage") != "Proposta":
        await run_automations(user["org_id"], "proposta_enviada", {
            "name": lead["name"], "email": lead.get("email",""), "phone": lead.get("phone",""),
            "company": lead.get("company",""), "lead_id": lead_id,
        })
    return {"ok": True}

@api.delete("/crm/leads/{lead_id}")
async def delete_lead(lead_id: str, user: dict = Depends(current_user)):
    await db.leads.delete_one({"lead_id": lead_id, "org_id": user["org_id"]})
    return {"ok": True}

# ----------------- WhatsApp -----------------
@api.get("/wa/chats")
async def list_chats(user: dict = Depends(current_user)):
    items = await db.wa_chats.find({"org_id": user["org_id"]}, {"_id": 0}).sort("updated_at", -1).to_list(200)
    return {"items": items}

@api.get("/wa/chats/{chat_id}/messages")
async def chat_messages(chat_id: str, user: dict = Depends(current_user)):
    items = await db.wa_messages.find({"chat_id": chat_id, "org_id": user["org_id"]}, {"_id": 0}).sort("created_at", 1).to_list(500)
    return {"items": items}

class MsgIn(BaseModel):
    body: str
    provider: Optional[str] = "auto"   # auto | mock | twilio

@api.post("/wa/chats/{chat_id}/messages")
async def send_msg(chat_id: str, body: MsgIn, user: dict = Depends(current_user)):
    chat = await db.wa_chats.find_one({"chat_id": chat_id, "org_id": user["org_id"]}, {"_id": 0})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat não encontrado")
    now = iso(now_utc())
    twilio_sid = None
    delivery = "mock"
    if body.provider in ("twilio", "auto") and twilio_client and TWILIO_FROM and chat.get("phone"):
        r = await send_whatsapp(chat["phone"], body.body)
        if r.get("status") == "sent":
            twilio_sid = r.get("sid")
            delivery = "twilio"
    msg = {
        "msg_id": gen_id("msg"), "chat_id": chat_id, "org_id": user["org_id"],
        "direction": "out", "body": body.body, "created_at": now,
        "twilio_sid": twilio_sid, "delivery": delivery,
    }
    await db.wa_messages.insert_one(msg)
    await db.wa_chats.update_one(
        {"chat_id": chat_id, "org_id": user["org_id"]},
        {"$set": {"last_message": body.body, "updated_at": now, "unread": 0}},
    )
    msg.pop("_id", None)
    return msg

class NewChat(BaseModel):
    name: str
    phone: str

@api.post("/wa/chats")
async def create_chat(body: NewChat, user: dict = Depends(current_user)):
    doc = {
        "chat_id": gen_id("chat"), "org_id": user["org_id"],
        "name": body.name, "phone": body.phone, "last_message": "",
        "unread": 0, "updated_at": iso(now_utc()), "provider": "twilio" if twilio_client else "mock",
    }
    await db.wa_chats.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.get("/wa/config")
async def wa_config(user: dict = Depends(current_user)):
    return {
        "twilio_enabled": bool(twilio_client and TWILIO_FROM),
        "twilio_from": TWILIO_FROM,
    }

# Twilio inbound webhook (public — no auth). Validates by matching a known org via phone.
@api.post("/wa/webhook")
async def wa_webhook(request: Request):
    form = dict(await request.form())
    from_ = (form.get("From") or "").replace("whatsapp:", "")
    to_ = (form.get("To") or "").replace("whatsapp:", "")
    body_txt = form.get("Body", "")
    now = iso(now_utc())
    # match chat by phone
    chat = await db.wa_chats.find_one({"phone": from_}, {"_id": 0})
    if not chat:
        # attach to first org that matches TWILIO_FROM number (simplification)
        default_org = await db.orgs.find_one({}, {"_id": 0})
        if default_org:
            cid = gen_id("chat")
            await db.wa_chats.insert_one({
                "chat_id": cid, "org_id": default_org["org_id"],
                "name": form.get("ProfileName") or from_, "phone": from_,
                "last_message": body_txt, "unread": 1, "updated_at": now, "provider": "twilio",
            })
            chat = await db.wa_chats.find_one({"chat_id": cid}, {"_id": 0})
    if chat:
        await db.wa_messages.insert_one({
            "msg_id": gen_id("msg"), "chat_id": chat["chat_id"], "org_id": chat["org_id"],
            "direction": "in", "body": body_txt, "created_at": now, "twilio_sid": form.get("MessageSid"),
        })
        await db.wa_chats.update_one({"chat_id": chat["chat_id"]}, {"$set": {"last_message": body_txt, "updated_at": now, "unread": (chat.get("unread") or 0) + 1}})
        await run_automations(chat["org_id"], "nova_conversa_wa", {"name": chat["name"], "phone": from_, "body": body_txt})
    resp = MessagingResponse()
    return Response(content=str(resp), media_type="application/xml")

# ----------------- Projetos -----------------
@api.get("/projects")
async def list_projects(user: dict = Depends(current_user)):
    items = await db.projects.find({"org_id": user["org_id"]}, {"_id": 0}).to_list(200)
    return {"items": items}

class ProjectIn(BaseModel):
    name: str
    description: str = ""

@api.post("/projects")
async def create_project(body: ProjectIn, user: dict = Depends(current_user)):
    doc = body.model_dump()
    doc.update({"project_id": gen_id("proj"), "org_id": user["org_id"], "created_at": iso(now_utc())})
    await db.projects.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.get("/projects/{project_id}/tasks")
async def project_tasks(project_id: str, user: dict = Depends(current_user)):
    items = await db.tasks.find({"project_id": project_id, "org_id": user["org_id"]}, {"_id": 0}).to_list(500)
    return {"items": items}

class TaskIn(BaseModel):
    title: str
    status: str = "a_fazer"
    assignee: str = ""
    due_date: str = ""

@api.post("/projects/{project_id}/tasks")
async def create_task(project_id: str, body: TaskIn, user: dict = Depends(current_user)):
    doc = body.model_dump()
    doc.update({"task_id": gen_id("task"), "org_id": user["org_id"], "project_id": project_id, "created_at": iso(now_utc())})
    await db.tasks.insert_one(doc)
    doc.pop("_id", None)
    return doc

class TaskStatus(BaseModel):
    status: str

@api.patch("/tasks/{task_id}")
async def update_task(task_id: str, body: TaskStatus, user: dict = Depends(current_user)):
    await db.tasks.update_one({"task_id": task_id, "org_id": user["org_id"]}, {"$set": {"status": body.status}})
    return {"ok": True}

# ----------------- Financeiro -----------------
class TxIn(BaseModel):
    description: str
    amount: float
    kind: Literal["receita", "despesa"]
    date: str
    status: str = "pago"

@api.get("/finance")
async def list_tx(user: dict = Depends(current_user)):
    items = await db.finance.find({"org_id": user["org_id"]}, {"_id": 0}).sort("date", -1).to_list(500)
    receita = sum(t["amount"] for t in items if t["kind"] == "receita")
    despesa = sum(t["amount"] for t in items if t["kind"] == "despesa")
    return {"items": items, "receita": receita, "despesa": despesa, "saldo": receita - despesa}

@api.post("/finance")
async def create_tx(body: TxIn, user: dict = Depends(current_user)):
    doc = body.model_dump()
    doc.update({"tx_id": gen_id("tx"), "org_id": user["org_id"], "created_at": iso(now_utc())})
    await db.finance.insert_one(doc)
    doc.pop("_id", None)
    if doc["status"] == "vencida":
        await run_automations(user["org_id"], "fatura_vencida", {
            "name": doc["description"], "subject": f"Fatura vencida: {doc['description']}",
        })
    return doc

@api.delete("/finance/{tx_id}")
async def delete_tx(tx_id: str, user: dict = Depends(current_user)):
    await db.finance.delete_one({"tx_id": tx_id, "org_id": user["org_id"]})
    return {"ok": True}

# ----------------- Documentos (with upload) -----------------
@api.get("/documents")
async def list_docs(user: dict = Depends(current_user)):
    items = await db.documents.find({"org_id": user["org_id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return {"items": items}

class DocIn(BaseModel):
    title: str
    kind: str = "geral"
    size: int = 0

@api.post("/documents")
async def create_doc(body: DocIn, user: dict = Depends(current_user)):
    doc = body.model_dump()
    doc.update({"doc_id": gen_id("doc"), "org_id": user["org_id"], "storage_path": "", "created_at": iso(now_utc())})
    await db.documents.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.post("/documents/upload")
async def upload_doc(file: UploadFile = File(...), kind: str = Form("geral"), user: dict = Depends(current_user)):
    data = await file.read()
    fname = file.filename or "arquivo"
    ext = fname.rsplit(".", 1)[-1].lower() if "." in fname else "bin"
    path = f"{APP_NAME}/{user['org_id']}/{uuid.uuid4().hex}.{ext}"
    try:
        result = storage_put(path, data, file.content_type or "application/octet-stream")
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload falhou: {e}")
    doc = {
        "doc_id": gen_id("doc"), "org_id": user["org_id"], "title": fname,
        "kind": kind, "size": result.get("size", len(data)),
        "storage_path": result.get("path", path), "content_type": file.content_type or "",
        "created_at": iso(now_utc()),
    }
    await db.documents.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.get("/documents/{doc_id}/download")
async def download_doc(doc_id: str, request: Request, session_token: Optional[str] = Cookie(default=None), auth: Optional[str] = None):
    token = session_token
    if not token:
        a = request.headers.get("Authorization", "")
        if a.startswith("Bearer "):
            token = a.split(" ", 1)[1]
    if not token and auth:
        token = auth
    user = await get_user_from_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Não autenticado")
    doc = await db.documents.find_one({"doc_id": doc_id, "org_id": user["org_id"]}, {"_id": 0})
    if not doc or not doc.get("storage_path"):
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")
    data, ct = storage_get(doc["storage_path"])
    return Response(content=data, media_type=doc.get("content_type") or ct,
                    headers={"Content-Disposition": f'inline; filename="{doc["title"]}"'})

@api.delete("/documents/{doc_id}")
async def delete_doc(doc_id: str, user: dict = Depends(current_user)):
    await db.documents.delete_one({"doc_id": doc_id, "org_id": user["org_id"]})
    return {"ok": True}

# ----------------- Automações -----------------
class AutoIn(BaseModel):
    name: str
    trigger: str
    action: str
    active: bool = True
    target: str = ""
    template: str = ""

@api.get("/automations")
async def list_autos(user: dict = Depends(current_user)):
    items = await db.automations.find({"org_id": user["org_id"]}, {"_id": 0}).to_list(200)
    return {"items": items}

@api.post("/automations")
async def create_auto(body: AutoIn, user: dict = Depends(current_user)):
    doc = body.model_dump()
    doc.update({"auto_id": gen_id("auto"), "org_id": user["org_id"], "runs": 0, "created_at": iso(now_utc())})
    await db.automations.insert_one(doc)
    doc.pop("_id", None)
    return doc

class AutoPatch(BaseModel):
    active: Optional[bool] = None
    target: Optional[str] = None
    template: Optional[str] = None

@api.patch("/automations/{auto_id}")
async def patch_auto(auto_id: str, body: AutoPatch, user: dict = Depends(current_user)):
    upd = {k: v for k, v in body.model_dump().items() if v is not None}
    if upd:
        await db.automations.update_one({"auto_id": auto_id, "org_id": user["org_id"]}, {"$set": upd})
    return {"ok": True}

@api.delete("/automations/{auto_id}")
async def delete_auto(auto_id: str, user: dict = Depends(current_user)):
    await db.automations.delete_one({"auto_id": auto_id, "org_id": user["org_id"]})
    await db.automation_runs.delete_many({"auto_id": auto_id, "org_id": user["org_id"]})
    return {"ok": True}

@api.post("/automations/{auto_id}/test")
async def test_auto(auto_id: str, user: dict = Depends(current_user)):
    auto = await db.automations.find_one({"auto_id": auto_id, "org_id": user["org_id"]}, {"_id": 0})
    if not auto:
        raise HTTPException(status_code=404, detail="Automação não encontrada")
    ctx = {
        "name": "Contato de Teste", "email": user["email"],
        "phone": auto.get("target") or "",
        "summary": f"Teste manual de {auto['name']}",
    }
    result = await execute_action(user["org_id"], auto, ctx)
    await db.automation_runs.insert_one({
        "run_id": gen_id("run"), "auto_id": auto_id, "org_id": user["org_id"],
        "trigger": "test_manual", "action": auto["action"], "context": ctx,
        "result": result, "created_at": iso(now_utc()),
    })
    await db.automations.update_one({"auto_id": auto_id}, {"$inc": {"runs": 1}})
    return {"result": result}

@api.get("/automations/runs")
async def list_runs(user: dict = Depends(current_user)):
    items = await db.automation_runs.find({"org_id": user["org_id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"items": items}

# ----------------- Team -----------------
class InviteIn(BaseModel):
    email: str
    role: Literal["owner", "admin", "comercial", "financeiro"] = "comercial"

@api.get("/team/members")
async def team_members(user: dict = Depends(current_user)):
    members = await db.users.find({"org_id": user["org_id"]}, {"_id": 0}).to_list(200)
    invites = await db.team_invites.find({"org_id": user["org_id"], "status": "pending"}, {"_id": 0}).to_list(200)
    return {"members": members, "invites": invites}

@api.post("/team/invite")
async def team_invite(body: InviteIn, user: dict = Depends(current_user)):
    if user.get("role") not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Sem permissão para convidar")
    existing_user = await db.users.find_one({"email": body.email, "org_id": user["org_id"]}, {"_id": 0})
    if existing_user:
        raise HTTPException(status_code=400, detail="Usuário já é membro")
    existing_inv = await db.team_invites.find_one({"email": body.email, "org_id": user["org_id"], "status": "pending"}, {"_id": 0})
    if existing_inv:
        return {"ok": True, "invite": existing_inv, "already": True}
    inv = {
        "invite_id": gen_id("inv"), "org_id": user["org_id"], "email": body.email,
        "role": body.role, "status": "pending", "invited_by": user["user_id"],
        "created_at": iso(now_utc()),
    }
    await db.team_invites.insert_one(inv)
    # Send invite email
    org = await db.orgs.find_one({"org_id": user["org_id"]}, {"_id": 0})
    org_name = org["name"] if org else "sua equipe"
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;border:1px solid #eee;border-radius:8px">
      <h2 style="margin:0 0 8px 0">Você foi convidado para {org_name}</h2>
      <p>{user['name']} convidou você para colaborar no Prisma como <b>{body.role}</b>.</p>
      <p>Acesse a plataforma e faça login com este e-mail para entrar:</p>
      <p><a href="https://pme-all-in-one.preview.emergentagent.com/login" style="display:inline-block;background:#0A0A14;color:#F5F1EA;text-decoration:none;padding:12px 20px;border-radius:6px">Entrar no Prisma</a></p>
      <p style="color:#64748b;font-size:12px">Se você não esperava este convite, ignore este e-mail.</p>
    </div>
    """
    await send_email(body.email, f"Convite para {org_name} • Prisma", html)
    inv.pop("_id", None)
    return {"ok": True, "invite": inv}

@api.delete("/team/invite/{invite_id}")
async def cancel_invite(invite_id: str, user: dict = Depends(current_user)):
    if user.get("role") not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Sem permissão")
    await db.team_invites.delete_one({"invite_id": invite_id, "org_id": user["org_id"]})
    return {"ok": True}

class RoleUpdate(BaseModel):
    role: Literal["owner", "admin", "comercial", "financeiro"]

@api.patch("/team/members/{user_id}")
async def change_role(user_id: str, body: RoleUpdate, user: dict = Depends(current_user)):
    if user.get("role") != "owner":
        raise HTTPException(status_code=403, detail="Apenas owner altera papéis")
    await db.users.update_one({"user_id": user_id, "org_id": user["org_id"]}, {"$set": {"role": body.role}})
    return {"ok": True}

# ----------------- Dashboards -----------------
@api.get("/dashboard/overview")
async def dashboard(user: dict = Depends(current_user)):
    org = user["org_id"]
    leads = await db.leads.count_documents({"org_id": org})
    ganhos = await db.leads.count_documents({"org_id": org, "stage": "Ganho"})
    negociando = await db.leads.count_documents({"org_id": org, "stage": "Negociação"})
    tasks_open = await db.tasks.count_documents({"org_id": org, "status": {"$ne": "concluido"}})
    tasks_done = await db.tasks.count_documents({"org_id": org, "status": "concluido"})
    chats = await db.wa_chats.count_documents({"org_id": org})
    docs = await db.documents.count_documents({"org_id": org})
    autos_active = await db.automations.count_documents({"org_id": org, "active": True})
    fin_items = await db.finance.find({"org_id": org}, {"_id": 0}).to_list(1000)
    receita = sum(t["amount"] for t in fin_items if t["kind"] == "receita")
    despesa = sum(t["amount"] for t in fin_items if t["kind"] == "despesa")
    pipeline = {}
    async for lead in db.leads.find({"org_id": org}, {"_id": 0}):
        pipeline[lead["stage"]] = pipeline.get(lead["stage"], 0) + 1
    by_date = {}
    for t in fin_items:
        d = t["date"]
        if t["kind"] == "receita":
            by_date[d] = by_date.get(d, 0) + t["amount"]
    revenue_series = [{"date": d, "value": v} for d, v in sorted(by_date.items())]
    return {
        "kpis": {
            "leads": leads, "ganhos": ganhos, "negociando": negociando,
            "tasks_open": tasks_open, "tasks_done": tasks_done,
            "chats": chats, "docs": docs, "autos_active": autos_active,
            "receita": receita, "despesa": despesa, "saldo": receita - despesa,
        },
        "pipeline": pipeline, "revenue_series": revenue_series,
    }

# ----------------- IA Copilot -----------------
class CopilotIn(BaseModel):
    message: str
    session_id: Optional[str] = None
    context: Optional[str] = None

SYSTEM_PROMPT = """Você é o Copiloto Prisma, assistente da plataforma modular para PMEs brasileiras.
Você entende de CRM, WhatsApp, Projetos, Financeiro, Documentos, Automações e Dashboards.
Responda em português (Brasil), de forma clara, objetiva, prática e amigável.
Sempre que possível ofereça próximos passos acionáveis. Use bullets curtos quando útil."""

@api.post("/copilot/chat")
async def copilot_chat(body: CopilotIn, user: dict = Depends(current_user)):
    from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone
    session_id = body.session_id or gen_id("cop")
    ctx = f"\nMódulo atual do usuário: {body.context}." if body.context else ""
    await db.copilot_messages.insert_one({
        "msg_id": gen_id("cm"), "user_id": user["user_id"], "org_id": user["org_id"],
        "session_id": session_id, "role": "user", "content": body.message,
        "created_at": iso(now_utc()),
    })
    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=session_id,
                   system_message=SYSTEM_PROMPT + ctx).with_model("anthropic", "claude-sonnet-4-6")
    async def event_gen():
        full = []
        try:
            async for ev in chat.stream_message(UserMessage(text=body.message)):
                if isinstance(ev, TextDelta):
                    full.append(ev.content)
                    yield f"data: {ev.content}\n\n"
                elif isinstance(ev, StreamDone):
                    break
        except Exception as e:
            yield f"data: [erro: {str(e)[:120]}]\n\n"
        await db.copilot_messages.insert_one({
            "msg_id": gen_id("cm"), "user_id": user["user_id"], "org_id": user["org_id"],
            "session_id": session_id, "role": "assistant", "content": "".join(full),
            "created_at": iso(now_utc()),
        })
        yield "event: done\ndata: [DONE]\n\n"
    return StreamingResponse(event_gen(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"})

@api.get("/copilot/history")
async def copilot_history(session_id: str, user: dict = Depends(current_user)):
    items = await db.copilot_messages.find({"user_id": user["user_id"], "session_id": session_id}, {"_id": 0}).sort("created_at", 1).to_list(500)
    return {"items": items}

# ----------------- Startup / health -----------------
@app.on_event("startup")
async def startup():
    try:
        init_storage()
    except Exception as e:
        logging.warning(f"storage startup: {e}")

@api.get("/")
async def root():
    return {"ok": True, "service": "Prisma", "twilio": bool(twilio_client), "email": bool(EMAIL_KEY)}

app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db():
    client.close()
