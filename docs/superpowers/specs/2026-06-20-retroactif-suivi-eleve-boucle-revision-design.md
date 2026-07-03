# Design — RetroActif : suivi longitudinal élève + boucle de révision

**Date :** 2026-06-20  
**App :** RetroActif  
**Périmètre :** Vue longitudinale élève (A) + Boucle de révision élève-facing (B)  
**Approche retenue :** Approche 2 — nouveaux modules dans le codebase existant

---

## Contexte

RetroActif stocke des rétroactions par `eleve_code` mais ne les agrège jamais par élève dans le temps — l'enseignant ne peut pas voir les patterns récurrents d'un élève. Par ailleurs, le feedback va de l'enseignant vers l'élève et s'arrête là : l'élève n'a pas de mécanisme pour signaler ce qu'il a révisé ni pour interagir avec son feedback dans le temps de travail.

Ces deux angles morts ont été identifiés lors d'une analyse comparative, mais les fonctionnalités conçues ici sont propres au contexte PLAI/FWB : pas d'audio, pas d'auto-correction, pas de score — le split 80/20 et l'ancrage DYS/TDAH restent au centre.

---

## Architecture générale

### Nouveaux fichiers

```
src/pages/
  Module2b_Eleves.jsx     — vue enseignant par élève (A)
  BouclePage.jsx          — vue élève publique sans auth (B)

api/
  boucle.js               — endpoint serverless (GET token, POST révisions, POST génération)

supabase/
  migration-boucle.sql    — nouvelle table retro_boucles
```

### Fichiers modifiés

- `src/App.jsx` — ajout route `/boucle/:token` (publique) + lien Module2b dans nav
- `src/pages/Module2_Suivi.jsx` — ajout bouton "Partager" + modale QR + affichage statut révision

### Ce qui ne change pas

Tables Supabase existantes, auth, Modules 1/3/4/5/6/7, DiffActif, EvalActif.

---

## Nouvelle table Supabase — `retro_boucles`

```sql
create table retro_boucles (
  id              uuid primary key default uuid_generate_v4(),
  token           uuid unique default uuid_generate_v4(),
  retroaction_id  uuid references retro_retroactions(id) on delete cascade,
  user_id         uuid references auth.users(id) on delete cascade,
  expires_at      timestamptz default (now() + interval '14 days'),
  revisions       jsonb default '[]',   -- [{item: string, fait_le: ISO string}]
  created_at      timestamptz default now()
);
-- Pas de RLS direct : accès élève via serverless + SUPABASE_SERVICE_KEY uniquement
```

---

## Module2b_Eleves — Vue enseignant par élève

### Accès
Lien "Mes élèves" dans la nav, entre Module2_Suivi et Module3_Dialogue.

### Vue liste

Requête : toutes `retro_retroactions` de l'enseignant, groupées par `eleve_code` côté client.

Chaque carte élève :
- Code élève
- Nombre de rétroactions (ce trimestre / total)
- Date de la dernière rétroaction
- Difficulté la plus récurrente (tag texte)
- Badge "Révision en attente" si boucle partagée non complétée

Tri : activité récente en premier. Filtre : période (trim1/trim2/trim3).

### Vue détail élève

**Timeline** : rétroactions chronologiques avec date, type, difficultés, statut suivi.

**Panneau Patterns** — agrégation locale, sans appel IA :
- 3 mots/expressions les plus fréquents dans `difficultes` pour cet élève
- Dimension Carless & Boud la plus sollicitée
- Ratio suivis prévus vs réalisés

**Bouton** : "Nouvelle rétroaction pour cet élève" → Module1_Atelier avec `eleve_code` pré-rempli.

### Ce que ce module ne fait pas
- Pas d'IA, pas de score, pas de notation
- Pas de vue partageable avec l'élève

---

## BouclePage — Vue élève publique `/boucle/:token`

### Génération

Dans Module2_Suivi, bouton "Partager à l'élève" sur chaque rétroaction sauvegardée.  
Appel POST `/api/boucle` avec JWT enseignant → crée `retro_boucles` → retourne token + URL.

Modale affiche :
- URL copiable
- QR code (`qrcode.react`, client-side)
- Date d'expiration (14 jours)
- Bouton "Régénérer" si expiré

### Affichage feedback (adapté DYS)

- Police Inter 18px min, interligne 1.6, fond `#faf9f7`
- Bloc "Ce qui fonctionne bien" (points_forts)
- Bloc "Ce sur quoi travailler" (difficultes)
- Texte final complet (texte_final)

### Checklist de révision

Items générés depuis `difficultes` (split sur sauts de ligne / tirets).  
Chaque item : case à cocher + libellé court.  
Cochée → fond vert léger + texte barré.

### Soumission

Bouton "J'ai terminé mes révisions" actif dès 1 case cochée.  
POST `/api/boucle` → `{token, revisions: [{item, fait_le}]}`.  
Confirmation : "Tes révisions ont été transmises à ton enseignant."

### Ce que l'élève ne voit pas
`user_id`, `eleve_code`, nom enseignant, métadonnées, autres élèves.

---

## `/api/boucle.js` — Endpoint serverless

### GET `?token=xxx` (élève)

Vérifie existence + non-expiration du token.  
Retourne uniquement : `points_forts`, `difficultes`, `texte_final`, `revisions`, `expires_at`.  
Token invalide/expiré → 404 + "Ce lien n'est plus valide."

### POST révisions (élève)

Body : `{ token, revisions: [{item, fait_le}] }`  
Vérifie token valide → écrase `retro_boucles.revisions`.  
Retourne : `{ ok: true }`.

### POST génération token (enseignant authentifié)

Body : `{ retroaction_id }`, header Authorization JWT Supabase.  
Vérifie que la rétroaction appartient à l'enseignant → crée entrée `retro_boucles`.  
Retourne : `{ url, token, expires_at }`.

**Sécurité** : `SUPABASE_SERVICE_KEY` côté serveur uniquement. Jamais exposée au client.

---

## Séquençage d'implémentation

### Phase 1 — Module2b_Eleves

1. Migration SQL `retro_boucles`
2. `Module2b_Eleves.jsx` (liste + détail)
3. Lien nav + route App.jsx

### Phase 2 — Boucle élève

1. `api/boucle.js` (GET + POST révisions + POST génération)
2. `BouclePage.jsx` (route publique `/boucle/:token`)
3. Bouton "Partager" + modale QR dans Module2_Suivi
4. Affichage statut révision dans Module2_Suivi + Module2b_Eleves

Phase 1 livrable et utilisable sans Phase 2. Migration SQL commune — à faire une seule fois.

---

## Hors périmètre

- DiffActif, EvalActif
- Modification de l'auth Supabase
- Nouveau domaine Vercel
- Audio (écarté : RGPD, contexte DYS/TDAH, contraintes matérielles FWB)
