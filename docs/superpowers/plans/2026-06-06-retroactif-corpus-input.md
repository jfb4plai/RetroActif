# RetroActif — Corpus Input Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un chemin d'entrée "corpus" dans Module6_Constructeur permettant à l'enseignant d'uploader la production de l'élève et/ou l'énoncé, l'IA extrayant les champs du formulaire automatiquement.

**Architecture:** Nouvel écran `entry` au sommet de Module6_Constructeur avec deux chemins : A (formulaire manuel existant, inchangé) et B (corpus → extraction IA → préremplit le formulaire). Le `prefill` existant est réutilisé tel quel comme interface entre l'extraction et les modes. La lib `extractFile` et la route `/api/extract` sont copiées de DiffActif sans modification.

**Tech Stack:** React 18 + Vite, Vercel Serverless Functions, Claude Haiku (`claude-haiku-4-5-20251001`), `pdfjs-dist`, `mammoth`, lib `extractFile` (DiffActif)

---

## Fichiers touchés

| Fichier | Action |
|---------|--------|
| `package.json` | Ajouter `pdfjs-dist`, `mammoth` |
| `src/lib/extractFile.js` | Créer (copie DiffActif) |
| `api/extract.js` | Créer (copie DiffActif) |
| `api/generate.js` | Modifier — ajouter action `extract_corpus` |
| `src/pages/Module6_Constructeur.jsx` | Modifier — ajouter écrans `entry`, `corpus`, `extraction` |

---

## Task 1 : Installer les dépendances

**Files:**
- Modify: `package.json`

- [ ] **Étape 1 : Ajouter pdfjs-dist et mammoth**

```bash
cd projets/retroactif
npm install pdfjs-dist mammoth
```

- [ ] **Étape 2 : Vérifier que le build ne régresse pas**

```bash
npm run build
```
Résultat attendu : `✓ built in Xs` sans erreur.

- [ ] **Étape 3 : Commiter**

```bash
git add package.json package-lock.json
git commit -m "deps: add pdfjs-dist and mammoth for corpus extraction"
```

---

## Task 2 : Copier extractFile.js depuis DiffActif

**Files:**
- Create: `src/lib/extractFile.js`

- [ ] **Étape 1 : Copier le fichier**

Copier `projets/diffactif/src/lib/extractFile.js` vers `projets/retroactif/src/lib/extractFile.js` sans modification. Le fichier appelle `/api/extract` qui sera créé en Task 3.

- [ ] **Étape 2 : Vérifier le build**

