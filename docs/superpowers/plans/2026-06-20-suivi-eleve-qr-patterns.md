# RetroActif — Vue élèves enrichie + QR code

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter une vue liste de tous les élèves avec patterns récurrents, et un QR code pour partager les rétroactions.

**Architecture:** La boucle élève (BouclePage, token, retro_boucles) est déjà implémentée. On extrait VueEleve de Module2_Suivi vers son propre fichier, on y ajoute une vue liste + patterns, et on ajoute le QR code dans RetroDetail.

**Tech Stack:** React 18, Vite, Supabase v2, qrcode.react (à installer), Tailwind CSS v3

---

## Contexte important avant de commencer

- `src/pages/Module2_Suivi.jsx` fait 779 lignes — contient BulletinGenerator, RetroCard, RetroDetail, VueEleve, TimelineItem
- Le composant `VueEleve` (lignes ~620–779) sera extrait dans `src/components/VueEleve.jsx`
- La table des réponses élèves s'appelle `retro_boucles` dans le code ; la migration SQL la crée sous `boucles` — discrepance connue, ne pas toucher
- Tester avec `vercel dev` (pas `vite dev`) pour que `/api/*` fonctionne
- `partage_token` est stocké sur `retro_retroactions`, pas dans une table séparée

---

## Fichiers touchés

| Action | Fichier | Rôle |
|--------|---------|------|
| Créer | `src/components/VueEleve.jsx` | Composant extrait + enrichi |
| Modifier | `src/pages/Module2_Suivi.jsx` | Supprimer VueEleve + TimelineItem, importer VueEleve |
| Modifier | `src/pages/Module2_Suivi.jsx` (RetroDetail) | Ajouter QR code |
| Modifier | `package.json` | Ajouter qrcode.react |

---

## Task 1 : Installer qrcode.react

**Files:**
- Modify: `package.json`

- [ ] **Step 1 : Installer le package**

```bash
cd projets/retroactif
npm install qrcode.react
```

- [ ] **Step 2 : Vérifier l'installation**

```bash
grep "qrcode.react" package.json
```

Attendu : `"qrcode.react": "^x.x.x"` dans dependencies.

- [ ] **Step 3 : Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add qrcode.react dependency"
```

---

## Task 2 : Extraire VueEleve dans son propre fichier

**Files:**
- Create: `src/components/VueEleve.jsx`
- Modify: `src/pages/Module2_Suivi.jsx`

- [ ] **Step 1 : Créer `src/components/VueEleve.jsx`**

Copier le contenu exact des composants VueEleve et TimelineItem de Module2_Suivi (lignes ~620–779) dans ce nouveau fichier, en ajoutant les imports nécessaires :

```jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function VueEleve({ retroactions }) {
  // ... contenu exact de la fonction VueEleve actuelle
}

function TimelineItem({ item }) {
  // ... contenu exact de TimelineItem actuel
}
```

Les deux seules modifications par rapport au code actuel :
1. Ajouter `import { useNavigate } from 'react-router-dom'` (nécessaire pour le Task 4)
2. Ajouter `export default` devant `function VueEleve`

- [ ] **Step 2 : Dans Module2_Suivi.jsx — supprimer VueEleve et TimelineItem**

Supprimer les fonctions `VueEleve` et `TimelineItem` du fichier (dernières ~160 lignes).

- [ ] **Step 3 : Dans Module2_Suivi.jsx — ajouter l'import**

En tête du fichier, ajouter :

```jsx
import VueEleve from '../components/VueEleve'
```

- [ ] **Step 4 : Vérifier que le build passe**

```bash
npx vite build
```

Attendu : aucune erreur. Si erreur d'import manquant, vérifier que `fbaUrl` est défini dans VueEleve (c'est une constante locale — la chercher dans le code original et la conserver dans le composant extrait).

- [ ] **Step 5 : Tester manuellement**

```bash
vercel dev
```

Naviguer vers /suivi → onglet "Vue Élève" → sélectionner un élève → vérifier que la timeline s'affiche comme avant.

- [ ] **Step 6 : Commit**

```bash
git add src/components/VueEleve.jsx src/pages/Module2_Suivi.jsx
git commit -m "refactor: extract VueEleve component from Module2_Suivi"
```

---

## Task 3 : Ajouter la vue liste élèves dans VueEleve

**Files:**
- Modify: `src/components/VueEleve.jsx`

L'objectif : remplacer le dropdown seul par une **vue liste** (tous les élèves en cartes) → clic → vue détail existante.

- [ ] **Step 1 : Ajouter l'état de mode et la requête des boucles en attente**

Dans `VueEleve`, ajouter après les déclarations d'état existantes :

```jsx
const [mode, setMode] = useState('liste') // 'liste' | 'detail'
const [bouclesEnAttente, setBouclesEnAttente] = useState(new Set())

