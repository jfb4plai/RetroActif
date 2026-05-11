# RetroActif — Guide de déploiement

## Stack
- React + Vite → Vercel
- Supabase (Auth + PostgreSQL)
- Claude Haiku API (Anthropic) via Vercel Serverless Function

---

## 1. Supabase

1. Créer un projet sur [supabase.com](https://supabase.com)
2. Dans **SQL Editor**, coller et exécuter le contenu de `supabase/schema.sql`
3. Dans **Project Settings → API**, récupérer :
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` key → `VITE_SUPABASE_ANON_KEY`

---

## 2. Anthropic API

1. Récupérer votre clé API sur [console.anthropic.com](https://console.anthropic.com)
2. Cette clé ira dans les variables d'environnement Vercel (jamais dans le code)

---

## 3. GitHub

```bash
cd retroactif
git init
git add .
git commit -m "Initial commit — RetroActif"
git remote add origin https://github.com/VOTRE-COMPTE/retroactif.git
git push -u origin main
```

---

## 4. Vercel

1. Aller sur [vercel.com](https://vercel.com) → **Add New Project**
2. Importer le repo GitHub `retroactif`
3. Framework : **Vite**
4. Dans **Environment Variables**, ajouter :

| Nom | Valeur |
|-----|--------|
| `VITE_SUPABASE_URL` | `https://xxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...` |
| `ANTHROPIC_API_KEY` | `sk-ant-...` |

5. Cliquer **Deploy**

---

## 5. Supabase Auth — URL de redirection

Dans Supabase → **Authentication → URL Configuration** :
- Site URL : `https://votre-app.vercel.app`
- Redirect URLs : `https://votre-app.vercel.app/**`

---

## Structure des fichiers clés

```
retroactif/
├── api/
│   └── generate.js          ← Vercel Serverless — Claude Haiku (clé sécurisée)
├── src/
│   ├── contexts/AuthContext.jsx
│   ├── lib/
│   │   ├── supabase.js
│   │   └── constants.js
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Onboarding.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Module1_Atelier.jsx      ← Logigramme interactif
│   │   ├── Module2_Suivi.jsx        ← Historique + Bulletins
│   │   ├── Module3_Dialogue.jsx     ← Dialogue apprenant
│   │   ├── Module4_Bibliotheque.jsx ← Exemples + Mes rétroactions
│   │   ├── Module5_Progression.jsx  ← 4 dimensions Carless & Boud
│   │   └── Module6_Constructeur.jsx ← Constructeur 80/20 (CŒUR)
│   └── App.jsx
├── supabase/schema.sql
└── vercel.json
```

---

## Références scientifiques intégrées dans l'app

### Validées dans le corpus RISS
- **hal-04621117** — Soubre et al. (2023) *L'évaluation en tant que soutien d'apprentissage* ✓
- **W4312178522** — LeBouthillier & Bourgoin (2022) *Évaluation formative et rétroaction* ✓
- **hal-05348650** — Virouleau et al. (2025) *Rétroaction audio en mathématiques* ✓
- **dumas-03633872** — Peter (2021) *Technologies et évaluation formative* ✓
- **dumas-05324645** — Altinsoy (2025) *Autorégulation et métacognition* ✓
- **tel-04860619** — De Khovrine (2023) *Coévaluation instrumentée* ✓

### Réelles, hors corpus RISS
- Carless & Boud (2018) — 4 dimensions de la littératie à la rétroaction
- Hattie & Timperley (2007) — Effet d=0,70 de la rétroaction
- Kluger & DeNisi (1996) — Rétroaction tâche vs personne
- Nicol & Macfarlane-Dick (2006) — 7 principes du bon feedback
- Sadler (1989) — Critères et actionnabilité
- Black et al. (2004) — "Two stars and a wish"
- Weidlich, Rabin & Tsovaltzi (2025) — SFLI-S
- Zimmerman (2002) — Autorégulation
