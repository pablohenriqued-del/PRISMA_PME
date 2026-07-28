"""
Núcleo IA - Plataforma modular para PMEs
FastAPI backend with:
- Emergent Google Auth
- CRM, WhatsApp (mock), Projetos, Financeiro, Documentos, Automações, Dashboards
- AI Copilot (Claude Sonnet 4.5) with SSE streaming
"""
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, Cookie
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import httpx
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Any
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

app = FastAPI(title="Núcleo IA API")
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

async def current_user(
    request: Request,
    session_token: Optional[str] = Cookie(default=None),
) -> dict:
    token = session_token
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth.split(" ", 1)[1]
    user = await get_user_from_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Não autenticado")
    return user

# ----------------- Auth (Emergent Google) -----------------
class SessionRequest(BaseModel):
    session_id: str

@api.post("/auth/session")
async def create_session(payload: SessionRequest, response: Response):
    # Exchange session_id with Emergent auth service
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

    # Upsert user
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        user_id = gen_id("user")
        org_id = gen_id("org")
        org_doc = {
            "org_id": org_id,
            "name": f"Espaço de {name.split()[0]}",
            "created_at": iso(now_utc()),
        }
        await db.orgs.insert_one(org_doc)
        user = {
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "org_id": org_id,
            "role": "owner",
            "created_at": iso(now_utc()),
        }
        await db.users.insert_one(user)
        await seed_demo_data(org_id)
    else:
        await db.users.update_one({"email": email}, {"$set": {"name": name, "picture": picture}})
        user["name"] = name
        user["picture"] = picture

    # Save session
    expires_at = now_utc() + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user["user_id"],
        "session_token": session_token,
        "expires_at": iso(expires_at),
        "created_at": iso(now_utc()),
    })

    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7 * 24 * 60 * 60,
        path="/",
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

# ----------------- Seed demo data -----------------
async def seed_demo_data(org_id: str):
    now = iso(now_utc())
    # CRM
    stages = ["Lead", "Contato Feito", "Proposta", "Negociação", "Ganho", "Perdido"]
    leads_sample = [
        ("Ana Souza", "Padaria Bella", "Lead", 4500, "ana@bella.com"),
        ("Carlos Lima", "Contabilidade CL", "Contato Feito", 12000, "cl@cl.com.br"),
        ("Beatriz Rocha", "Clínica Vida", "Proposta", 8900, "bea@vida.com"),
        ("Diego Alves", "Studio D", "Negociação", 21000, "diego@studiod.com"),
        ("Eduarda Ma", "TechFlow", "Ganho", 33000, "edu@techflow.io"),
    ]
    for name, company, stage, value, email in leads_sample:
        await db.leads.insert_one({
            "lead_id": gen_id("lead"),
            "org_id": org_id,
            "name": name, "company": company, "email": email,
            "stage": stage, "value": value, "notes": "",
            "created_at": now,
        })
    # WhatsApp mock
    chats = [
        ("Ana Souza", "+55 11 91234-5678", "Vou verificar e te retorno hoje."),
        ("Carlos Lima", "+55 21 99876-5432", "Perfeito, aguardo a proposta."),
        ("Beatriz Rocha", "+55 31 98111-2222", "Preciso da segunda via da NF."),
    ]
    for name, phone, last in chats:
        chat_id = gen_id("chat")
        await db.wa_chats.insert_one({
            "chat_id": chat_id, "org_id": org_id, "name": name, "phone": phone,
            "last_message": last, "unread": 1, "updated_at": now,
        })
        await db.wa_messages.insert_many([
            {"msg_id": gen_id("msg"), "chat_id": chat_id, "org_id": org_id,
             "direction": "in", "body": "Oi! Tudo bem?", "created_at": now},
            {"msg_id": gen_id("msg"), "chat_id": chat_id, "org_id": org_id,
             "direction": "out", "body": "Tudo ótimo, como posso ajudar?", "created_at": now},
            {"msg_id": gen_id("msg"), "chat_id": chat_id, "org_id": org_id,
             "direction": "in", "body": last, "created_at": now},
        ])
    # Projetos
    proj_id = gen_id("proj")
    await db.projects.insert_one({
        "project_id": proj_id, "org_id": org_id, "name": "Lançamento Q1",
        "description": "Sprint principal do trimestre", "created_at": now,
    })
    tasks = [
        ("Definir escopo do site", "concluido"),
        ("Design da landing", "em_progresso"),
        ("Configurar analytics", "a_fazer"),
        ("Escrever copy", "em_progresso"),
        ("Publicar campanha", "a_fazer"),
    ]
    for title, status in tasks:
        await db.tasks.insert_one({
            "task_id": gen_id("task"), "org_id": org_id, "project_id": proj_id,
            "title": title, "status": status, "assignee": "", "due_date": "",
            "created_at": now,
        })
    # Financeiro
    fin = [
        ("Assinatura mensal - Cliente A", 3500, "receita", "2026-02-01"),
        ("Assinatura mensal - Cliente B", 2800, "receita", "2026-02-03"),
        ("Consultoria - Projeto X", 12000, "receita", "2026-02-10"),
        ("Hospedagem servidor", 320, "despesa", "2026-02-05"),
        ("Ferramentas SaaS", 890, "despesa", "2026-02-07"),
        ("Marketing digital", 2400, "despesa", "2026-02-12"),
    ]
    for desc, amt, kind, dt in fin:
        await db.finance.insert_one({
            "tx_id": gen_id("tx"), "org_id": org_id, "description": desc,
            "amount": amt, "kind": kind, "date": dt, "status": "pago",
            "created_at": now,
        })
    # Documentos
    for title, kind, size in [
        ("Contrato-Cliente-A.pdf", "contrato", 245000),
        ("Proposta-TechFlow.pdf", "proposta", 180000),
        ("NF-2026-001.pdf", "fiscal", 90000),
    ]:
        await db.documents.insert_one({
            "doc_id": gen_id("doc"), "org_id": org_id, "title": title,
            "kind": kind, "size": size, "url": "", "created_at": now,
        })
    # Automations
    for name, trigger, action, active in [
        ("Boas-vindas WhatsApp", "novo_lead", "enviar_whatsapp", True),
        ("Cobrança automática", "fatura_vencida", "enviar_email", True),
        ("Follow-up 3 dias", "proposta_enviada", "criar_tarefa", False),
    ]:
        await db.automations.insert_one({
            "auto_id": gen_id("auto"), "org_id": org_id, "name": name,
            "trigger": trigger, "action": action, "active": active,
            "runs": 0, "created_at": now,
        })

