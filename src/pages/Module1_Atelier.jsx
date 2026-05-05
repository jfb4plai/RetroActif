/**
 * MODULE 1 — Atelier Logigramme
 *
 * Logigramme interactif pour vérifier une rétroaction existante
 * selon les 4 critères d'actionnabilité.
 *
 * Références : Sadler (1989), Kluger & DeNisi (1996),
 *              Nicol & Macfarlane-Dick (2006), Black et al. (2004)
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { NIVEAUX, TYPES_ENSEIGNEMENT, TYPES_RETROACTION, MATIERES } from '../lib/constants'

// Arbre de décision du logigramme
const NODES = {
  start: {
    question: 'Sur quoi porte votre rétroaction ?',
    aide: 'Une rétroaction centrée sur la tâche ou le processus est nettement plus efficace qu\'une rétroaction sur la personne. (Kluger & DeNisi, 1996)',
    options: [
      { label: 'Sur la personne', desc: '"Tu es intelligent", "Tu es nul", "Bon travail"', next: 'personne', color: 'red' },
      { label: 'Sur la tâche', desc: '"Ton introduction est claire", "Cet exercice est incomplet"', next: 'tache', color: 'green' },
      { label: 'Sur le processus', desc: '"Ta méthode de calcul fonctionne", "Essaie une autre approche"', next: 'tache', color: 'green' },
      { label: "Sur l'autorégulation", desc: '"Tu pourrais vérifier toi-même en...", "Quelle stratégie utiliserais-tu ?"', next: 'tache', color: 'green' },
    ],
  },
  personne: {
    type: 'warning',
    message: '⚠️ Rétroaction centrée sur la personne',
    explication: 'Ce type de rétroaction diminue la motivation et les performances (Kluger & DeNisi, 1996; Dweck, 2006). La félicitation de l\'intelligence ("tu es intelligent") réduit la persévérance face aux difficultés. La critique de la personne ("tu es nul") génère une réaction défensive.',
    action: 'Recentrez sur la tâche : que fait bien l\'élève dans son TRAVAIL ? Qu\'est-ce qui pose problème dans sa PRODUCTION ?',
    next: 'start',
    nextLabel: 'Reformuler ma rétroaction',
  },
  tache: {
    question: "L'élève sait-il exactement QUOI améliorer ?",
    aide: 'Le problème le plus fréquent : une rétroaction vague. "Développe davantage" ne dit pas quoi développer. "Ajoute un exemple concret dans le paragraphe 2" est actionnable. (Sadler, 1989)',
    options: [
      { label: 'Non — formulation vague', desc: '"Améliore", "Développe", "C\'est trop court"', next: 'vague', color: 'red' },
      { label: 'Oui — cible précise', desc: '"Dans la partie X, développe l\'argument sur Y"', next: 'comment', color: 'green' },
    ],
  },
  vague: {
    type: 'tip',
    message: '💡 Rétroaction trop vague',
    explication: 'L\'élève reçoit le diagnostic sans la prescription. Il sait que quelque chose ne va pas mais pas ce qu\'il doit faire. Ce schéma génère frustration et abandon (Nicol & Macfarlane-Dick, 2006).',
    action: 'Transformez votre diagnostic en action : "ton argumentation manque d\'exemples concrets" → "relire ton texte et ajouter un exemple par argument (critère : chaque argument a au moins un exemple)".',
    next: 'tache',
    nextLabel: 'J\'ai reformulé — continuer',
  },
  comment: {
    question: "L'élève sait-il COMMENT réaliser l'amélioration ?",
    aide: 'Connaître le problème ne suffit pas. Si l\'élève ne sait pas comment le corriger, la rétroaction reste lettre morte. Pour les élèves en difficulté, il faut expliciter la méthode.',
    options: [
      { label: 'Non — méthode absente', desc: 'L\'élève sait quoi faire mais pas comment', next: 'sans_methode', color: 'orange' },
      { label: 'Oui — méthode présente ou évidente', desc: 'La méthode est dans la rétroaction ou a été vue en cours', next: 'critere', color: 'green' },
    ],
  },
  sans_methode: {
    type: 'tip',
    message: '💡 Méthode manquante',
    explication: 'Pour les productions complexes ou les élèves en difficulté, préciser la méthode est indispensable. Sans elle, l\'élève cherche à deviner ce que l\'enseignant attend — ce qui génère du stress et des erreurs de révision.',
    action: 'Ajoutez la méthode : "Reprends le plan vu en cours (situation initiale → élément déclencheur → ...) et vérifie chaque étape."',
    next: 'critere',
    nextLabel: 'Méthode ajoutée — continuer',
  },
  critere: {
    question: "Y a-t-il un critère de réussite vérifiable ?",
    aide: 'L\'élève doit pouvoir savoir lui-même si son amélioration est suffisante. "Critère : chaque argument contient au moins un exemple." → L\'élève peut vérifier seul. (Sadler, 1989 ; hal-04621117)',
    options: [
      { label: 'Non', desc: 'L\'élève ne peut pas savoir quand c\'est "assez bien"', next: 'sans_critere', color: 'orange' },
      { label: 'Oui', desc: 'Un critère observable et vérifiable est présent', next: 'equilibre', color: 'green' },
    ],
  },
  sans_critere: {
    type: 'tip',
    message: '💡 Critère de réussite manquant',
    explication: 'Sans critère, l\'élève est dans l\'incertitude. Il peut sur-réviser (stress) ou sous-réviser (insuffisant). Le critère transforme la révision en auto-évaluation active.',
    action: 'Ajoutez un critère : "Critère : [condition vérifiable]." Exemple : "Critère : chaque argument a un exemple. / Le geste est propre sur 3 morceaux consécutifs."',
    next: 'equilibre',
    nextLabel: 'Critère ajouté — continuer',
  },
  equilibre: {
    question: "La rétroaction contient-elle un point fort ET une piste d'amélioration ?",
    aide: '"Deux étoiles et un souhait" (Black et al., 2004) : identifier deux réussites ET formuler une amélioration. Cette structure évite la critique pure et installe l\'idée que tout travail contient des réussites ET des axes de progrès.',
    options: [
      { label: 'Non — uniquement des critiques', desc: 'Pas de point fort identifié', next: 'sans_positif', color: 'orange' },
      { label: 'Non — uniquement des encouragements', desc: 'Pas de piste concrète d\'amélioration', next: 'sans_amelio', color: 'orange' },
      { label: 'Oui — les deux sont présents', desc: 'Point fort + axe d\'amélioration', next: 'suivi', color: 'green' },
    ],
  },
  sans_positif: {
    type: 'tip',
    message: '💡 Point fort manquant',
    explication: 'Une rétroaction uniquement critique génère une réaction défensive et diminue l\'estime de soi. Identifier ce qui fonctionne — même modestement — ancre la progression dans le réel.',
    action: 'Cherchez un point fort centré sur la tâche : qu\'est-ce qui est réussi dans ce travail ? (même partiellement)',
    next: 'suivi',
    nextLabel: 'Point fort ajouté — continuer',
  },
  sans_amelio: {
    type: 'tip',
    message: '💡 Piste d\'amélioration manquante',
    explication: 'Une rétroaction uniquement positive n\'aide pas l\'élève à progresser. Les encouragements sans piste concrète sont bien reçus mais sans effet sur l\'apprentissage.',
    action: 'Ajoutez une piste d\'amélioration concrète et actionnable.',
    next: 'suivi',
    nextLabel: 'Piste ajoutée — continuer',
  },
  suivi: {
    question: "Un suivi est-il planifié après cette rétroaction ?",
    aide: 'Rendre des copies sans prévoir de temps de révision est un "gaspillage pédagogique" (Nicol & Macfarlane-Dick, 2006). La rétroaction n\'a de valeur que si l\'élève peut agir dessus. Une "minute amélioration" suffit.',
    options: [
      { label: 'Non — pas de suivi prévu', desc: 'Les élèves passent à la suite', next: 'sans_suivi', color: 'orange' },
      { label: 'Oui — temps de révision prévu', desc: 'En classe ou à domicile avec retour', next: 'valide', color: 'green' },
    ],
  },
  sans_suivi: {
    type: 'tip',
    message: '💡 Suivi non planifié',
    explication: 'Sans temps de révision, même la meilleure rétroaction reste inefficace. L\'élève lit la note, regarde la note, range la copie. Le processus compte autant que le produit.',
    action: 'Prévoyez un temps de révision — même court : 5-10 minutes en classe avec consigne précise.',
    next: 'valide',
    nextLabel: 'Suivi planifié — continuer',
  },
  valide: {
    type: 'success',
    message: '✅ Rétroaction validée',
    explication: 'Votre rétroaction remplit les 4 critères d\'actionnabilité : centrée sur la tâche, précise, avec critère de réussite, équilibrée et avec suivi planifié.',
  },
}

export default function Module1_Atelier() {
  const navigate = useNavigate()
  const [nodeKey, setNodeKey] = useState('start')
  const [history, setHistory] = useState([])
  const [retroText, setRetroText] = useState('')
  const [ctx, setCtx] = useState({ niveau: '', type_enseignement: '', matiere: '', type_retroaction: 'production', eleve_code: '' })
  const [saving, setSaving] = useState(false)

  const node = NODES[nodeKey]

  function goTo(key) {
    setHistory(h => [...h, nodeKey])
    setNodeKey(key)
  }

  function goBack() {
    const prev = history[history.length - 1]
    setHistory(h => h.slice(0, -1))
    setNodeKey(prev ?? 'start')
  }

  function reset() {
    setHistory([])
    setNodeKey('start')
  }

  const steps = history.concat(nodeKey).length
  const maxSteps = 8
  const progress = Math.round((steps / maxSteps) * 100)

  async function saveValide() {
    if (!retroText.trim()) { alert('Ajoutez le texte de votre rétroaction.'); return }
    setSaving(true)
    await supabase.from('retroactions').insert({
      ...ctx,
      texte_final: retroText,
      mode_construction: 'logigramme',
      logigramme_chemin: history.concat(nodeKey),
    })
    setSaving(false)
    navigate('/suivi')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">🔀 Atelier Logigramme</h1>
        <p className="text-gray-500 text-sm mt-1">Vérifiez pas à pas l'actionnabilité d'une rétroaction existante</p>
      </div>

      {/* Zone de saisie de la rétroaction à analyser */}
      {nodeKey === 'start' && (
        <div className="card space-y-4">
          <h2 className="font-medium text-gray-800">Collez votre rétroaction à analyser (optionnel)</h2>
          <textarea className="input min-h-[80px] resize-y text-sm"
            placeholder="ex. Ton texte est trop court. Développe davantage."
            value={retroText} onChange={e => setRetroText(e.target.value)} />
          <div className="grid grid-cols-3 gap-3">
            <select className="input text-sm" value={ctx.niveau} onChange={e => setCtx(p => ({...p, niveau: e.target.value}))}>
              <option value="">Niveau...</option>
              {NIVEAUX.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
            </select>
            <select className="input text-sm" value={ctx.matiere} onChange={e => setCtx(p => ({...p, matiere: e.target.value}))}>
              <option value="">Matière...</option>
              {MATIERES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <input className="input text-sm" placeholder="Code élève" value={ctx.eleve_code}
              onChange={e => setCtx(p => ({...p, eleve_code: e.target.value}))} />
          </div>
        </div>
      )}

      {/* Barre de progression */}
      <div className="flex items-center gap-3">
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div className="bg-brand-500 h-2 rounded-full transition-all" style={{ width: `${Math.min(progress, 100)}%` }} />
        </div>
        <span className="text-xs text-gray-500">Étape {steps}</span>
      </div>

      {/* Nœud courant */}
      <div className="card space-y-5">

        {/* Nœud de question */}
        {!node.type && (
          <>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{node.question}</h2>
              {node.aide && (
                <details className="mt-2">
                  <summary className="text-xs text-brand-600 cursor-pointer hover:underline">Pourquoi cette question ?</summary>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed border-l-2 border-brand-200 pl-3">{node.aide}</p>
                </details>
              )}
            </div>
            <div className="space-y-2">
              {node.options.map((opt, i) => (
                <button key={i} onClick={() => goTo(opt.next)}
                  className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all hover:shadow-sm ${
                    opt.color === 'green' ? 'border-green-200 hover:border-green-400 hover:bg-green-50' :
                    opt.color === 'red' ? 'border-red-200 hover:border-red-400 hover:bg-red-50' :
                    'border-orange-200 hover:border-orange-400 hover:bg-orange-50'
                  }`}>
                  <div className="font-medium text-gray-800 text-sm">{opt.label}</div>
                  {opt.desc && <div className="text-xs text-gray-500 mt-0.5 italic">{opt.desc}</div>}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Nœud d'avertissement / conseil */}
        {(node.type === 'warning' || node.type === 'tip') && (
          <>
            <div className={`rounded-xl p-4 ${
              node.type === 'warning' ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'
            }`}>
              <div className={`font-semibold mb-2 ${node.type === 'warning' ? 'text-red-800' : 'text-amber-800'}`}>
                {node.message}
              </div>
              <p className={`text-sm leading-relaxed ${node.type === 'warning' ? 'text-red-700' : 'text-amber-700'}`}>
                {node.explication}
              </p>
            </div>
            <div className="bg-brand-50 border border-brand-200 rounded-xl p-4">
              <div className="text-xs font-semibold text-brand-800 mb-1">Action suggérée</div>
              <p className="text-sm text-brand-700">{node.action}</p>
            </div>
            <button className="btn-primary" onClick={() => goTo(node.next)}>
              {node.nextLabel ?? 'Continuer →'}
            </button>
          </>
        )}

        {/* Nœud succès */}
        {node.type === 'success' && (
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full text-3xl">
              ✅
            </div>
            <div>
              <h2 className="text-xl font-bold text-green-800">{node.message}</h2>
              <p className="text-sm text-green-700 mt-2 max-w-lg mx-auto">{node.explication}</p>
            </div>

            {/* Récap du chemin parcouru */}
            <div className="bg-gray-50 rounded-xl p-4 text-left">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Chemin parcouru</h3>
              <div className="flex flex-wrap gap-2">
                {history.map((key, i) => (
                  <span key={i} className="badge bg-green-100 text-green-700">✓ {NODES[key]?.message?.replace(/[⚠️💡✅]/g, '').trim() ?? key}</span>
                ))}
              </div>
            </div>

            {/* Sauvegarde optionnelle */}
            {retroText && (
              <div className="space-y-2">
                <div className="bg-white rounded-xl p-3 border border-gray-200 text-sm text-gray-800 text-left">
                  {retroText}
                </div>
                <button className="btn-primary" onClick={saveValide} disabled={saving}>
                  {saving ? 'Sauvegarde...' : '✓ Sauvegarder cette rétroaction validée'}
                </button>
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <button onClick={reset} className="btn-secondary">
                Analyser une autre rétroaction
              </button>
              <button onClick={() => navigate('/constructeur')} className="btn-primary">
                Construire une nouvelle rétroaction
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      {nodeKey !== 'start' && node.type !== 'success' && (
        <div className="flex justify-between">
          <button onClick={goBack} className="btn-secondary text-sm">← Retour</button>
          <button onClick={reset} className="text-xs text-gray-400 hover:text-gray-600">Recommencer</button>
        </div>
      )}
    </div>
  )
}
