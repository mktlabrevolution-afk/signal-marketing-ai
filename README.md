# Signal — Marketing AI Suite

**34 skills de marketing con IA** para marketers independientes y freelancers.

Stack: HTML/CSS/JS estático + Vercel Edge Function (proxy a Anthropic API).

## Stack

```
public/index.html   ← Frontend completo (34 skills)
api/chat.js         ← Edge Function proxy → Anthropic API
vercel.json         ← Config de Vercel
```

## Deploy en Vercel (5 minutos)

### 1. Fork / subir a GitHub

```bash
git init
git add .
git commit -m "Signal v0.7 — 34 skills"
git remote add origin https://github.com/tu-usuario/signal-marketing-ai.git
git push -u origin main
```

### 2. Conectar en Vercel

1. Ir a [vercel.com](https://vercel.com) → **New Project**
2. Importar el repo de GitHub
3. Framework: **Other** (no Next.js, no nada)
4. Root Directory: `/` (dejar por defecto)
5. Click **Deploy**

### 3. Agregar la API Key de Anthropic

En el proyecto de Vercel:
**Settings → Environment Variables → Add**

```
Name:   ANTHROPIC_API_KEY
Value:  sk-ant-api03-...
```

Luego: **Deployments → Redeploy** (para que tome la variable).

### 4. Listo ✓

La app queda en `https://tu-proyecto.vercel.app`

---

## Desarrollo local

```bash
npm install
cp .env.example .env.local
# Editar .env.local con tu API key real

npx vercel dev
# Abre http://localhost:3000
```

---

## Skills incluidos (v0.7)

| Categoría | Skills |
|-----------|--------|
| CRO | page-cro · signup-flow-cro · onboarding-cro · paywall-cro · marketing-psychology |
| Copy | copywriting · email-sequence · content-writer |
| SEO / GEO | ai-seo · geo-score · competitor-alternatives · programmatic-seo · link-building |
| Growth | free-tool-strategy · referral-program · ad-creative · analytics-tracking · ab-test-setup |
| Strategy | pricing-strategy · launch-strategy · churn-prevention · cold-email · marketing-ideas |
| Agency (ADK) | domain-ideas · website-builder · gtm-strategy |
| Community | reddit-strategy · hacker-news · x-twitter |
| Paid / Audits | paid-ads · seo-audit · core-vitals |

---

## Seguridad

- La API key **nunca toca el frontend** — vive solo en las env vars de Vercel
- El Edge Function actúa como proxy: recibe el payload del browser, le agrega la key, y reenvía a Anthropic
- El streaming funciona transparentemente (la response se pasa byte a byte al browser)

---

## Próximas features

- [ ] Historial de outputs por proyecto
- [ ] Multi-proyecto (un contexto por cliente)
- [ ] Export de outputs como PDF/DOCX
- [ ] Autenticación básica para compartir con equipo