# ----------------- CRM -----------------
class LeadIn(BaseModel):
    name: str
    company: str = ""
    email: str = ""
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
    return doc

class LeadStage(BaseModel):
    stage: str

@api.patch("/crm/leads/{lead_id}")
async def update_lead(lead_id: str, body: LeadStage, user: dict = Depends(current_user)):
    await db.leads.update_one(
        {"lead_id": lead_id, "org_id": user["org_id"]},
        {"$set": {"stage": body.stage}},
    )
    return {"ok": True}

@api.delete("/crm/leads/{lead_id}")
async def delete_lead(lead_id: str, user: dict = Depends(current_user)):
    await db.leads.delete_one({"lead_id": lead_id, "org_id": user["org_id"]})
    return {"ok": True}

# ----------------- WhatsApp (mock) -----------------
@api.get("/wa/chats")
async def list_chats(user: dict = Depends(current_user)):
    items = await db.wa_chats.find({"org_id": user["org_id"]}, {"_id": 0}).sort("updated_at", -1).to_list(200)
    return {"items": items}

@api.get("/wa/chats/{chat_id}/messages")
async def chat_messages(chat_id: str, user: dict = Depends(current_user)):
    items = await db.wa_messages.find(
        {"chat_id": chat_id, "org_id": user["org_id"]}, {"_id": 0}
    ).sort("created_at", 1).to_list(500)
    return {"items": items}

class MsgIn(BaseModel):
    body: str

@api.post("/wa/chats/{chat_id}/messages")
async def send_msg(chat_id: str, body: MsgIn, user: dict = Depends(current_user)):
    now = iso(now_utc())
    msg = {
        "msg_id": gen_id("msg"), "chat_id": chat_id, "org_id": user["org_id"],
        "direction": "out", "body": body.body, "created_at": now,
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
        "unread": 0, "updated_at": iso(now_utc()),
    }
    await db.wa_chats.insert_one(doc)
    doc.pop("_id", None)
    return doc

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
    items = await db.tasks.find(
        {"project_id": project_id, "org_id": user["org_id"]}, {"_id": 0}
    ).to_list(500)
    return {"items": items}

class TaskIn(BaseModel):
    title: str
    status: str = "a_fazer"
    assignee: str = ""
    due_date: str = ""

@api.post("/projects/{project_id}/tasks")
async def create_task(project_id: str, body: TaskIn, user: dict = Depends(current_user)):
    doc = body.model_dump()
    doc.update({
        "task_id": gen_id("task"), "org_id": user["org_id"],
        "project_id": project_id, "created_at": iso(now_utc()),
    })
    await db.tasks.insert_one(doc)
    doc.pop("_id", None)
    return doc

