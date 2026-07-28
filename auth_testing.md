# Auth Testing Playbook — Núcleo IA

## Step 1: Session already created
- User: `test.user@example.com` (Usuario Teste, org `org-1785228939986`, role owner)
- Session token: `test_session_1785228939986` (7-day expiry, JSON-serialized ISO string)
- Backend accepts both `Authorization: Bearer <token>` and `session_token` cookie.

## Step 2: Backend curl checks
```
API=https://pme-all-in-one.preview.emergentagent.com/api
TOKEN=test_session_1785228939986

curl -H "Authorization: Bearer $TOKEN" $API/auth/me
curl -H "Authorization: Bearer $TOKEN" $API/dashboard/overview
curl -H "Authorization: Bearer $TOKEN" $API/crm/leads
curl -H "Authorization: Bearer $TOKEN" $API/wa/chats
curl -H "Authorization: Bearer $TOKEN" $API/finance
curl -H "Authorization: Bearer $TOKEN" $API/documents
curl -H "Authorization: Bearer $TOKEN" $API/automations
curl -H "Authorization: Bearer $TOKEN" $API/projects
```

## Step 3: Browser (Playwright)
```python
await page.context.add_cookies([{
    "name": "session_token",
    "value": "test_session_1785228939986",
    "domain": "pme-all-in-one.preview.emergentagent.com",
    "path": "/",
    "httpOnly": True,
    "secure": True,
    "sameSite": "None"
}])
await page.goto("https://pme-all-in-one.preview.emergentagent.com/app")
```

Checklist:
- [ ] `/api/auth/me` returns user data
- [ ] `/app` (dashboard) loads WITHOUT redirect to `/login`
- [ ] KPIs render (data-testid="kpi-grid")
- [ ] Sidebar navigation works (data-testid="nav-crm", "nav-whatsapp"...)
- [ ] CRM kanban shows leads with drag columns (data-testid="col-Lead")
- [ ] WhatsApp inbox lists chats (data-testid="wa-chat-*")
- [ ] Copilot panel opens (⌘I or top button, data-testid="open-copilot-top")
- [ ] Copilot streams response for a message (SSE)
- [ ] Command palette opens with ⌘K (data-testid="open-command-palette")

Failure indicators:
- ❌ 401 on /auth/me (session doc missing or expired)
- ❌ Empty seed lists (data not associated with org_id `org-1785228939986`)
