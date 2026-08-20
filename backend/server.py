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
import stripe
import hashlib
import secrets
import io as _io

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

# Stripe (Flow A — Emergent claimable sandbox)
stripe.api_key = os.environ.get('STRIPE_SECRET_KEY') or 'sk_test_emergent'
STRIPE_WEBHOOK_SECRET = os.environ.get('STRIPE_WEBHOOK_SECRET', '')
STRIPE_PUBLISHABLE_KEY = os.environ.get('STRIPE_PUBLISHABLE_KEY', '')

# Founder deal cap
FOUNDER_CAP = int(os.environ.get('FOUNDER_CAP', '100'))

# Catalog for Prisma (BRL). Paid plans are subscriptions.
# Founder Deal and Ordem de Serviço are one-time payments and support PIX + card.
STRIPE_CATALOG = [
    {
        "emergent_product_id": "prisma_starter", "name": "Prisma Starter",
        "tax_code": "txcd_10103001",
        "prices": [
            {"lookup_key": "prisma_starter_monthly", "amount": 29700, "currency": "brl", "interval": "month"},
            {"lookup_key": "prisma_starter_yearly",  "amount": 297000, "currency": "brl", "interval": "year"},
        ],
    },
    {
        "emergent_product_id": "prisma_growth", "name": "Prisma Growth",
        "tax_code": "txcd_10103001",
        "prices": [
            {"lookup_key": "prisma_growth_monthly", "amount": 89700, "currency": "brl", "interval": "month"},
            {"lookup_key": "prisma_growth_yearly",  "amount": 897000, "currency": "brl", "interval": "year"},
        ],
    },
    {
        "emergent_product_id": "prisma_business", "name": "Prisma Business",
        "tax_code": "txcd_10103001",
        "prices": [
            {"lookup_key": "prisma_business_monthly", "amount": 299700, "currency": "brl", "interval": "month"},
            {"lookup_key": "prisma_business_yearly",  "amount": 2997000, "currency": "brl", "interval": "year"},
        ],
    },
    {
        "emergent_product_id": "prisma_founder_deal",
        "name": "Prisma Founder Deal (3 anos de Growth)",
        "tax_code": "txcd_10103001",
        "prices": [
            {"lookup_key": "prisma_founder_deal", "amount": 499700, "currency": "brl"},
        ],
    },
]

def ensure_stripe_catalog():
    try:
        for entry in STRIPE_CATALOG:
            product = None
            for p in stripe.Product.list(active=True, limit=100).auto_paging_iter():
                if p.to_dict().get("metadata", {}).get("emergent_product_id") == entry["emergent_product_id"]:
                    product = p
                    break
            if not product:
                product = stripe.Product.create(
                    name=entry["name"], tax_code=entry.get("tax_code"),
                    metadata={"managed_by": "emergent", "emergent_product_id": entry["emergent_product_id"]},
                )
            for pp in entry["prices"]:
                existing = stripe.Price.list(lookup_keys=[pp["lookup_key"]], active=True, limit=1).data
                if existing and (existing[0].unit_amount != pp["amount"] or existing[0].currency != pp["currency"]):
                    stripe.Price.modify(existing[0].id, active=False)
                    existing = []
                if not existing:
                    kwargs = dict(
                        product=product.id, unit_amount=pp["amount"], currency=pp["currency"],
                        lookup_key=pp["lookup_key"], transfer_lookup_key=True,
                    )
                    if pp.get("interval"):
                        kwargs["recurring"] = {"interval": pp["interval"]}
                    stripe.Price.create(**kwargs)
        logging.info("Stripe catalog OK")
    except Exception as e:
        logging.warning(f"stripe catalog setup failed: {e}")


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
        raw = str(e)
        code = None
        for c in ("63007", "63016", "63018", "21211", "21606", "21610"):
            if c in raw:
                code = c
                break
        # Friendly hints for common cases
        sandbox_join = os.environ.get("TWILIO_SANDBOX_JOIN", "join <sua-palavra>")
        sandbox_num = TWILIO_FROM.replace("whatsapp:", "")
        hint = None
        if code == "63007":
            hint = (
                f"Número remetente {TWILIO_FROM} não está habilitado como remetente WhatsApp na sua conta Twilio. "
                f"Use o Sandbox oficial ({sandbox_num}) ou aprove um Sender no Console Twilio."
            )
        elif code in ("63016", "63018"):
            hint = (
                f"O destinatário ainda não entrou no Sandbox do Twilio. "
                f"Peça ao cliente para enviar '{sandbox_join}' via WhatsApp para {sandbox_num} antes de receber mensagens."
            )
        elif code in ("21211", "21606", "21610"):
            hint = "Número do destinatário inválido ou bloqueado. Confirme o formato +55DDDNNNNNNNN."
        logging.warning(f"twilio send failed [{code or 'unknown'}]: {raw[:180]}")
        return {"status": "error", "code": code, "detail": raw[:200], "hint": hint}

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
    custom_fields: List[Dict[str, Any]] = []

@api.post("/projects/{project_id}/tasks")
async def create_task(project_id: str, body: TaskIn, user: dict = Depends(current_user)):
    doc = body.model_dump()
    doc.update({"task_id": gen_id("task"), "org_id": user["org_id"], "project_id": project_id, "created_at": iso(now_utc())})
    await db.tasks.insert_one(doc)
    doc.pop("_id", None)
    return doc

class TaskPatch(BaseModel):
    status: Optional[str] = None
    title: Optional[str] = None
    assignee: Optional[str] = None
    due_date: Optional[str] = None
    custom_fields: Optional[List[Dict[str, Any]]] = None

@api.patch("/tasks/{task_id}")
async def update_task(task_id: str, body: TaskPatch, user: dict = Depends(current_user)):
    upd = {k: v for k, v in body.model_dump().items() if v is not None}
    if "custom_fields" in upd:
        upd["custom_fields"] = [dict(c) for c in upd["custom_fields"]]
    if upd:
        await db.tasks.update_one({"task_id": task_id, "org_id": user["org_id"]}, {"$set": upd})
    return {"ok": True}

# ----------------- Task time tracking -----------------
@api.post("/tasks/{task_id}/time/start")
async def task_time_start(task_id: str, user: dict = Depends(current_user)):
    task = await db.tasks.find_one({"task_id": task_id, "org_id": user["org_id"]}, {"_id": 0})
    if not task: raise HTTPException(404, "Task não encontrada")
    logs = task.get("time_logs") or []
    if any(l for l in logs if not l.get("end_at")):
        return {"ok": True, "already_running": True}
    log = {"log_id": gen_id("tl"), "start_at": iso(now_utc()), "end_at": None, "seconds": 0, "user_id": user["user_id"]}
    await db.tasks.update_one({"task_id": task_id, "org_id": user["org_id"]}, {"$push": {"time_logs": log}})
    return {"ok": True, "log": log}

@api.post("/tasks/{task_id}/time/stop")
async def task_time_stop(task_id: str, user: dict = Depends(current_user)):
    task = await db.tasks.find_one({"task_id": task_id, "org_id": user["org_id"]}, {"_id": 0})
    if not task: raise HTTPException(404, "Task não encontrada")
    logs = task.get("time_logs") or []
    active = [i for i, l in enumerate(logs) if not l.get("end_at")]
    if not active: return {"ok": True, "no_active": True}
    now = now_utc()
    total = task.get("total_seconds", 0) or 0
    for i in active:
        try: start = datetime.fromisoformat(logs[i]["start_at"].replace("Z","+00:00"))
        except Exception: start = now
        secs = max(0, int((now - start).total_seconds()))
        logs[i]["end_at"] = iso(now)
        logs[i]["seconds"] = secs
        total += secs
    await db.tasks.update_one({"task_id": task_id, "org_id": user["org_id"]},
                              {"$set": {"time_logs": logs, "total_seconds": total}})
    return {"ok": True, "total_seconds": total}

class TimeLogIn(BaseModel):
    seconds: int
    note: str = ""

@api.post("/tasks/{task_id}/time/log")
async def task_time_manual(task_id: str, body: TimeLogIn, user: dict = Depends(current_user)):
    task = await db.tasks.find_one({"task_id": task_id, "org_id": user["org_id"]}, {"_id": 0})
    if not task: raise HTTPException(404, "Task não encontrada")
    log = {"log_id": gen_id("tl"), "start_at": iso(now_utc()), "end_at": iso(now_utc()),
           "seconds": max(0, int(body.seconds)), "note": body.note, "user_id": user["user_id"], "manual": True}
    total = (task.get("total_seconds", 0) or 0) + log["seconds"]
    await db.tasks.update_one({"task_id": task_id, "org_id": user["org_id"]},
                              {"$push": {"time_logs": log}, "$set": {"total_seconds": total}})
    return {"ok": True, "log": log, "total_seconds": total}

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