useEffect(() => {
  loadBouclesEnAttente()
}, [retroactions])

async function loadBouclesEnAttente() {
  // Rétroactions ayant un token de partage
  const avecToken = retroactions.filter(r => r.partage_token)
  if (avecToken.length === 0) return

  const ids = avecToken.map(r => r.id)
  const { data } = await supabase
    .from('retro_boucles')
    .select('retroaction_id')
    .in('retroaction_id', ids)

  const fermeesIds = new Set((data ?? []).map(b => b.retroaction_id))
  // Élèves dont au moins une rétroaction avec token n'a pas encore de boucle
  const enAttente = new Set(
    avecToken
      .filter(r => !fermeesIds.has(r.id))
      .map(r => r.eleve_code)
      .filter(Boolean)
  )
  setBouclesEnAttente(enAttente)
}
```

- [ ] **Step 2 : Construire les données de la vue liste**

Juste avant le `return`, ajouter :

```jsx
// Données agrégées par élève pour la vue liste
const elevesListe = codes.map(c => {
  const retros = retroactions.filter(r => r.eleve_code === c)
  const derniere = retros[0] // déjà triées par date desc depuis Module2_Suivi
  return {
    code: c,
    nbRetros: retros.length,
    derniereDate: derniere?.created_at,
    derniereMatiere: derniere?.matiere,
    enAttente: bouclesEnAttente.has(c),
  }
})
```

- [ ] **Step 3 : Ajouter la vue liste dans le return**

Remplacer le bloc `return (...)` existant par :

```jsx
if (codes.length === 0) {
  return (
    <div className="card text-center py-12">
      <p className="text-gray-400 text-sm">Aucun code élève dans les rétroactions sauvegardées.</p>
    </div>
  )
}

