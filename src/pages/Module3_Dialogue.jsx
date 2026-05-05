/**
 * MODULE 3 — Dialogue apprenant
 *
 * Protocole structuré de dialogue enseignant ↔ apprenant
 * Centré sur le face-à-face (pas de communication digitale élève).
 *
 * Fonctions :
 *  - Sélectionner une rétroaction sauvegardée
 *  - Imprimer une fiche dialogue pour l'élève (format A5)
 *  - Enregistrer les réponses de l'élève (saisie par l'enseignant)
 *
 * Références : Nicol (2021) — réel, hors corpus RISS ;
 *              tel-04860619, De Khovrine (2023) — RISS ✓
 */

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Module3_Dialogue() {
  const [retroactions, setRetroactions] = useState([])
  const [selectedRetro, setSelectedRetro] = useState(null)
  const [dialogue, setDialogue] = useState({
    interpretation: '',
    question_clarif: '',
    action1: '',
    action2: '',
    apres_revision: '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [tab, setTab] = useState('fiche') // 'fiche' | 'saisie'

  useEffect(() => {
    supabase.from('retroactions').select('id, eleve_code, texte_final, matiere, niveau, created_at')
      .order('created_at', { ascending: false }).limit(30)
      .then(({ data }) => setRetroactions(data ?? []))
  }, [])

  async function save() {
    if (!selectedRetro) return
    setSaving(true)
    await supabase.from('dialogues').insert({
      retroaction_id: selectedRetro.id,
      eleve_code: selectedRetro.eleve_code,
      ...dialogue,
    })
    // Marque la rétroaction comme "suivi réalisé"
    await supabase.from('retroactions').update({ suivi_realise: true }).eq('id', selectedRetro.id)
    setSaved(true)
    setSaving(false)
  }

  function printFiche() {
    const html = buildFicheHTML(selectedRetro)
    const w = window.open('', '_blank')
    w.document.write(html)
    w.document.close()
    w.print()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">💬 Dialogue apprenant</h1>
        <p className="text-gray-500 text-sm mt-1">
          Préparer et conduire un dialogue structuré autour d'une rétroaction.
          <span className="ml-1 italic">(Centré sur le face-à-face — Nicol, 2021)</span>
        </p>
      </div>

      {/* Sélection de la rétroaction */}
      <div className="card space-y-3">
        <h2 className="font-semibold text-gray-800">Rétroaction concernée</h2>
        {retroactions.length === 0 ? (
          <p className="text-gray-400 text-sm">Aucune rétroaction sauvegardée.</p>
        ) : (
          <select className="input" value={selectedRetro?.id ?? ''}
            onChange={e => setSelectedRetro(retroactions.find(r => r.id === e.target.value) ?? null)}>
            <option value="">Choisir une rétroaction...</option>
            {retroactions.map(r => (
              <option key={r.id} value={r.id}>
                {r.eleve_code ?? 'Sans code'} — {r.matiere ?? ''} — {new Date(r.created_at).toLocaleDateString('fr-BE')} — {r.texte_final?.slice(0, 60)}...
              </option>
            ))}
          </select>
        )}

        {selectedRetro && (
          <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-800 border border-gray-200 leading-relaxed">
            {selectedRetro.texte_final}
          </div>
        )}
      </div>

      {selectedRetro && (
        <>
          {/* Onglets */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
            {[
              { k: 'fiche', l: '🖨️ Fiche élève' },
              { k: 'saisie', l: '📝 Enregistrer le dialogue' },
            ].map(t => (
              <button key={t.k} onClick={() => setTab(t.k)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  tab === t.k ? 'bg-white shadow text-brand-700' : 'text-gray-500'
                }`}>
                {t.l}
              </button>
            ))}
          </div>

          {/* Fiche imprimable */}
          {tab === 'fiche' && (
            <div className="card space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-800">Fiche dialogue (format imprimable A5)</h2>
                <button onClick={printFiche} className="btn-primary text-sm">
                  🖨️ Imprimer / PDF
                </button>
              </div>

              {/* Aperçu de la fiche */}
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 space-y-4 bg-white">
                <div className="text-center border-b border-gray-200 pb-3">
                  <div className="font-bold text-lg text-gray-900">Fiche dialogue</div>
                  <div className="text-sm text-gray-500">
                    {selectedRetro.eleve_code ?? 'Élève'} · {selectedRetro.matiere ?? ''} ·{' '}
                    {new Date(selectedRetro.created_at).toLocaleDateString('fr-BE')}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-800 italic leading-relaxed">
                  "{selectedRetro.texte_final}"
                </div>

                <div className="space-y-3 text-sm">
                  {[
                    { n: '1', q: 'Ma première réaction à cette rétroaction :', ph: '' },
                    { n: '2', q: "Ce que je comprends qu'on me demande :", ph: 'Ce que l\'enseignant me demande de faire, c\'est...' },
                    { n: '3', q: 'Ce que je vais faire :', ph: 'Action 1 :                 Quand :\nAction 2 :                 Quand :' },
                    { n: '4', q: 'Ce que je ne comprends pas encore :', ph: 'Pouvez-vous préciser ce que vous voulez dire par...' },
                    { n: '5', q: 'Après révision — ce que j\'ai amélioré :', ph: "J'ai amélioré ___ parce que ___" },
                  ].map(item => (
                    <div key={item.n}>
                      <div className="font-medium text-gray-700">{item.n}. {item.q}</div>
                      <div className="border-b border-gray-300 mt-1 mb-1 pb-4 text-xs text-gray-400 italic min-h-[40px]">
                        {item.ph}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="text-xs text-gray-400 text-center pt-2 border-t border-gray-200">
                  Protocole adapté de Nicol (2021) · RetroActif — outil pédagogique FWB
                </div>
              </div>
            </div>
          )}

          {/* Saisie du dialogue */}
          {tab === 'saisie' && (
            <div className="card space-y-4">
              <h2 className="font-semibold text-gray-800">Enregistrer les réponses de l'élève</h2>
              <p className="text-sm text-gray-500">Saisir après le dialogue en face-à-face. Ces informations alimentent le profil de suivi de l'élève.</p>

              {[
                { k: 'interpretation', label: '2. Comment l\'élève a-t-il interprété la rétroaction ?', ph: 'Sa reformulation...' },
                { k: 'question_clarif', label: '4. Quelle clarification a-t-il demandée ?', ph: 'Sa question...' },
                { k: 'action1', label: '3. Action retenue', ph: 'Ce qu\'il va faire...' },
                { k: 'apres_revision', label: '5. Après révision — ce qu\'il dit avoir amélioré', ph: 'Après révision...' },
              ].map(f => (
                <div key={f.k}>
                  <label className="label">{f.label}</label>
                  <textarea className="input resize-none text-sm" rows={2}
                    placeholder={f.ph}
                    value={dialogue[f.k]}
                    onChange={e => setDialogue(p => ({ ...p, [f.k]: e.target.value }))} />
                </div>
              ))}

              {saved ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
                  ✓ Dialogue enregistré. La rétroaction est marquée "suivi réalisé".
                </div>
              ) : (
                <button className="btn-primary" onClick={save} disabled={saving}>
                  {saving ? 'Sauvegarde...' : '✓ Enregistrer le dialogue'}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Génération HTML pour impression ──────────────────────
function buildFicheHTML(retro) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <title>Fiche dialogue — RetroActif</title>
  <style>
    @page { size: A5; margin: 15mm; }
    body { font-family: Arial, sans-serif; font-size: 11pt; color: #1a1a1a; }
    .header { text-align: center; border-bottom: 2px solid #0a9370; padding-bottom: 8px; margin-bottom: 12px; }
    .header h1 { margin: 0; font-size: 14pt; color: #0a9370; }
    .header p { margin: 2px 0; font-size: 9pt; color: #666; }
    .retro-box { background: #f9f9f9; border-left: 3px solid #0a9370; padding: 8px 10px; margin-bottom: 14px; font-style: italic; font-size: 10pt; }
    .question { font-weight: bold; margin-top: 12px; margin-bottom: 3px; font-size: 10pt; }
    .ligne { border-bottom: 1px solid #ccc; min-height: 24px; margin-bottom: 2px; }
    .footer { text-align: center; font-size: 8pt; color: #aaa; margin-top: 20px; border-top: 1px solid #eee; padding-top: 8px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Fiche dialogue</h1>
    <p>${retro.eleve_code ?? 'Élève'} · ${retro.matiere ?? ''} · ${new Date(retro.created_at).toLocaleDateString('fr-BE')}</p>
  </div>
  <div class="retro-box">"${retro.texte_final}"</div>
  <div class="question">1. Ma première réaction :</div>
  <div class="ligne"></div><div class="ligne"></div>
  <div class="question">2. Ce que je comprends qu'on me demande :</div>
  <div class="ligne"></div><div class="ligne"></div>
  <div class="question">3. Ce que je vais faire :</div>
  <div class="ligne"></div><div class="ligne"></div>
  <div class="question">4. Ce que je ne comprends pas encore :</div>
  <div class="ligne"></div><div class="ligne"></div>
  <div class="question">5. Après révision — ce que j'ai amélioré :</div>
  <div class="ligne"></div><div class="ligne"></div>
  <div class="footer">Protocole adapté de Nicol (2021) · RetroActif — outil pédagogique FWB</div>
</body>
</html>`
}