# ----------------- Ordem de Serviço -----------------
OS_STATUSES = ["orcamento", "aprovada", "em_execucao", "concluida", "cancelada"]

class OSItem(BaseModel):
    description: str
    quantity: float = 1
    unit_price: float = 0

class OSCustomField(BaseModel):
    name: str
    type: Literal["text", "number", "date", "select", "money"] = "text"
    value: Any = None
    options: Optional[List[str]] = None

class OSRecurrence(BaseModel):
    enabled: bool = False
    interval: Literal["weekly", "monthly", "quarterly"] = "monthly"
    next_run_at: Optional[str] = None

class OSIn(BaseModel):
    title: str
    client_name: str
    client_email: str = ""
    client_phone: str = ""
    lead_id: Optional[str] = None
    project_id: Optional[str] = None
    items: List[OSItem] = []
    notes: str = ""
    due_date: str = ""
    status: str = "orcamento"
    custom_fields: List[OSCustomField] = []
    recurrence: Optional[OSRecurrence] = None
    template_id: Optional[str] = None

def _os_total(items: List[Dict[str, Any]]) -> float:
    return round(sum((it.get("quantity", 1) or 1) * (it.get("unit_price", 0) or 0) for it in items), 2)

def _next_recurrence_date(interval: str, base: Optional[datetime] = None) -> str:
    base = base or now_utc()
    if interval == "weekly": delta = timedelta(days=7)
    elif interval == "quarterly": delta = timedelta(days=90)
    else: delta = timedelta(days=30)
    return iso(base + delta)

def _os_public_url(token: str, origin: Optional[str] = None) -> str:
    return f"{(origin or 'https://pme-all-in-one.preview.emergentagent.com').rstrip('/')}/os/publica/{token}"

async def _maybe_generate_recurrences(org_id: str):
    """Lazy scheduler: para cada OS com recurrence.enabled e next_run_at <= now, gera nova OS e reagenda."""
    now = now_utc()
    async for parent in db.ordem_servico.find({"org_id": org_id, "recurrence.enabled": True}, {"_id": 0}):
        rec = parent.get("recurrence") or {}
        nra = rec.get("next_run_at")
        try: due = datetime.fromisoformat(nra.replace("Z", "+00:00")) if nra else None
        except Exception: due = None
        if not due or due > now: continue
        new_os = {**{k: parent[k] for k in ("client_name","client_email","client_phone","lead_id","items","notes","custom_fields") if k in parent},
                  "title": parent["title"], "status": "orcamento",
                  "os_id": gen_id("os"), "org_id": org_id, "created_at": iso(now),
                  "total": _os_total(parent.get("items", [])),
                  "public_token": secrets.token_urlsafe(24),
                  "recurrence": None, "parent_recurrence_id": parent["os_id"],
                  "created_by": "recurrence"}
        await db.ordem_servico.insert_one(new_os)
        rec["next_run_at"] = _next_recurrence_date(rec.get("interval", "monthly"), due)
        await db.ordem_servico.update_one({"os_id": parent["os_id"]}, {"$set": {"recurrence": rec}})