if (mode === 'liste') {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">{codes.length} élève{codes.length > 1 ? 's' : ''} avec rétroactions sauvegardées</p>
      <div className="grid grid-cols-1 gap-2">
        {elevesListe.map(e => (
          <button
            key={e.code}
            onClick={() => { setCode(e.code); setMode('detail') }}
            className="card py-3 px-4 text-left hover:shadow-md transition-all cursor-pointer flex items-center gap-4"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-800">{e.code}</span>
                {e.enAttente && (
                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                    Boucle en attente
                  </span>
                )}
                {e.derniereMatiere && (
                  <span className="badge bg-blue-50 text-blue-700">{e.derniereMatiere}</span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {e.nbRetros} rétroaction{e.nbRetros > 1 ? 's' : ''} —
                dernière le {e.derniereDate
                  ? new Date(e.derniereDate).toLocaleDateString('fr-BE', { day: 'numeric', month: 'short', year: 'numeric' })
                  : '—'}
              </p>
            </div>
            <span className="text-gray-300 text-lg">›</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// mode === 'detail' : vue existante, avec bouton retour
return (
  <div className="space-y-4">
    <button
      onClick={() => setMode('liste')}
      className="text-sm text-jfb-rose hover:underline flex items-center gap-1"
    >
      ← Tous les élèves
    </button>
    {/* ... bloc existant de la vue détail, inchangé ... */}
  </div>
)
```

**Note :** le bloc existant `return (...)` (avec le select, les stats, la timeline) devient la branche `mode === 'detail'`. Il suffit de le wrapper dans `<div className="space-y-4">` avec le bouton retour ci-dessus, et de supprimer le check `if (codes.length === 0)` qui est maintenant géré avant.

- [ ] **Step 4 : Vérifier le build**

```bash
npx vite build
```

- [ ] **Step 5 : Tester manuellement**

```bash
vercel dev
```

Naviguer vers /suivi → onglet "Vue Élève" → vérifier la liste → cliquer un élève → vérifier le retour "← Tous les élèves".

- [ ] **Step 6 : Commit**

```bash
git add src/components/VueEleve.jsx
git commit -m "feat: add student list overview to VueEleve with pending boucle badges"
```

---

## Task 4 : Ajouter le panel Patterns dans la vue détail

**Files:**
- Modify: `src/components/VueEleve.jsx`

- [ ] **Step 1 : Ajouter la fonction computePatterns**

Dans `VueEleve.jsx`, ajouter cette fonction utilitaire en dehors du composant (avant `export default`) :

```jsx
const STOP_WORDS = new Set([
  'avec','dans','pour','cette','aussi','mais','donc','tout','plus','bien',
  'très','être','avoir','peut','sont','nous','vous','leur','même','dont',
  'lors','comme','sous','entre','vers','sans','après','elle','lui','ils',
  'elles','pas','sur','par','les','des','une','que','qui','est','son','ses',
  'plus','peu','trop','fait','doit','fait','dans','plus','lors','encore',
])

function computePatterns(retros) {
  const freq = {}
  retros.forEach(r => {
    if (!r.difficultes) return
    r.difficultes
      .toLowerCase()
      .split(/[\s,;.!?()]+/)
      .filter(w => w.length >= 4 && !STOP_WORDS.has(w))
      .forEach(w => { freq[w] = (freq[w] ?? 0) + 1 })
  })
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([mot, n]) => ({ mot, n }))
}
```

- [ ] **Step 2 : Calculer les patterns dans le corps du composant**

Dans `VueEleve`, juste après la ligne `const retrosEleve = retroactions.filter(r => r.eleve_code === code)` (qui est dans le corps du composant, avant les `return`), ajouter :

```jsx
const patterns = computePatterns(retrosEleve)
```

Cette ligne doit être dans le corps de la fonction, pas dans le JSX.

- [ ] **Step 3 : Afficher le panel Patterns**

Après le bloc stats existant (les 4 cartes de chiffres), ajouter :

```jsx
{patterns.length > 0 && (
  <div className="card border-l-4 border-jfb-rose space-y-2 py-3 px-4">
    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Difficultés récurrentes</p>
    <div className="flex flex-wrap gap-2">
      {patterns.map(({ mot, n }) => (
        <span key={mot} className="bg-red-50 text-red-700 text-xs px-3 py-1 rounded-full border border-red-200">
          {mot} <span className="opacity-60">×{n}</span>
        </span>
      ))}
    </div>
    <p className="text-xs text-gray-400">Termes les plus fréquents dans les champs "difficultés" — analyse locale, non exhaustive.</p>
  </div>
)}
```

- [ ] **Step 4 : Ajouter le bouton "Nouvelle rétroaction"**

Juste après le panneau Patterns, ajouter :

```jsx
<div className="flex justify-end">
  <button
    onClick={() => navigate(`/constructeur?eleve_code=${encodeURIComponent(code)}`)}
    className="text-sm text-jfb-rose border border-jfb-rose rounded-lg px-4 py-2 hover:bg-jfb-beige transition-colors"
  >
    + Nouvelle rétroaction pour {code}
  </button>
</div>
```

**Note :** `useNavigate` doit être importé depuis react-router-dom (déjà ajouté dans Task 2 Step 1). Vérifier que Module6_Constructeur ou Module1_Atelier lit le param `eleve_code` depuis l'URL — si ce n'est pas le cas, le bouton navigue quand même vers /constructeur, le paramètre sera simplement ignoré pour l'instant.

- [ ] **Step 5 : Vérifier le build**

```bash
npx vite build
```

- [ ] **Step 6 : Tester manuellement**

```bash
vercel dev
```

- Naviguer vers /suivi → Vue Élève → sélectionner un élève avec des rétroactions ayant `difficultes` renseigné → vérifier que le panel Patterns apparaît
- Cliquer "Nouvelle rétroaction pour X" → vérifier la navigation vers /constructeur

- [ ] **Step 7 : Commit**

```bash
git add src/components/VueEleve.jsx
git commit -m "feat: add recurring patterns panel and new-retro button to VueEleve"
```

---

## Task 5 : Ajouter le QR code dans RetroDetail

**Files:**
- Modify: `src/pages/Module2_Suivi.jsx`

- [ ] **Step 1 : Importer QRCodeSVG dans Module2_Suivi.jsx**

En tête de Module2_Suivi.jsx, ajouter :

```jsx
import { QRCodeSVG } from 'qrcode.react'
```

- [ ] **Step 2 : Ajouter l'état showQr dans RetroDetail**

Dans la fonction `RetroDetail`, ajouter avec les autres états :

```jsx
const [showQr, setShowQr] = useState(false)
```

- [ ] **Step 3 : Remplacer le bloc de partage existant**

Dans RetroDetail, trouver le bloc qui affiche le lien et le bouton Copier (autour de la ligne contenant `shareUrl`). Remplacer uniquement la partie `<div className="flex gap-2">` contenant l'input + bouton Copier par :

```jsx
<div className="space-y-2">
  <div className="flex gap-2">
    <input
      readOnly
      value={shareUrl}
      className="input text-xs flex-1 bg-white font-mono"
    />
    <button
      className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
        copied ? 'bg-green-50 border-green-300 text-green-700' : 'btn-secondary'
      }`}
      onClick={copyLink}
    >
      {copied ? '✓' : 'Copier'}
    </button>
    <button
      className="text-xs px-3 py-1.5 rounded-lg border btn-secondary"
      onClick={() => setShowQr(v => !v)}
    >
      QR
    </button>
  </div>

  {showQr && (
    <div className="flex justify-center py-3">
      <QRCodeSVG
        value={shareUrl}
        size={160}
        bgColor="#faf9f7"
        fgColor="#1a1a1a"
        level="M"
      />
    </div>
  )}

  <p className="text-xs text-gray-400">
    Partage ce lien ou ce QR à l'élève — il peut lire la rétroaction et répondre sans connexion.
  </p>
</div>
```

- [ ] **Step 4 : Vérifier le build**

```bash
npx vite build
```

- [ ] **Step 5 : Tester manuellement**

```bash
vercel dev
```

- Naviguer vers /suivi → Historique → cliquer une rétroaction → panneau "Fermer la boucle" → générer un lien → cliquer "QR" → vérifier que le QR apparaît/disparaît
- Scanner le QR avec un téléphone → vérifier qu'il mène à la bonne BouclePage

- [ ] **Step 6 : Commit**

```bash
git add src/pages/Module2_Suivi.jsx
git commit -m "feat: add QR code toggle in RetroDetail share panel"
```

---

## Task 6 : Build final + push

- [ ] **Step 1 : Build de production**

```bash
npx vite build
```

Attendu : aucune erreur, aucun warning critique.

- [ ] **Step 2 : Push**

```bash
git push origin main
```

Attendu : déploiement Vercel déclenché automatiquement.

- [ ] **Step 3 : Vérifier sur la version déployée**

Sur l'URL Vercel de production :
- /suivi → Vue Élève → liste de tous les élèves visible
- Cliquer un élève → timeline + patterns + bouton "Nouvelle rétroaction"
- /suivi → Historique → une rétroaction avec lien partagé → bouton QR visible

---

## Notes de vérification

**fbaUrl dans VueEleve** : le composant actuel référence une constante `fbaUrl` (lien vers FEED-BACK ADAPT). Elle est définie dans le composant original — la conserver telle quelle dans le fichier extrait.

**Lecture de eleve_code depuis l'URL dans le Constructeur** : le bouton "Nouvelle rétroaction" passe `?eleve_code=XX` mais le Constructeur/Atelier ne lit peut-être pas ce paramètre. C'est acceptable pour cette version — le paramètre est ignoré s'il n'est pas lu. Ne pas modifier le Constructeur dans ce plan.

**Table retro_boucles vs boucles** : le code utilise `retro_boucles`, la migration SQL crée `boucles`. Ne pas modifier — l'app fonctionne en production avec la table existante.