class TaskStatus(BaseModel):
    status: str

@api.patch("/tasks/{task_id}")
async def update_task(task_id: str, body: TaskStatus, user: dict = Depends(current_user)):
    await db.tasks.update_one(
        {"task_id": task_id, "org_id": user["org_id"]},
        {"$set": {"status": body.status}},
    )
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
    return doc

@api.delete("/finance/{tx_id}")
async def delete_tx(tx_id: str, user: dict = Depends(current_user)):
    await db.finance.delete_one({"tx_id": tx_id, "org_id": user["org_id"]})
    return {"ok": True}

# ----------------- Documentos -----------------
class DocIn(BaseModel):
    title: str
    kind: str = "geral"
    size: int = 0

@api.get("/documents")
async def list_docs(user: dict = Depends(current_user)):
    items = await db.documents.find({"org_id": user["org_id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return {"items": items}

@api.post("/documents")
async def create_doc(body: DocIn, user: dict = Depends(current_user)):
    doc = body.model_dump()
    doc.update({"doc_id": gen_id("doc"), "org_id": user["org_id"], "url": "", "created_at": iso(now_utc())})
    await db.documents.insert_one(doc)
    doc.pop("_id", None)
    return doc

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

class AutoToggle(BaseModel):
    active: bool

@api.patch("/automations/{auto_id}")
async def toggle_auto(auto_id: str, body: AutoToggle, user: dict = Depends(current_user)):
    await db.automations.update_one(
        {"auto_id": auto_id, "org_id": user["org_id"]},
        {"$set": {"active": body.active}},
    )
    return {"ok": True}

@api.delete("/automations/{auto_id}")
async def delete_auto(auto_id: str, user: dict = Depends(current_user)):
    await db.automations.delete_one({"auto_id": auto_id, "org_id": user["org_id"]})
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

    # Pipeline por stage
    pipeline = {}
    async for lead in db.leads.find({"org_id": org}, {"_id": 0}):
        pipeline[lead["stage"]] = pipeline.get(lead["stage"], 0) + 1

    # Receita por dia (últimos itens)
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
        "pipeline": pipeline,
        "revenue_series": revenue_series,
    }

# ----------------- IA Copilot (Claude Sonnet 4.5 streaming) -----------------
class CopilotIn(BaseModel):
    message: str
    session_id: Optional[str] = None
    context: Optional[str] = None  # module name

SYSTEM_PROMPT = """Você é o Copiloto Núcleo IA, assistente da plataforma modular para PMEs brasileiras.
Você entende de CRM, WhatsApp, Projetos, Financeiro, Documentos, Automações e Dashboards.
Responda em português (Brasil), de forma clara, objetiva, prática e amigável.
Sempre que possível ofereça próximos passos acionáveis. Use bullets curtos quando útil.
Evite jargão excessivo. Se o usuário pedir uma ação, descreva como executá-la na plataforma."""

@api.post("/copilot/chat")
async def copilot_chat(body: CopilotIn, user: dict = Depends(current_user)):
    from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone

    session_id = body.session_id or gen_id("cop")
    ctx = f"\nMódulo atual do usuário: {body.context}." if body.context else ""

    # Persist user msg
    await db.copilot_messages.insert_one({
        "msg_id": gen_id("cm"), "user_id": user["user_id"], "org_id": user["org_id"],
        "session_id": session_id, "role": "user", "content": body.message,
        "created_at": iso(now_utc()),
    })

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=SYSTEM_PROMPT + ctx,
    ).with_model("anthropic", "claude-sonnet-4-6")

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
        # Persist assistant response
        await db.copilot_messages.insert_one({
            "msg_id": gen_id("cm"), "user_id": user["user_id"], "org_id": user["org_id"],
            "session_id": session_id, "role": "assistant", "content": "".join(full),
            "created_at": iso(now_utc()),
        })
        yield "event: done\ndata: [DONE]\n\n"

    return StreamingResponse(
        event_gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
    )

@api.get("/copilot/history")
async def copilot_history(session_id: str, user: dict = Depends(current_user)):
    items = await db.copilot_messages.find(
        {"user_id": user["user_id"], "session_id": session_id}, {"_id": 0}
    ).sort("created_at", 1).to_list(500)
    return {"items": items}

# ----------------- Health -----------------
@api.get("/")
async def root():
    return {"ok": True, "service": "Núcleo IA"}

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