```bash
npm run build
```
Résultat attendu : build OK (le fichier n'est pas encore importé, donc aucun effet).

- [ ] **Étape 3 : Commiter**

```bash
git add src/lib/extractFile.js
git commit -m "feat: add extractFile lib (from DiffActif)"
```

---

## Task 3 : Copier api/extract.js depuis DiffActif

**Files:**
- Create: `api/extract.js`

- [ ] **Étape 1 : Copier le fichier**

Copier `projets/diffactif/api/extract.js` vers `projets/retroactif/api/extract.js` sans modification. C'est le pipeline OCR Vision en 4 étapes (Sonnet Vision → Haiku vérification → Haiku résolution → Haiku validation).

- [ ] **Étape 2 : Tester la route en local**

```bash
vercel dev
```

Dans un autre terminal :
```bash
curl -s -X POST http://localhost:3000/api/extract \
  -H "Content-Type: application/json" \
  -d '{"images":[]}' | jq .
```
Résultat attendu : `{"error":"images[] requis"}`

- [ ] **Étape 3 : Commiter**

```bash
git add api/extract.js
git commit -m "feat: add OCR extract route (from DiffActif)"
```

---

## Task 4 : Ajouter l'action `extract_corpus` dans api/generate.js

**Files:**
- Modify: `api/generate.js`

- [ ] **Étape 1 : Ajouter le cas dans `buildSystemPrompt`**

Dans la fonction `buildSystemPrompt`, après le dernier bloc `if (action === ...)`, ajouter avant le `return` final :

```js
  if (action === 'extract_corpus') {
    return `Tu es un conseiller pédagogique FWB. Tu analyses des documents scolaires (productions élèves, énoncés) pour en extraire les informations pédagogiques clés.
Règles absolues :
- Si un champ ne peut pas être extrait avec certitude, retourne une chaîne vide "" pour ce champ — jamais d'invention.
- Retourne UNIQUEMENT un objet JSON valide, sans texte avant ni après, sans balises markdown.
- Langue : français, registre professionnel enseignant.`
  }
```

- [ ] **Étape 2 : Ajouter le cas dans `buildUserMessage`**

Dans la fonction `buildUserMessage`, après le dernier bloc `if (action === ...)`, ajouter avant le `return` final :

```js
  if (action === 'extract_corpus') {
    const parts = []
    if (context.corpus_eleve?.trim()) {
      parts.push(`<production_eleve>\n${context.corpus_eleve.trim()}\n</production_eleve>`)
    }
    if (context.corpus_enonce?.trim()) {
      parts.push(`<enonce_enseignant>\n${context.corpus_enonce.trim()}\n</enonce_enseignant>`)
    }
    return `Analyse ces documents et retourne un objet JSON avec exactement ces 5 champs :
{
  "tache": "description courte de la tâche demandée à l'élève (1-2 phrases)",
  "points_forts": "ce qui est réussi dans la production (1-3 points, phrases courtes)",
  "points_faibles": "ce qui pose problème ou doit être amélioré (1-3 points, phrases courtes)",
  "niveau_suggere": "une valeur parmi : cycle2, cycle3, cycle4, lycee, post_bac — ou chaîne vide",
  "matiere_suggeree": "nom de la matière ou chaîne vide"
}

${parts.join('\n\n')}`
  }
```

- [ ] **Étape 3 : Ajuster max_tokens pour `extract_corpus`**

Modifier la ligne `max_tokens` dans le handler pour inclure `extract_corpus` :

```js
max_tokens: action === 'bulletin' ? 1200 : action === 'ameliorer' ? 600 : action === 'extract_corpus' ? 400 : 800,
```

- [ ] **Étape 4 : Tester la route en local**

```bash
vercel dev
```

Dans un autre terminal :
```bash
curl -s -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "action": "extract_corpus",
    "context": {
      "corpus_eleve": "Mon texte parle des animaux. Les animaux sont importants.",
      "corpus_enonce": "Exercice 1 : Écris un texte argumentatif de 10 lignes sur les animaux."
    }
  }' | jq .
```
Résultat attendu : `{"text": "{\"tache\":\"...\",\"points_forts\":\"...\",\"points_faibles\":\"...\",\"niveau_suggere\":\"...\",\"matiere_suggeree\":\"...\"}"}`

- [ ] **Étape 5 : Commiter**

```bash
git add api/generate.js
git commit -m "feat: add extract_corpus action to generate API"
```

---

## Task 5 : Ajouter les écrans entry/corpus/extraction dans Module6_Constructeur

**Files:**
- Modify: `src/pages/Module6_Constructeur.jsx`

### Étape 1 : Ajouter l'import extractFile

- [ ] En haut du fichier, après les imports existants, ajouter :

```js
import { extractFile } from '../lib/extractFile'
```

### Étape 2 : Modifier le composant principal pour gérer les nouveaux écrans

- [ ] Localiser le composant `Module6_Constructeur` (ligne ~35). Modifier son contenu pour ajouter le state `screen` et les trois nouveaux écrans :

```jsx
export default function Module6_Constructeur() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [prefill, setPrefill] = useState(null)
  const [screen, setScreen] = useState('entry')

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const handoffId = params.get('handoff')
    if (!handoffId) return

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      fetch(`/api/handoff-read?id=${handoffId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data) {
            setPrefill(data)
            setScreen('main')
          }
        })
        .catch(() => {})
    })
  }, [location.search])

  const [mode, setMode] = useState(profile?.niveau_maitrise ?? 'debutant')

  const handleCorpusPrefill = (extracted) => {
    setPrefill(extracted)
    setScreen('main')
  }

  if (screen === 'entry') {
    return (
      <ScreenEntry
        onManual={() => setScreen('main')}
        onCorpus={() => setScreen('corpus')}
      />
    )
  }
  if (screen === 'corpus') {
    return (
      <ScreenCorpus
        onBack={() => setScreen('entry')}
        onExtracted={handleCorpusPrefill}
      />
    )
  }

  // screen === 'main' — flux existant inchangé
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* ... contenu existant inchangé ... */}
    </div>
  )
}
```

**Important :** conserver tout le contenu existant du `return` final (sélecteur de mode + les 3 modes). Seul le bloc `useEffect` et le début du composant changent.

### Étape 3 : Ajouter le composant ScreenEntry

- [ ] Ajouter avant la définition de `ModeDebutant` :

```jsx
function ScreenEntry({ onManual, onCorpus }) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Constructeur de rétroaction</h1>
      <p className="text-gray-500 mb-8">Comment souhaitez-vous commencer ?</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={onCorpus}
          className="flex flex-col gap-2 p-6 rounded-xl border-2 border-teal-500 bg-teal-50 text-left hover:bg-teal-100 transition"
        >
          <span className="text-2xl">📄</span>
          <span className="font-semibold text-gray-900">Importer des documents</span>
          <span className="text-sm text-gray-600">
            Déposez la production de l'élève et/ou l'énoncé. L'IA pré-remplit le formulaire à partir de vos documents.
          </span>
        </button>
        <button
          onClick={onManual}
          className="flex flex-col gap-2 p-6 rounded-xl border-2 border-gray-200 bg-white text-left hover:bg-gray-50 transition"
        >
          <span className="text-2xl">✏️</span>
          <span className="font-semibold text-gray-900">Saisir manuellement</span>
          <span className="text-sm text-gray-600">
            Remplissez le formulaire étape par étape, sans document.
          </span>
        </button>
      </div>
    </div>
  )
}
```

### Étape 4 : Ajouter le composant ScreenCorpus

- [ ] Ajouter après `ScreenEntry` :

```jsx
function ScreenCorpus({ onBack, onExtracted }) {
  const [eleveText, setEleveText] = useState('')
  const [eleveFiles, setEleveFiles] = useState([])
  const [enoncéText, setEnoncéText] = useState('')
  const [enoncéFiles, setEnoncéFiles] = useState([])
  const [extracting, setExtracting] = useState(false)
  const [error, setError] = useState('')
  const [fileErrors, setFileErrors] = useState({ eleve: '', enonce: '' })

  const hasContent = eleveText.trim() || eleveFiles.length > 0 || enoncéText.trim() || enoncéFiles.length > 0

  const handleFileAdd = async (files, zone) => {
    const setter = zone === 'eleve' ? setEleveFiles : setEnoncéFiles
    const errSetter = (msg) => setFileErrors(prev => ({ ...prev, [zone]: msg }))
    errSetter('')
    for (const file of files) {
      try {
        await extractFile(file) // validation précoce
        setter(prev => [...prev, file])
      } catch (e) {
        errSetter(e.message)
      }
    }
  }

  const handleExtract = async () => {
    setExtracting(true)
    setError('')
    try {
      // Extraire texte de tous les fichiers
      const extractTexts = async (files) => {
        const texts = []
        for (const f of files) {
          const { text } = await extractFile(f)
          if (text?.trim()) texts.push(text.trim())
        }
        return texts.join('\n\n')
      }

      const [eleveExtracted, enoncéExtracted] = await Promise.all([
        extractTexts(eleveFiles),
        extractTexts(enoncéFiles),
      ])

      const corpus_eleve = [eleveText.trim(), eleveExtracted].filter(Boolean).join('\n\n')
      const corpus_enonce = [enoncéText.trim(), enoncéExtracted].filter(Boolean).join('\n\n')

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'extract_corpus', context: { corpus_eleve, corpus_enonce } }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur serveur')

      let extracted
      try {
        extracted = JSON.parse(data.text)
      } catch {
        throw new Error('Réponse IA invalide — réessayez.')
      }

      onExtracted({
        tache: extracted.tache ?? '',
        points_forts: extracted.points_forts ?? '',
        points_faibles: extracted.points_faibles ?? '',
        niveau: extracted.niveau_suggere ?? '',
        matiere: extracted.matiere_suggeree ?? '',
      })
    } catch (e) {
      setError(e.message)
    } finally {
      setExtracting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <button className="text-sm text-gray-500 hover:text-gray-800 mb-6" onClick={onBack}>← Retour</button>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Importer des documents</h1>

      <div className="space-y-6">
        <CorpusZone
          label="Production de l'élève"
          hint="Copie, exercice rendu, production écrite ou orale"
          text={eleveText}
          onTextChange={setEleveText}
          files={eleveFiles}
          onFilesAdd={(f) => handleFileAdd(f, 'eleve')}
          onFileRemove={(i) => setEleveFiles(prev => prev.filter((_, idx) => idx !== i))}
          fileError={fileErrors.eleve}
        />
        <CorpusZone
          label="Énoncé / activité"
          hint="Ce que vous avez donné aux élèves"
          text={enoncéText}
          onTextChange={setEnoncéText}
          files={enoncéFiles}
          onFilesAdd={(f) => handleFileAdd(f, 'enonce')}
          onFileRemove={(i) => setEnoncéFiles(prev => prev.filter((_, idx) => idx !== i))}
          fileError={fileErrors.enonce}
        />
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-8 flex justify-end">
        <button
          className="btn-primary"
          disabled={!hasContent || extracting}
          onClick={handleExtract}
        >
          {extracting ? 'Extraction en cours…' : 'Extraire →'}
        </button>
      </div>
    </div>
  )
}
```

### Étape 5 : Ajouter le composant CorpusZone (zone de dépôt réutilisable)

- [ ] Ajouter après `ScreenCorpus` :

```jsx
function CorpusZone({ label, hint, text, onTextChange, files, onFilesAdd, onFileRemove, fileError }) {
  const inputRef = useRef(null)

  const handleDrop = (e) => {
    e.preventDefault()
    onFilesAdd(Array.from(e.dataTransfer.files))
  }

  return (
    <div className="rounded-xl border border-gray-200 p-4 space-y-3">
      <div>
        <p className="font-medium text-gray-800">{label}</p>
        <p className="text-xs text-gray-500">{hint}</p>
      </div>

      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-teal-400 transition"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <p className="text-sm text-gray-500">Glissez vos fichiers ici ou cliquez</p>
        <p className="text-xs text-gray-400 mt-1">.pdf · .docx · .odt · .txt · .jpg · .png</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.odt,.txt,.jpg,.jpeg,.png"
          className="hidden"
          onChange={(e) => onFilesAdd(Array.from(e.target.files))}
        />
      </div>

      {fileError && <p className="text-xs text-red-600">{fileError}</p>}

      {files.length > 0 && (
        <ul className="space-y-1">
          {files.map((f, i) => (
            <li key={i} className="flex items-center justify-between text-sm text-gray-700 bg-gray-50 rounded px-3 py-1">
              <span className="truncate">{f.name}</span>
              <button className="text-gray-400 hover:text-red-500 ml-2" onClick={() => onFileRemove(i)}>✕</button>
            </li>
          ))}
        </ul>
      )}

      <textarea
        className="input w-full min-h-[80px] resize-y text-sm"
        placeholder="ou collez le texte ici…"
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
      />
    </div>
  )
}
```

### Étape 6 : Ajouter l'import useRef manquant

- [ ] Vérifier que `useRef` est dans l'import React en haut du fichier :

```js
import { useState, useEffect, useRef } from 'react'
```

### Étape 7 : Tester manuellement le chemin B complet

- [ ] Lancer `vercel dev`
- [ ] Naviguer vers Module 6
- [ ] Vérifier que l'écran `entry` s'affiche avec deux cartes
- [ ] Cliquer "Importer des documents" → vérifier `ScreenCorpus`
- [ ] Coller un texte dans "Production de l'élève" → bouton "Extraire" devient actif
- [ ] Lancer l'extraction → vérifier que le formulaire arrive pré-rempli
- [ ] Cliquer "Saisir manuellement" → vérifier que le flux existant est inchangé (pas de régression)

### Étape 8 : Commiter

- [ ] 
```bash
git add src/pages/Module6_Constructeur.jsx src/lib/extractFile.js
git commit -m "feat: add corpus input path to Module6 Constructeur"
```

---

## Task 6 : Push et vérification Vercel

- [ ] **Push sur main**

```bash
git push origin main
```

- [ ] **Vérifier le déploiement**

Sur le dashboard Vercel : build OK, pas d'erreur de compilation.

- [ ] **Tester en production**

Sur `retroactif.jfb4plai.com/module6` :
- Écran entry visible
- Chemin corpus fonctionnel avec un vrai fichier PDF
- Chemin manuel : aucune régression

---

## Checklist de self-review

- [x] `pdfjs-dist` et `mammoth` installés avant l'import de `extractFile`
- [x] `api/extract.js` présent avant que `extractFile` l'appelle
- [x] `useRef` importé dans Module6 (utilisé par `CorpusZone`)
- [x] Le handoff Supabase existant continue de fonctionner (`setScreen('main')` si handoffId présent)
- [x] La note personnelle n'est pas dans `prefill` — elle reste obligatoire et non pré-remplie dans les modes
- [x] Les modes débutant/intermédiaire/expert : aucune ligne modifiée
- [x] `odt` et `txt` : non gérés nativement par `extractFile` — la lib retourne une erreur "Format non supporté". Les ajouter dans l'`accept` du file input est correct pour affichage mais l'utilisateur verra une erreur inline. Acceptable pour v1.
