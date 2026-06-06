# RetroActif — Corpus Input (Module 6 Constructeur)

Date : 2026-06-06  
Inspiré par : analyse HAPI/IA (DRANE Normandie)

---

## Contexte

Le Constructeur de rétroaction (Module6) demande actuellement à l'enseignant de décrire manuellement la tâche, les points forts et les points faibles de la production élève. Cette saisie est la principale friction d'entrée.

L'ajout d'un chemin "corpus" permet à l'enseignant d'uploader directement la production de l'élève et/ou l'énoncé donné — l'IA extrait les champs et pré-remplit le formulaire. La note personnelle (le 20% humain) reste obligatoire et non pré-remplie.

---

## Architecture

Deux chemins d'entrée sur l'écran d'accueil de Module6, avant le choix de mode (débutant / intermédiaire / expert) :

```
[Module6]
  └── step: 'entry'              ← nouvel écran d'entrée
        ├── Chemin A → step: 'mode' → formulaire existant (inchangé)
        └── Chemin B → step: 'corpus'
                         → step: 'extraction'
                         → step: 'mode'
                         → formulaire pré-rempli (même code, nouvelle source prefill)
```

Le `prefill` injecté dans les modes débutant/intermédiaire/expert est identique qu'il vienne du handoff Supabase existant ou de l'extraction corpus. Aucun code de mode n'est modifié.

---

## Chemin B — détail des étapes

### `step: 'corpus'`

Deux zones indépendantes :

| Zone | Label | Contenu attendu |
|------|-------|-----------------|
| `corpus_eleve` | "Ce que l'élève a rendu" | Copie, exercice, production écrite ou orale |
| `corpus_enonce` | "Ce que vous avez donné" | Énoncé, consigne, activité |

Chaque zone accepte :
- Dépôt de fichiers : `.txt`, `.pdf`, `.docx`, `.odt`, `.jpg`, `.png` (lib `extractFile` de DiffActif)
- Textarea "ou collez le texte ici"
- Les deux peuvent être combinés (texte + fichier = corpus cumulé)

Contrainte : au moins une zone doit être remplie pour activer le bouton "Extraire".

Si un fichier dépasse la limite de `extractFile` : avertissement inline, suggestion de coller uniquement le passage pertinent.

### `step: 'extraction'`

Appel `/api/generate` avec :

```js
{
  action: 'extract_corpus',
  context: {
    corpus_eleve: '...',   // texte extrait + texte collé
    corpus_enonce: '...',  // idem
  }
}
```

Réponse IA attendue (JSON) :

```json
{
  "tache": "...",
  "points_forts": "...",
  "points_faibles": "...",
  "niveau_suggere": "cycle4",
  "matiere_suggeree": "Français"
}
```

Règles du prompt :
- Champ non extractible avec certitude → chaîne vide (jamais d'invention)
- Langue : français, registre professionnel enseignant

Affichage : carte avec 4 champs éditables. Champ vide → badge "Non détecté" (orange). L'enseignant corrige avant de continuer.

Boutons :
- "Continuer" → charge le prefill, passe à `step: 'mode'`
- "Recommencer" → retour à `step: 'corpus'`

Données : mémoire React uniquement, pas de persistance Supabase.

### `step: 'mode'`

Identique au flux actuel. Le prefill issu de l'extraction alimente les mêmes champs que le handoff existant.

---

## Gestion d'erreurs

| Cas | Comportement |
|-----|-------------|
| Extraction partielle | Champs vides en "Non détecté", l'enseignant continue et complète manuellement |
| Fichier illisible | Message inline, fichier ignoré, autres fichiers traités |
| `/api/generate` en échec | Message d'erreur + bouton "Réessayer" sur `step: 'extraction'` |
| Corpus trop volumineux | Avertissement avant envoi, suggestion de réduire |

---

## Ce qui ne change pas

- Code des modes débutant / intermédiaire / expert : inchangé
- Mécanisme handoff Supabase : inchangé
- Note personnelle : toujours obligatoire, jamais pré-remplie
- Toutes les références scientifiques existantes du module : inchangées

---

## Fichiers à créer / modifier

| Fichier | Action |
|---------|--------|
| `src/pages/Module6_Constructeur.jsx` | Ajouter étapes `entry`, `corpus`, `extraction` en tête du composant principal |
| `api/generate.js` | Ajouter le cas `extract_corpus` |
| `src/lib/extractFile.js` | Copier depuis DiffActif si absent |

---

## Hors périmètre

- EvalActif : feature à concevoir séparément
- DiffActif : déjà doté d'`extractFile`, pas concerné par ce spec
- Journalisation des opérations (leçon HAPI n°4) : spec séparé
- Tableau de bord "Mes dernières activités" (leçon HAPI n°5) : spec séparé