@api.get("/os")
async def list_os(user: dict = Depends(current_user)):
    await _maybe_generate_recurrences(user["org_id"])
    items = await db.ordem_servico.find({"org_id": user["org_id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return {"items": items}

@api.post("/os")
async def create_os(body: OSIn, user: dict = Depends(current_user)):
    doc = body.model_dump()
    doc["items"] = [dict(i) for i in doc["items"]]
    doc["custom_fields"] = [dict(c) for c in doc.get("custom_fields", [])]
    rec = doc.get("recurrence")
    if rec and rec.get("enabled") and not rec.get("next_run_at"):
        rec["next_run_at"] = _next_recurrence_date(rec.get("interval", "monthly"))
    doc.update({
        "os_id": gen_id("os"),
        "org_id": user["org_id"],
        "created_at": iso(now_utc()),
        "total": _os_total(doc["items"]),
        "created_by": user["user_id"],
        "public_token": secrets.token_urlsafe(24),
    })
    await db.ordem_servico.insert_one(doc)
    doc.pop("_id", None)
    return doc

class OSPatch(BaseModel):
    title: Optional[str] = None
    client_name: Optional[str] = None
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    lead_id: Optional[str] = None
    project_id: Optional[str] = None
    items: Optional[List[OSItem]] = None
    notes: Optional[str] = None
    due_date: Optional[str] = None
    status: Optional[str] = None
    custom_fields: Optional[List[OSCustomField]] = None
    recurrence: Optional[OSRecurrence] = None

@api.patch("/os/{os_id}")
async def update_os(os_id: str, body: OSPatch, user: dict = Depends(current_user)):
    upd = {k: v for k, v in body.model_dump().items() if v is not None}
    if "items" in upd:
        upd["items"] = [dict(i) for i in upd["items"]]
        upd["total"] = _os_total(upd["items"])
    if "custom_fields" in upd:
        upd["custom_fields"] = [dict(c) for c in upd["custom_fields"]]
    if "recurrence" in upd:
        r = upd["recurrence"]
        if r and r.get("enabled") and not r.get("next_run_at"):
            r["next_run_at"] = _next_recurrence_date(r.get("interval", "monthly"))
    if upd:
        await db.ordem_servico.update_one({"os_id": os_id, "org_id": user["org_id"]}, {"$set": upd})
    return {"ok": True}

@api.delete("/os/{os_id}")
async def delete_os(os_id: str, user: dict = Depends(current_user)):
    await db.ordem_servico.delete_one({"os_id": os_id, "org_id": user["org_id"]})
    return {"ok": True}

class OSFromLead(BaseModel):
    lead_id: str
    title: Optional[str] = None
    items: List[OSItem] = []

@api.post("/os/from-lead")
async def os_from_lead(body: OSFromLead, user: dict = Depends(current_user)):
    lead = await db.leads.find_one({"lead_id": body.lead_id, "org_id": user["org_id"]}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead não encontrado")
    items = [dict(i) for i in body.items] or [{
        "description": f"Serviço para {lead.get('company') or lead['name']}",
        "quantity": 1,
        "unit_price": float(lead.get("value") or 0),
    }]
    doc = {
        "os_id": gen_id("os"),
        "org_id": user["org_id"],
        "title": body.title or f"OS — {lead['name']}",
        "client_name": lead["name"],
        "client_email": lead.get("email", ""),
        "client_phone": lead.get("phone", ""),
        "lead_id": lead["lead_id"],
        "project_id": None,
        "items": items,
        "total": _os_total(items),
        "notes": "",
        "due_date": "",
        "status": "orcamento",
        "custom_fields": [],
        "recurrence": None,
        "public_token": secrets.token_urlsafe(24),
        "created_at": iso(now_utc()),
        "created_by": user["user_id"],
    }
    await db.ordem_servico.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.post("/os/{os_id}/to-project")
async def os_to_project(os_id: str, user: dict = Depends(current_user)):
    os_doc = await db.ordem_servico.find_one({"os_id": os_id, "org_id": user["org_id"]}, {"_id": 0})
    if not os_doc:
        raise HTTPException(status_code=404, detail="OS não encontrada")
    if os_doc.get("project_id"):
        return {"ok": True, "project_id": os_doc["project_id"], "already": True}
    proj_id = gen_id("proj")
    now = iso(now_utc())
    await db.projects.insert_one({
        "project_id": proj_id, "org_id": user["org_id"],
        "name": os_doc["title"],
        "description": f"Projeto criado a partir da OS {os_id} — cliente: {os_doc['client_name']}",
        "created_at": now,
    })
    for it in os_doc.get("items", []):
        await db.tasks.insert_one({
            "task_id": gen_id("task"), "org_id": user["org_id"], "project_id": proj_id,
            "title": it.get("description") or "Item", "status": "a_fazer",
            "assignee": "", "due_date": os_doc.get("due_date", ""), "created_at": now,
        })
    await db.ordem_servico.update_one(
        {"os_id": os_id, "org_id": user["org_id"]},
        {"$set": {"project_id": proj_id, "status": "em_execucao"}},
    )
    return {"ok": True, "project_id": proj_id}

# ----------------- OS Templates -----------------
class OSTemplateIn(BaseModel):
    name: str
    title: str = ""
    items: List[OSItem] = []
    custom_fields: List[OSCustomField] = []
    notes: str = ""

@api.get("/os/templates")
async def list_os_templates(user: dict = Depends(current_user)):
    items = await db.os_templates.find({"org_id": user["org_id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return {"items": items}

@api.post("/os/templates")
async def create_os_template(body: OSTemplateIn, user: dict = Depends(current_user)):
    doc = body.model_dump()
    doc["items"] = [dict(i) for i in doc["items"]]
    doc["custom_fields"] = [dict(c) for c in doc["custom_fields"]]
    doc.update({"template_id": gen_id("tpl"), "org_id": user["org_id"], "created_at": iso(now_utc())})
    await db.os_templates.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.delete("/os/templates/{template_id}")
async def delete_os_template(template_id: str, user: dict = Depends(current_user)):
    await db.os_templates.delete_one({"template_id": template_id, "org_id": user["org_id"]})
    return {"ok": True}

class OSFromTemplate(BaseModel):
    template_id: str
    client_name: str
    client_email: str = ""
    client_phone: str = ""
    title: Optional[str] = None

@api.post("/os/from-template")
async def os_from_template(body: OSFromTemplate, user: dict = Depends(current_user)):
    tpl = await db.os_templates.find_one({"template_id": body.template_id, "org_id": user["org_id"]}, {"_id": 0})
    if not tpl:
        raise HTTPException(404, "Template não encontrado")
    doc = {
        "os_id": gen_id("os"), "org_id": user["org_id"],
        "title": body.title or tpl.get("title") or tpl["name"],
        "client_name": body.client_name, "client_email": body.client_email, "client_phone": body.client_phone,
        "lead_id": None, "project_id": None,
        "items": [dict(i) for i in tpl.get("items", [])],
        "custom_fields": [dict(c) for c in tpl.get("custom_fields", [])],
        "notes": tpl.get("notes", ""),
        "due_date": "", "status": "orcamento",
        "recurrence": None,
        "template_id": body.template_id,
        "public_token": secrets.token_urlsafe(24),
        "created_at": iso(now_utc()), "created_by": user["user_id"],
    }
    doc["total"] = _os_total(doc["items"])
    await db.ordem_servico.insert_one(doc)
    doc.pop("_id", None)
    return doc

# ----------------- OS Send (Email + WhatsApp) -----------------
def _os_html(o: Dict[str, Any], url: str) -> str:
    items_html = "".join([
        f"<tr><td style='padding:8px;border-bottom:1px solid #eee'>{(it.get('description') or '')}</td>"
        f"<td style='padding:8px;border-bottom:1px solid #eee;text-align:right'>{it.get('quantity',1)}</td>"
        f"<td style='padding:8px;border-bottom:1px solid #eee;text-align:right'>R$ {float(it.get('unit_price',0)):,.2f}</td></tr>"
        for it in o.get("items", [])
    ])
    total = float(o.get("total", 0))
    return f"""
<div style="font-family:Helvetica,Arial,sans-serif;color:#0A0A14;max-width:600px;margin:0 auto;padding:24px">
  <div style="border-bottom:2px solid #0A0A14;padding-bottom:16px;margin-bottom:24px">
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#888">Ordem de serviço</div>
    <div style="font-size:22px;margin-top:8px">{o.get('title','')}</div>
  </div>
  <p style="color:#333;line-height:1.5">Olá, {o.get('client_name','')}!</p>
  <p style="color:#333;line-height:1.5">Segue sua proposta. Você pode <b>aceitar, assinar e pagar via PIX</b> em um único link:</p>
  <p style="text-align:center;margin:28px 0">
    <a href="{url}" style="background:#0A0A14;color:#F5F1EA;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:600">Abrir proposta</a>
  </p>
  <table style="width:100%;border-collapse:collapse;margin-top:16px">
    <thead>
      <tr style="background:#F5F1EA">
        <th style="padding:10px;text-align:left;font-size:11px;letter-spacing:1px">DESCRIÇÃO</th>
        <th style="padding:10px;text-align:right;font-size:11px;letter-spacing:1px">QTD</th>
        <th style="padding:10px;text-align:right;font-size:11px;letter-spacing:1px">VALOR</th>
      </tr>
    </thead>
    <tbody>{items_html}</tbody>
    <tfoot>
      <tr><td colspan="2" style="padding:12px;text-align:right;font-weight:700">Total</td>
      <td style="padding:12px;text-align:right;font-weight:700">R$ {total:,.2f}</td></tr>
    </tfoot>
  </table>
  <p style="color:#888;font-size:12px;margin-top:32px">Este link expira em 30 dias. Enviado por Prisma.</p>
</div>"""

def _os_wa_text(o: Dict[str, Any], url: str) -> str:
    total = float(o.get("total", 0))
    return (
        f"Olá, {o.get('client_name','')}! Aqui está sua proposta da *{o.get('title','')}*.\n\n"
        f"Total: *R$ {total:,.2f}*\n\n"
        f"Você pode aceitar, assinar e pagar por PIX em um clique:\n{url}\n\n"
        "Qualquer dúvida, é só responder por aqui. — Prisma"
    )

class OSSendIn(BaseModel):
    channels: List[Literal["email", "whatsapp"]] = ["email", "whatsapp"]
    origin_url: Optional[str] = None

@api.post("/os/{os_id}/send")
async def send_os(os_id: str, body: OSSendIn, user: dict = Depends(current_user)):
    o = await db.ordem_servico.find_one({"os_id": os_id, "org_id": user["org_id"]}, {"_id": 0})
    if not o: raise HTTPException(404, "OS não encontrada")
    token = o.get("public_token") or secrets.token_urlsafe(24)
    if not o.get("public_token"):
        await db.ordem_servico.update_one({"os_id": os_id, "org_id": user["org_id"]}, {"$set": {"public_token": token}})
    url = _os_public_url(token, body.origin_url)
    results: Dict[str, Any] = {"url": url}
    if "email" in body.channels and o.get("client_email"):
        results["email"] = await send_email(o["client_email"], f"Proposta — {o.get('title','')}", _os_html(o, url))
    if "whatsapp" in body.channels and o.get("client_phone"):
        results["whatsapp"] = await send_whatsapp(o["client_phone"], _os_wa_text(o, url))
    await db.ordem_servico.update_one({"os_id": os_id, "org_id": user["org_id"]},
        {"$set": {"sent_at": iso(now_utc()), "sent_channels": body.channels}})
    return {"ok": True, **results}

# ----------------- Portal público do cliente -----------------
def _sanitize_os_for_public(o: Dict[str, Any]) -> Dict[str, Any]:
    keep = ("os_id","title","client_name","client_email","items","total","status","notes","due_date",
            "created_at","sent_at","signed_at","signed_by","paid_at","custom_fields")
    return {k: o.get(k) for k in keep if k in o}

@api.get("/public/os/{token}")
async def public_get_os(token: str):
    o = await db.ordem_servico.find_one({"public_token": token}, {"_id": 0})
    if not o: raise HTTPException(404, "Não encontrada")
    org = await db.orgs.find_one({"org_id": o["org_id"]}, {"_id": 0}) or {"name": "Prisma"}
    return {"os": _sanitize_os_for_public(o), "brand": {"name": org.get("name", "Prisma")}}

@api.get("/public/os/{token}/related")
async def public_related(token: str):
    o = await db.ordem_servico.find_one({"public_token": token}, {"_id": 0})
    if not o: raise HTTPException(404, "Não encontrada")
    email = (o.get("client_email") or "").strip().lower()
    if not email:
        return {"items": []}
    items = await db.ordem_servico.find(
        {"org_id": o["org_id"], "client_email": {"$regex": f"^{email}$", "$options": "i"},
         "public_token": {"$ne": token}}, {"_id": 0}
    ).sort("created_at", -1).to_list(200)
    return {"items": [_sanitize_os_for_public(i) for i in items]}

class OSSignIn(BaseModel):
    full_name: str
    email: str = ""
    accept_terms: bool = True

@api.post("/public/os/{token}/sign")
async def public_sign(token: str, body: OSSignIn, request: Request):
    if not body.accept_terms:
        raise HTTPException(400, "É necessário aceitar os termos")
    o = await db.ordem_servico.find_one({"public_token": token}, {"_id": 0})
    if not o: raise HTTPException(404, "Não encontrada")
    if o.get("signed_at"): raise HTTPException(400, "Já assinada")
    ip = request.client.host if request.client else ""
    ua = request.headers.get("user-agent", "")[:200]
    now = iso(now_utc())
    payload = f"{o['os_id']}|{body.full_name}|{body.email}|{now}|{ip}"
    sig_hash = hashlib.sha256(payload.encode()).hexdigest()
    upd = {
        "signed_at": now, "signed_by": body.full_name, "signed_email": body.email,
        "signed_ip": ip, "signed_ua": ua, "signature_hash": sig_hash, "status": "aprovada",
    }
    await db.ordem_servico.update_one({"os_id": o["os_id"]}, {"$set": upd})
    # Notify owner
    owner = await db.users.find_one({"org_id": o["org_id"]}, {"_id": 0})
    if owner and owner.get("email"):
        await send_email(owner["email"], f"Proposta assinada — {o.get('title','')}",
            f"<p><b>{body.full_name}</b> assinou a proposta <b>{o.get('title','')}</b> (R$ {float(o.get('total',0)):,.2f}).</p><p>Hash: <code>{sig_hash[:16]}…</code></p>")
    return {"ok": True, "signature_hash": sig_hash, "signed_at": now}

class OSPublicCheckoutIn(BaseModel):
    origin_url: str

@api.post("/public/os/{token}/checkout")
async def public_os_checkout(token: str, body: OSPublicCheckoutIn):
    o = await db.ordem_servico.find_one({"public_token": token}, {"_id": 0})
    if not o: raise HTTPException(404, "Não encontrada")
    amount = int(round(float(o.get("total") or 0) * 100))
    if amount <= 0: raise HTTPException(400, "OS sem valor")
    base_kwargs = dict(
        line_items=[{"price_data": {"currency": "brl", "product_data": {"name": o.get("title") or o["os_id"]},
                                    "unit_amount": amount}, "quantity": 1}],
        mode="payment",
        success_url=f"{body.origin_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{body.origin_url}/os/publica/{token}",
        metadata={"os_id": o["os_id"], "org_id": o["org_id"], "public_token": token},
    )
    try:
        session = stripe.checkout.Session.create(**base_kwargs,
            payment_method_types=["card","pix"], payment_method_options={"pix":{"expires_after_seconds":3600}})
        pix = True
    except stripe.error.StripeError as e:
        if "pix" in (getattr(e,"user_message",None) or str(e)).lower():
            session = stripe.checkout.Session.create(**base_kwargs); pix = False
        else:
            raise HTTPException(400, f"Stripe: {getattr(e,'user_message',None) or str(e)[:200]}")
    await db.payment_transactions.insert_one({
        "session_id": session.id, "lookup_key": "os_public",
        "amount": amount, "currency": "brl", "status": "initiated", "payment_status": "pending",
        "org_id": o["org_id"], "os_id": o["os_id"], "is_pix_enabled": pix, "is_subscription": False,
        "created_at": iso(now_utc()), "updated_at": iso(now_utc()),
    })
    return {"checkout_url": session.url, "session_id": session.id, "pix_enabled": pix}

@api.get("/public/os/{token}/receipt")
async def public_receipt(token: str):
    o = await db.ordem_servico.find_one({"public_token": token}, {"_id": 0})
    if not o: raise HTTPException(404, "Não encontrada")
    if not o.get("signed_at"): raise HTTPException(400, "Proposta ainda não assinada")
    # Generate PDF with reportlab
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.units import cm
    buf = _io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=2*cm, bottomMargin=2*cm, leftMargin=2*cm, rightMargin=2*cm)
    styles = getSampleStyleSheet()
    story: List[Any] = []
    story.append(Paragraph("<b>COMPROVANTE DE ASSINATURA ELETRÔNICA</b>", styles["Title"]))
    story.append(Spacer(1, 12))
    story.append(Paragraph(f"<b>Ordem de Serviço:</b> {o.get('title','')}", styles["Normal"]))
    story.append(Paragraph(f"<b>Cliente:</b> {o.get('client_name','')}", styles["Normal"]))
    story.append(Paragraph(f"<b>Total:</b> R$ {float(o.get('total',0)):,.2f}", styles["Normal"]))
    story.append(Spacer(1, 12))
    story.append(Paragraph("<b>Itens</b>", styles["Heading3"]))
    data = [["Descrição", "Qtd", "Valor unit.", "Subtotal"]]
    for it in o.get("items", []):
        q = float(it.get("quantity", 1) or 1); v = float(it.get("unit_price", 0) or 0)
        data.append([it.get("description", ""), f"{q:g}", f"R$ {v:,.2f}", f"R$ {q*v:,.2f}"])
    t = Table(data, colWidths=[8*cm, 2*cm, 3*cm, 3*cm])
    t.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,0), colors.HexColor("#F5F1EA")),
        ("GRID",(0,0),(-1,-1),0.25, colors.grey),
        ("FONTSIZE",(0,0),(-1,-1), 9),
    ]))
    story.append(t)
    story.append(Spacer(1, 16))
    story.append(Paragraph("<b>Assinatura Eletrônica</b>", styles["Heading3"]))
    story.append(Paragraph(f"<b>Assinado por:</b> {o.get('signed_by','')}", styles["Normal"]))
    story.append(Paragraph(f"<b>Email:</b> {o.get('signed_email','')}", styles["Normal"]))
    story.append(Paragraph(f"<b>Data/Hora (UTC):</b> {o.get('signed_at','')}", styles["Normal"]))
    story.append(Paragraph(f"<b>IP:</b> {o.get('signed_ip','')}", styles["Normal"]))
    story.append(Paragraph(f"<b>Hash SHA-256:</b> <font face='Courier'>{o.get('signature_hash','')}</font>", styles["Normal"]))
    story.append(Spacer(1, 12))
    story.append(Paragraph("<i>Documento assinado eletronicamente conforme MP 2.200-2/2001 e Lei 14.063/2020.</i>", ParagraphStyle("legal", parent=styles["Italic"], fontSize=8)))
    doc.build(story)
    buf.seek(0)
    from fastapi.responses import Response
    return Response(content=buf.getvalue(), media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="comprovante-{o["os_id"]}.pdf"'})



# ----------------- Stripe / PIX Payments -----------------
class CheckoutIn(BaseModel):
    lookup_key: str
    origin_url: str
    quantity: int = 1
    os_id: Optional[str] = None  # link to Ordem de Serviço
    trial_days: Optional[int] = None

def _is_pix_capable(currency: str, is_one_time: bool) -> bool:
    # Stripe supports PIX for BRL one-time payments (not subscriptions)
    return currency.lower() == "brl" and is_one_time

@api.post("/payments/checkout")
async def payments_checkout(body: CheckoutIn, request: Request):
    prices = stripe.Price.list(lookup_keys=[body.lookup_key], active=True, limit=1).data
    if not prices:
        raise HTTPException(500, f"Preço não encontrado: {body.lookup_key}")
    price = prices[0]
    is_subscription = bool(price.recurring)
    kwargs: Dict[str, Any] = dict(
        line_items=[{"price": price.id, "quantity": body.quantity}],
        mode="subscription" if is_subscription else "payment",
        success_url=f"{body.origin_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{body.origin_url}/payment/cancel",
        metadata={"lookup_key": body.lookup_key, "os_id": body.os_id or ""},
    )
    # Try to infer authenticated user (optional — checkout works for guests too)
    try:
        token = None
        cookies = request.headers.get("cookie", "") or ""
        if "session_token=" in cookies:
            token = cookies.split("session_token=", 1)[1].split(";", 1)[0]
        if not token:
            auth = request.headers.get("Authorization", "")
            if auth.startswith("Bearer "):
                token = auth.split(" ", 1)[1]
        user = await get_user_from_token(token) if token else None
        if user:
            kwargs["metadata"].update({"user_id": user["user_id"], "org_id": user["org_id"]})
    except Exception:
        user = None

    # PIX enablement (BRL + one-time payments). Falls back to card if PIX isn't enabled on this Stripe account.
    is_pix = _is_pix_capable(price.currency, not is_subscription)
    if is_subscription and body.trial_days and body.trial_days > 0:
        kwargs["subscription_data"] = {"trial_period_days": int(body.trial_days)}

    session = None
    if is_pix:
        pix_kwargs = dict(kwargs)
        pix_kwargs["payment_method_types"] = ["card", "pix"]
        pix_kwargs["payment_method_options"] = {"pix": {"expires_after_seconds": 3600}}
        try:
            session = stripe.checkout.Session.create(**pix_kwargs)
        except stripe.error.StripeError as e:
            msg = (getattr(e, "user_message", None) or str(e)).lower()
            if "pix" in msg or "invalid" in msg:
                logging.warning("PIX unavailable on this account, falling back to card")
                is_pix = False
                session = None
            else:
                raise HTTPException(status_code=400, detail=f"Stripe: {getattr(e,'user_message',None) or str(e)[:200]}")
    if session is None:
        try:
            session = stripe.checkout.Session.create(**kwargs)
        except stripe.error.StripeError as e:
            raise HTTPException(status_code=400, detail=f"Stripe: {getattr(e,'user_message',None) or str(e)[:200]}")

    await db.payment_transactions.insert_one({
        "session_id": session.id,
        "lookup_key": body.lookup_key,
        "amount": (price.unit_amount or 0) * body.quantity,
        "currency": price.currency,
        "status": "initiated",
        "payment_status": "pending",
        "user_id": (user or {}).get("user_id"),
        "org_id": (user or {}).get("org_id"),
        "os_id": body.os_id,
        "is_pix_enabled": is_pix,
        "is_subscription": is_subscription,
        "created_at": iso(now_utc()),
        "updated_at": iso(now_utc()),
    })
    return {"checkout_url": session.url, "session_id": session.id, "pix_enabled": is_pix}

class OSCheckoutIn(BaseModel):
    os_id: str
    origin_url: str

@api.post("/payments/os-checkout")
async def os_checkout(body: OSCheckoutIn, user: dict = Depends(current_user)):
    o = await db.ordem_servico.find_one({"os_id": body.os_id, "org_id": user["org_id"]}, {"_id": 0})
    if not o:
        raise HTTPException(404, "OS não encontrada")
    amount = int(round(float(o.get("total") or 0) * 100))
    if amount <= 0:
        raise HTTPException(400, "OS sem valor total")
    try:
        session = stripe.checkout.Session.create(
            line_items=[{
                "price_data": {
                    "currency": "brl",
                    "product_data": {"name": o.get("title") or f"OS {o['os_id']}"},
                    "unit_amount": amount,
                },
                "quantity": 1,
            }],
            mode="payment",
            payment_method_types=["card", "pix"],
            payment_method_options={"pix": {"expires_after_seconds": 3600}},
            success_url=f"{body.origin_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{body.origin_url}/payment/cancel",
            metadata={"os_id": body.os_id, "user_id": user["user_id"], "org_id": user["org_id"]},
        )
        pix_enabled = True
    except stripe.error.StripeError as e:
        msg = (getattr(e, "user_message", None) or str(e)).lower()
        if "pix" in msg:
            # Fallback to card-only
            try:
                session = stripe.checkout.Session.create(
                    line_items=[{
                        "price_data": {
                            "currency": "brl",
                            "product_data": {"name": o.get("title") or f"OS {o['os_id']}"},
                            "unit_amount": amount,
                        },
                        "quantity": 1,
                    }],
                    mode="payment",
                    success_url=f"{body.origin_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}",
                    cancel_url=f"{body.origin_url}/payment/cancel",
                    metadata={"os_id": body.os_id, "user_id": user["user_id"], "org_id": user["org_id"]},
                )
                pix_enabled = False
            except stripe.error.StripeError as e2:
                raise HTTPException(400, f"Stripe: {getattr(e2,'user_message',None) or str(e2)[:200]}")
        else:
            raise HTTPException(400, f"Stripe: {getattr(e,'user_message',None) or str(e)[:200]}")
    await db.payment_transactions.insert_one({
        "session_id": session.id, "lookup_key": "os_custom",
        "amount": amount, "currency": "brl",
        "status": "initiated", "payment_status": "pending",
        "user_id": user["user_id"], "org_id": user["org_id"],
        "os_id": body.os_id, "is_pix_enabled": pix_enabled, "is_subscription": False,
        "created_at": iso(now_utc()), "updated_at": iso(now_utc()),
    })
    return {"checkout_url": session.url, "session_id": session.id, "pix_enabled": pix_enabled}

@api.get("/payments/status/{session_id}")
async def payments_status(session_id: str):
    record = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not record:
        raise HTTPException(404, "Transação não encontrada")
    if record.get("payment_status") != "paid":
        try:
            s = stripe.checkout.Session.retrieve(session_id)
            if s.payment_status == "paid" or s.status == "complete":
                await db.payment_transactions.update_one(
                    {"session_id": session_id, "payment_status": {"$ne": "paid"}},
                    {"$set": {
                        "status": "completed", "payment_status": "paid",
                        "stripe_subscription_id": s.subscription,
                        "stripe_payment_intent_id": s.payment_intent,
                        "updated_at": iso(now_utc()),
                    }},
                )
                record = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
                # If tied to OS, mark OS as approved/paid
                if record.get("os_id"):
                    await db.ordem_servico.update_one(
                        {"os_id": record["os_id"]},
                        {"$set": {"status": "aprovada", "paid_at": iso(now_utc())}},
                    )
        except stripe.error.StripeError:
            pass
    return {
        "session_id": record["session_id"],
        "status": record["status"],
        "payment_status": record["payment_status"],
        "amount": record.get("amount"),
        "currency": record.get("currency"),
        "lookup_key": record.get("lookup_key"),
    }

@api.post("/stripe/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")
    try:
        event = stripe.Webhook.construct_event(payload, sig, STRIPE_WEBHOOK_SECRET)
    except Exception:
        raise HTTPException(400, "Invalid signature")
    obj, t = event["data"]["object"], event["type"]
    now = iso(now_utc())
    if t == "checkout.session.completed":
        await db.payment_transactions.update_one(
            {"session_id": obj["id"], "payment_status": {"$ne": "paid"}},
            {"$set": {
                "status": "completed",
                "payment_status": obj.get("payment_status", "paid"),
                "stripe_subscription_id": obj.get("subscription"),
                "stripe_payment_intent_id": obj.get("payment_intent"),
                "updated_at": now,
            }},
        )
        # Sync OS if linked
        meta = obj.get("metadata") or {}
        if meta.get("os_id"):
            await db.ordem_servico.update_one({"os_id": meta["os_id"]},
                {"$set": {"status": "aprovada", "paid_at": now}})
    elif t == "checkout.session.async_payment_succeeded":
        await db.payment_transactions.update_one({"session_id": obj["id"]},
            {"$set": {"payment_status": "paid", "updated_at": now}})
    elif t == "checkout.session.async_payment_failed":
        await db.payment_transactions.update_one({"session_id": obj["id"]},
            {"$set": {"status": "failed", "payment_status": "failed", "updated_at": now}})
    elif t == "checkout.session.expired":
        await db.payment_transactions.update_one({"session_id": obj["id"]},
            {"$set": {"status": "expired", "payment_status": "expired", "updated_at": now}})
    elif t == "charge.refunded":
        await db.payment_transactions.update_one({"stripe_payment_intent_id": obj.get("payment_intent")},
            {"$set": {"status": "refunded", "payment_status": "refunded", "updated_at": now}})
    return {"status": "ok"}

# ----------------- Public: Founder Deal live counter -----------------
@api.get("/public/founder-deal")
async def founder_deal():
    claimed = await db.payment_transactions.count_documents({
        "lookup_key": "prisma_founder_deal",
        "payment_status": "paid",
    })
    remaining = max(0, FOUNDER_CAP - claimed)
    return {"cap": FOUNDER_CAP, "claimed": claimed, "remaining": remaining}

# ----------------- Copiloto: Ações operacionais (tool calling) -----------------
class CopilotCreateTask(BaseModel):
    title: str
    project_id: Optional[str] = None
    assignee: str = ""
    due_date: str = ""

@api.post("/copilot/create-task")
async def cop_create_task(body: CopilotCreateTask, user: dict = Depends(current_user)):
    project_id = body.project_id
    if not project_id:
        proj = await db.projects.find_one({"org_id": user["org_id"]}, {"_id": 0})
        if not proj:
            proj_id = gen_id("proj")
            await db.projects.insert_one({
                "project_id": proj_id, "org_id": user["org_id"],
                "name": "Tarefas do Copiloto", "description": "Auto-criado pelo Copiloto",
                "created_at": iso(now_utc()),
            })
            project_id = proj_id
        else:
            project_id = proj["project_id"]
    doc = {
        "task_id": gen_id("task"), "org_id": user["org_id"], "project_id": project_id,
        "title": body.title, "status": "a_fazer",
        "assignee": body.assignee, "due_date": body.due_date,
        "created_at": iso(now_utc()), "created_by": "copilot",
    }
    await db.tasks.insert_one(doc)
    doc.pop("_id", None)
    return doc

async def _llm_generate(prompt: str, system: str = "") -> str:
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=gen_id("copgen"),
        system_message=system or "Você é o Copiloto Prisma. Responda em português (Brasil) com clareza e objetividade.",
    ).with_model("anthropic", "claude-sonnet-4-6")
    resp = await chat.send_message(UserMessage(text=prompt))
    return resp if isinstance(resp, str) else str(resp)

class CopilotProposal(BaseModel):
    lead_id: Optional[str] = None
    client_name: Optional[str] = None
    scope: Optional[str] = None
    value: Optional[float] = None

@api.post("/copilot/generate-proposal")
async def cop_generate_proposal(body: CopilotProposal, user: dict = Depends(current_user)):
    lead = None
    if body.lead_id:
        lead = await db.leads.find_one({"lead_id": body.lead_id, "org_id": user["org_id"]}, {"_id": 0})
    client = body.client_name or (lead["name"] if lead else "Cliente")
    company = (lead or {}).get("company", "")
    scope = body.scope or (lead or {}).get("notes") or "Escopo a alinhar em reunião de kickoff."
    value = body.value if body.value is not None else float((lead or {}).get("value") or 0)
    prompt = f"""Gere uma proposta comercial completa em português para o cliente abaixo.
Formato: markdown com seções (Resumo, Escopo, Entregas, Prazos, Investimento, Próximos passos).
Cliente: {client} ({company or 'sem empresa'})
Escopo/contexto: {scope}
Investimento sugerido: R$ {value:,.2f}
Tom: profissional, direto, gerando confiança. Assine como equipe Prisma."""
    content = await _llm_generate(prompt)
    doc_id = gen_id("doc")
    doc = {
        "doc_id": doc_id, "org_id": user["org_id"],
        "title": f"Proposta — {client}.md",
        "kind": "proposta", "size": len(content.encode("utf-8")),
        "storage_path": "",
        "created_at": iso(now_utc()),
        "generated_by": "copilot",
        "lead_id": body.lead_id,
        "markdown": content,
    }
    await db.documents.insert_one(doc)
    doc.pop("_id", None)
    return {"proposal": content, "doc_id": doc_id, "client": client, "value": value}

class CopilotReport(BaseModel):
    type: Literal["crm", "financeiro", "projetos", "geral"] = "geral"
    period: Optional[str] = None

@api.post("/copilot/generate-report")
async def cop_generate_report(body: CopilotReport, user: dict = Depends(current_user)):
    org = user["org_id"]
    ctx: Dict[str, Any] = {}
    if body.type in ("crm", "geral"):
        leads = await db.leads.find({"org_id": org}, {"_id": 0}).to_list(500)
        by_stage: Dict[str, Any] = {}
        for l in leads:
            s = l.get("stage", "Lead")
            by_stage.setdefault(s, {"count": 0, "value": 0})
            by_stage[s]["count"] += 1
            by_stage[s]["value"] += l.get("value", 0) or 0
        ctx["crm"] = {"total": len(leads), "por_estagio": by_stage}
    if body.type in ("financeiro", "geral"):
        tx = await db.finance.find({"org_id": org}, {"_id": 0}).to_list(500)
        receita = sum(t["amount"] for t in tx if t["kind"] == "receita")
        despesa = sum(t["amount"] for t in tx if t["kind"] == "despesa")
        ctx["financeiro"] = {"receita": receita, "despesa": despesa, "saldo": receita - despesa, "n_tx": len(tx)}
    if body.type in ("projetos", "geral"):
        n_proj = await db.projects.count_documents({"org_id": org})
        tasks_open = await db.tasks.count_documents({"org_id": org, "status": {"$ne": "concluido"}})
        tasks_done = await db.tasks.count_documents({"org_id": org, "status": "concluido"})
        ctx["projetos"] = {"projetos": n_proj, "tarefas_abertas": tasks_open, "tarefas_concluidas": tasks_done}
    import json as _json
    prompt = f"""Gere um relatório executivo em português (markdown) sobre "{body.type}" da empresa.
Dados brutos (JSON):
{_json.dumps(ctx, ensure_ascii=False, indent=2)}

Estrutura: Resumo executivo, Números-chave, Análise, Riscos, 3 recomendações acionáveis.
Tom: consultivo, curto, com bullets. Formatar valores em reais."""
    content = await _llm_generate(prompt)
    rep_id = gen_id("rep")
    rep = {
        "report_id": rep_id, "org_id": org, "type": body.type,
        "period": body.period or datetime.now().strftime("%Y-%m"),
        "content": content, "data": ctx,
        "created_at": iso(now_utc()), "created_by": user["user_id"],
    }
    await db.copilot_reports.insert_one(rep)
    rep.pop("_id", None)
    # Also save as a document for easy retrieval
    await db.documents.insert_one({
        "doc_id": gen_id("doc"), "org_id": org,
        "title": f"Relatório {body.type} — {rep['period']}.md",
        "kind": "relatorio", "size": len(content.encode("utf-8")),
        "storage_path": "", "created_at": iso(now_utc()),
        "generated_by": "copilot", "markdown": content, "report_id": rep_id,
    })
    return {"report": content, "report_id": rep_id, "data": ctx}

@api.get("/copilot/reports")
async def cop_list_reports(user: dict = Depends(current_user)):
    items = await db.copilot_reports.find({"org_id": user["org_id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return {"items": items}

# ----------------- Public Sales PDF (one-page) -----------------
@api.get("/public/apresentacao.pdf")
async def public_sales_pdf(para: Optional[str] = None, valor: Optional[float] = None):
    """One-page elegant sales PDF for Prisma. Public, no auth. Optional query params
    ?para=NomeCliente&valor=4500 personalize the hero.
    """
    from reportlab.pdfgen import canvas as _canvas
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    import qrcode
    from PIL import Image as PILImage
    from reportlab.lib.utils import ImageReader

    W, H = A4  # 595.27 x 841.89 pt
    buf = _io.BytesIO()
    c = _canvas.Canvas(buf, pagesize=A4)

    INK = colors.HexColor("#0A0A14")
    PAPER = colors.HexColor("#F5F1EA")
    MUTED = colors.HexColor("#6B6B75")
    LINE = colors.HexColor("#D9D6CE")
    EMERALD = colors.HexColor("#059669")
    RED = colors.HexColor("#DC2626")

    # Full paper background
    c.setFillColor(PAPER); c.rect(0, 0, W, H, fill=1, stroke=0)

    # ===== Header band =====
    c.setFillColor(INK); c.rect(0, H - 70, W, 70, fill=1, stroke=0)
    # Logo triangle
    c.setFillColor(PAPER)
    c.setLineJoin(1)
    p = c.beginPath(); p.moveTo(48, H - 30); p.lineTo(72, H - 55); p.lineTo(24, H - 55); p.close()
    c.drawPath(p, fill=1, stroke=0)
    # Brand
    c.setFillColor(PAPER); c.setFont("Times-Italic", 20); c.drawString(90, H - 42, "Prisma")
    c.setFont("Helvetica", 7); c.setFillColor(colors.HexColor("#B6B4A9"))
    c.drawString(90, H - 55, "PAINEL DE CONTROLE DA PME · pt-BR · PIX NATIVO")
    # Top-right meta
    c.setFillColor(PAPER); c.setFont("Helvetica", 8)
    c.drawRightString(W - 40, H - 34, "Apresentação comercial")
    c.setFont("Helvetica", 7); c.setFillColor(colors.HexColor("#B6B4A9"))
    c.drawRightString(W - 40, H - 47, datetime.now().strftime("%d %B %Y").upper())

    # ===== Hero =====
    hero_top = H - 100
    hero_h = 195
    # Left half — headline
    c.setFillColor(colors.HexColor("#8A8880")); c.setFont("Helvetica-Bold", 7)
    c.drawString(40, hero_top - 12, "SOFTWARE BRASILEIRO · IA NATIVA · SEM COMPLICAÇÃO")

    c.setFillColor(INK)
    # Personalized hero when 'para' present
    if para:
        c.setFont("Times-Roman", 30)
        c.drawString(40, hero_top - 46, f"Feito sob medida")
        c.setFont("Times-Italic", 30); c.drawString(40, hero_top - 78, f"para {para[:24]}.")
    else:
        c.setFont("Times-Roman", 32)
        c.drawString(40, hero_top - 46, "Sua PME rodando em")
        c.setFont("Times-Italic", 32); c.drawString(40, hero_top - 82, "piloto automático.")

    c.setFillColor(MUTED); c.setFont("Helvetica", 10.5)
    subtitle = [
        "CRM, WhatsApp, Ordem de Serviço, Financeiro, Projetos e IA",
        "no mesmo painel. Do primeiro contato ao PIX cair, sem trocar de aba.",
    ]
    for i, line in enumerate(subtitle):
        c.drawString(40, hero_top - 108 - i * 15, line)

    # 4 KPI stats row
    stats = [("24h", "por semana", "menos planilha"),
             ("3×", "para fechar", "OS + PIX no mesmo link"),
             ("7min", "lead → PIX", "IA + assinatura embutida"),
             ("R$ 0", "para começar", "30 dias grátis")]
    stat_x = 40; stat_gap = 4
    stat_w = (W - 80 - stat_gap * 3) / 4
    stat_y = hero_top - 180
    for i, (n, lbl, note) in enumerate(stats):
        x = stat_x + i * (stat_w + stat_gap)
        c.setFillColor(INK); c.setStrokeColor(LINE); c.setLineWidth(0.5)
        c.roundRect(x, stat_y, stat_w, 46, 6, fill=0, stroke=1)
        c.setFont("Times-Roman", 22); c.drawString(x + 10, stat_y + 26, n)
        c.setFillColor(colors.HexColor("#3A3A45")); c.setFont("Helvetica-Bold", 7.5)
        c.drawString(x + 10, stat_y + 14, lbl.upper())
        c.setFillColor(MUTED); c.setFont("Helvetica", 6.5)
        c.drawString(x + 10, stat_y + 4, note)

    # ===== 8 Modules grid =====
    mod_top = stat_y - 24
    c.setFillColor(colors.HexColor("#8A8880")); c.setFont("Helvetica-Bold", 7)
    c.drawString(40, mod_top, "8 MÓDULOS, 1 LOGIN")
    c.setFillColor(INK); c.setFont("Times-Roman", 15)
    c.drawString(40, mod_top - 20, "Tudo que sua PME precisa, ")
    c.setFont("Times-Italic", 15); c.drawString(40 + c.stringWidth("Tudo que sua PME precisa, ", "Times-Roman", 15), mod_top - 20, "no mesmo painel.")

    modules = [
        ("CRM", "Kanban de leads, funil visual."),
        ("WhatsApp", "Inbox unificada + Twilio real."),
        ("Ordem de Serviço", "Orçamento → assinatura → PIX."),
        ("Projetos", "Kanban · Lista · Calendário · Gantt."),
        ("Financeiro", "Fluxo de caixa + cobrança PIX."),
        ("Documentos", "Propostas e relatórios via IA."),
        ("Automações", "Motor \u201cquando/então\u201d nativo."),
        ("Copiloto IA", "Cria tarefas, propostas, relatórios."),
    ]
    mod_grid_top = mod_top - 32
    cols = 4; rows = 2
    gap = 6
    card_w = (W - 80 - gap * (cols - 1)) / cols
    card_h = 46
    for i, (name, desc) in enumerate(modules):
        r = i // cols; col = i % cols
        x = 40 + col * (card_w + gap)
        y = mod_grid_top - r * (card_h + gap) - card_h
        c.setFillColor(colors.white); c.setStrokeColor(LINE); c.setLineWidth(0.5)
        c.roundRect(x, y, card_w, card_h, 6, fill=1, stroke=1)
        # Small dot
        c.setFillColor(INK); c.circle(x + 12, y + card_h - 14, 3, fill=1, stroke=0)
        c.setFillColor(INK); c.setFont("Helvetica-Bold", 9)
        c.drawString(x + 22, y + card_h - 17, name)
        c.setFillColor(MUTED); c.setFont("Helvetica", 7.5)
        # Word-wrap desc naive
        c.drawString(x + 12, y + 12, desc[:56])

    # ===== Flow timeline =====
    flow_top = mod_grid_top - (rows * (card_h + gap)) - 12
    c.setFillColor(colors.HexColor("#8A8880")); c.setFont("Helvetica-Bold", 7)
    c.drawString(40, flow_top, "DO LEAD AO PIX")
    c.setFillColor(INK); c.setFont("Times-Roman", 15)
    c.drawString(40, flow_top - 20, "7 minutos, ")
    c.setFont("Times-Italic", 15); c.drawString(40 + c.stringWidth("7 minutos, ", "Times-Roman", 15), flow_top - 20, "de ponta a ponta.")

    steps = [("0:00", "WhatsApp chega"), ("0:30", "Copiloto propõe"),
             ("1:00", "OS enviada"), ("3:00", "Cliente assina"),
             ("5:00", "PIX cai"), ("7:00", "Projeto abre")]
    flow_line_y = flow_top - 46
    c.setStrokeColor(LINE); c.setLineWidth(0.5)
    c.line(52, flow_line_y, W - 52, flow_line_y)
    step_w = (W - 104) / (len(steps) - 1)
    for i, (t, lbl) in enumerate(steps):
        cx = 52 + i * step_w
        c.setFillColor(INK); c.circle(cx, flow_line_y, 4, fill=1, stroke=0)
        c.setFillColor(INK); c.setFont("Helvetica-Bold", 8)
        c.drawCentredString(cx, flow_line_y - 15, t)
        c.setFillColor(MUTED); c.setFont("Helvetica", 7)
        c.drawCentredString(cx, flow_line_y - 26, lbl)

    # ===== Pricing =====
    pr_top = flow_line_y - 46
    c.setFillColor(colors.HexColor("#8A8880")); c.setFont("Helvetica-Bold", 7)
    c.drawString(40, pr_top, "PLANOS · EM REAIS")
    c.setFillColor(INK); c.setFont("Times-Roman", 15)
    c.drawString(40, pr_top - 20, "Comece grátis. ")
    c.setFont("Times-Italic", 15); c.drawString(40 + c.stringWidth("Comece grátis. ", "Times-Roman", 15), pr_top - 20, "Cresça quando fizer sentido.")

    plans = [
        {"n": "Free", "p": "R$ 0", "s": "para sempre", "hl": False,
         "f": ["1 usuário", "CRM até 50 leads", "Copiloto 50 msgs/mês"]},
        {"n": "Growth", "p": "R$ 897", "s": "/mês", "hl": True,
         "f": ["Até 5 usuários", "WhatsApp real (Twilio)", "Copiloto ilimitado", "Automações ilimitadas"]},
        {"n": "Business", "p": "R$ 2.997", "s": "/mês", "hl": False,
         "f": ["Usuários ilimitados", "SLA 4h", "Onboarding assistido", "API pública"]},
    ]
    pr_grid_top = pr_top - 32
    p_gap = 8
    p_w = (W - 80 - p_gap * 2) / 3
    p_h = 108
    for i, pl in enumerate(plans):
        x = 40 + i * (p_w + p_gap)
        y = pr_grid_top - p_h
        if pl["hl"]:
            c.setFillColor(INK); c.setStrokeColor(INK); c.roundRect(x, y, p_w, p_h, 8, fill=1, stroke=1)
            title_col = PAPER; muted_col = colors.HexColor("#B6B4A9"); check_col = colors.HexColor("#34D399")
        else:
            c.setFillColor(colors.white); c.setStrokeColor(LINE); c.setLineWidth(0.5)
            c.roundRect(x, y, p_w, p_h, 8, fill=1, stroke=1)
            title_col = INK; muted_col = MUTED; check_col = EMERALD
        c.setFillColor(title_col); c.setFont("Helvetica-Bold", 10)
        c.drawString(x + 12, y + p_h - 18, pl["n"])
        if pl["hl"]:
            c.setFillColor(PAPER); c.setFont("Helvetica-Bold", 6.5)
            c.drawRightString(x + p_w - 12, y + p_h - 15, "RECOMENDADO")
        c.setFillColor(title_col); c.setFont("Times-Roman", 22)
        c.drawString(x + 12, y + p_h - 42, pl["p"])
        c.setFillColor(muted_col); c.setFont("Helvetica", 7.5)
        c.drawString(x + 12 + c.stringWidth(pl["p"], "Times-Roman", 22) + 4, y + p_h - 42 + 4, pl["s"])
        # Features
        for j, feat in enumerate(pl["f"]):
            fy = y + p_h - 60 - j * 12
            c.setFillColor(check_col); c.setFont("Helvetica-Bold", 8)
            c.drawString(x + 12, fy, "✓")
            c.setFillColor(title_col if pl["hl"] else INK); c.setFont("Helvetica", 7.5)
            c.drawString(x + 24, fy, feat[:38])

    # Founder deal strip
    fd_y = pr_grid_top - p_h - 12
    c.setFillColor(colors.HexColor("#FFF7ED")); c.setStrokeColor(colors.HexColor("#F97316")); c.setLineWidth(0.8)
    c.roundRect(40, fd_y - 30, W - 80, 30, 6, fill=1, stroke=1)
    c.setFillColor(INK); c.setFont("Helvetica-Bold", 8)
    c.drawString(52, fd_y - 12, "FOUNDER DEAL · VAGAS LIMITADAS")
    c.setFont("Times-Roman", 12); c.drawString(52, fd_y - 26, "R$ 4.997 à vista = 3 anos de Growth")
    c.setFillColor(MUTED); c.setFont("Helvetica", 7.5)
    c.drawRightString(W - 52, fd_y - 20, "Trave o preço hoje. Depois vira Growth normal em 36 meses.")

    # ===== Footer / CTA =====
    footer_h = 70
    c.setFillColor(INK); c.rect(0, 0, W, footer_h, fill=1, stroke=0)

    # QR code
    qr_url = "https://pme-all-in-one.preview.emergentagent.com/apresentacao"
    if para:
        qr_url += f"?para={para.replace(' ', '+')}"
    if valor:
        qr_url += f"{'&' if '?' in qr_url else '?'}valor={int(valor)}"
    qr = qrcode.QRCode(version=1, error_correction=qrcode.constants.ERROR_CORRECT_L, box_size=6, border=1)
    qr.add_data(qr_url); qr.make(fit=True)
    qr_img = qr.make_image(fill_color="#F5F1EA", back_color="#0A0A14").convert("RGB")
    qr_buf = _io.BytesIO(); qr_img.save(qr_buf, format="PNG"); qr_buf.seek(0)
    c.drawImage(ImageReader(qr_buf), W - 90, 10, width=50, height=50, mask="auto")

    c.setFillColor(PAPER); c.setFont("Times-Italic", 15)
    c.drawString(40, 44, "Sua PME merece rodar sozinha.")
    c.setFillColor(colors.HexColor("#B6B4A9")); c.setFont("Helvetica", 7.5)
    c.drawString(40, 30, "TESTE 30 DIAS GRÁTIS · SEM CARTÃO · CANCELAMENTO A QUALQUER HORA")
    c.setFillColor(PAPER); c.setFont("Helvetica-Bold", 9)
    c.drawString(40, 14, "prisma.com.br  ·  vendas@prisma.com.br")

    if valor:
        c.setFillColor(colors.HexColor("#B6B4A9")); c.setFont("Helvetica", 6.5)
        c.drawRightString(W - 100, 30, f"Proposta pré-preenchida · R$ {valor:,.2f}")

    c.showPage(); c.save()
    buf.seek(0)
    from fastapi.responses import Response
    fname = f"prisma-apresentacao-{para.replace(' ','_') if para else 'venda'}.pdf"
    return Response(content=buf.getvalue(), media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{fname}"'})



# ----------------- Startup / health -----------------
@app.on_event("startup")
async def startup():
    try:
        init_storage()
    except Exception as e:
        logging.warning(f"storage startup: {e}")
    try:
        ensure_stripe_catalog()
    except Exception as e:
        logging.warning(f"stripe catalog startup: {e}")

@api.get("/")
async def root():
    return {"ok": True, "service": "Prisma", "twilio": bool(twilio_client), "email": bool(EMAIL_KEY)}


# ----------------- Comments (tasks) + Notifications -----------------
class CommentIn(BaseModel):
    body: str
    mentions: List[Dict[str, str]] = []  # [{user_id, name}]

async def _notify(user_id: str, org_id: str, kind: str, target: Dict[str, Any], body: str):
    doc = {"notif_id": gen_id("ntf"), "user_id": user_id, "org_id": org_id, "kind": kind,
           "target": target, "body": body, "read": False, "created_at": iso(now_utc())}
    await db.notifications.insert_one(doc)

@api.get("/tasks/{task_id}/comments")
async def list_comments(task_id: str, user: dict = Depends(current_user)):
    items = await db.comments.find({"task_id": task_id, "org_id": user["org_id"]}, {"_id": 0}).sort("created_at", 1).to_list(500)
    return {"items": items}

@api.post("/tasks/{task_id}/comments")
async def create_comment(task_id: str, body: CommentIn, user: dict = Depends(current_user)):
    task = await db.tasks.find_one({"task_id": task_id, "org_id": user["org_id"]}, {"_id": 0})
    if not task: raise HTTPException(404, "Task não encontrada")
    doc = {
        "comment_id": gen_id("cmt"), "task_id": task_id, "org_id": user["org_id"],
        "author_id": user["user_id"], "author_name": user.get("name") or user.get("email", "usuário"),
        "body": body.body, "mentions": body.mentions or [],
        "created_at": iso(now_utc()),
    }
    await db.comments.insert_one(doc)
    # In-app notifications + email for mentioned users
    for m in body.mentions or []:
        uid = m.get("user_id")
        if not uid or uid == user["user_id"]: continue
        await _notify(uid, user["org_id"], "mention",
                      {"task_id": task_id, "task_title": task.get("title","")},
                      f"{doc['author_name']} mencionou você em «{task.get('title','')}»")
        mu = await db.users.find_one({"user_id": uid}, {"_id": 0})
        if mu and mu.get("email"):
            html = f"""
            <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;border:1px solid #eee;border-radius:8px">
              <div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#888">Você foi mencionado</div>
              <h2 style="margin:12px 0 4px 0">{task.get('title','')}</h2>
              <p style="color:#333"><b>{doc['author_name']}</b> escreveu:</p>
              <blockquote style="border-left:3px solid #0A0A14;padding:8px 12px;color:#333;background:#F5F1EA">{doc['body']}</blockquote>
              <p style="margin-top:20px"><a href="https://pme-all-in-one.preview.emergentagent.com/app/projetos" style="background:#0A0A14;color:#F5F1EA;padding:10px 18px;border-radius:6px;text-decoration:none">Abrir tarefa</a></p>
            </div>"""
            await send_email(mu["email"], f"Você foi mencionado em «{task.get('title','')}» • Prisma", html)
    doc.pop("_id", None)
    return doc

@api.delete("/tasks/{task_id}/comments/{comment_id}")
async def delete_comment(task_id: str, comment_id: str, user: dict = Depends(current_user)):
    c = await db.comments.find_one({"comment_id": comment_id, "task_id": task_id, "org_id": user["org_id"]}, {"_id": 0})
    if not c: raise HTTPException(404, "Comentário não encontrado")
    if c["author_id"] != user["user_id"] and user.get("role") not in ("owner", "admin"):
        raise HTTPException(403, "Sem permissão")
    await db.comments.delete_one({"comment_id": comment_id, "org_id": user["org_id"]})
    return {"ok": True}

@api.get("/notifications")
async def list_notifications(user: dict = Depends(current_user)):
    items = await db.notifications.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)
    unread = await db.notifications.count_documents({"user_id": user["user_id"], "read": False})
    return {"items": items, "unread": unread}

@api.post("/notifications/{notif_id}/read")
async def mark_read(notif_id: str, user: dict = Depends(current_user)):
    await db.notifications.update_one({"notif_id": notif_id, "user_id": user["user_id"]}, {"$set": {"read": True}})
    return {"ok": True}

@api.post("/notifications/read-all")
async def mark_all_read(user: dict = Depends(current_user)):
    await db.notifications.update_many({"user_id": user["user_id"], "read": False}, {"$set": {"read": True}})
    return {"ok": True}

@api.get("/tasks/all")
async def all_tasks(user: dict = Depends(current_user)):
    """Lista todas as tarefas da org (para views Lista/Calendário/Gantt em Projetos)."""
    items = await db.tasks.find({"org_id": user["org_id"]}, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return {"items": items}


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
