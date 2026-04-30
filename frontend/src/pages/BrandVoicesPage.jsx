import { useState, useEffect } from 'react'
import { getBrandVoices, createBrandVoice, updateBrandVoice, deleteBrandVoice } from '../services/api.js'

const EMPTY_FORM = {
  name: '',
  tone: '',
  rhythm: '',
  preferred_expressions: [],
  forbidden_expressions: [],
  style_rules: '',
  good_examples: '',
  bad_examples: '',
}

function TagInput({ label, value, onChange }) {
  const [input, setInput] = useState('')

  function add() {
    if (!input.trim()) return
    onChange([...value, input.trim()])
    setInput('')
  }

  return (
    <div>
      <label className="block text-sm text-gray-400 mb-1">{label}</label>
      <div className="flex gap-2 mb-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder="Ajouter..."
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-gray-200 text-sm focus:outline-none focus:border-indigo-500"
        />
        <button onClick={add} type="button" className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg">+</button>
      </div>
      <div className="flex flex-wrap gap-2">
        {value.map((tag, i) => (
          <span key={i} className="flex items-center gap-1 bg-gray-700 text-gray-200 text-xs px-2 py-1 rounded-full">
            {tag}
            <button onClick={() => onChange(value.filter((_, j) => j !== i))} className="text-gray-400 hover:text-white">×</button>
          </span>
        ))}
      </div>
    </div>
  )
}

export default function BrandVoicesPage() {
  const [voices, setVoices]   = useState([])
  const [editing, setEditing] = useState(null) // null | 'new' | voice object
  const [form, setForm]       = useState(EMPTY_FORM)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getBrandVoices().then(setVoices).finally(() => setLoading(false))
  }, [])

  function startNew() {
    setEditing('new')
    setForm(EMPTY_FORM)
    setError(null)
  }

  function startEdit(voice) {
    setEditing(voice)
    setForm({ ...EMPTY_FORM, ...voice })
    setError(null)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      if (editing === 'new') {
        const created = await createBrandVoice(form)
        setVoices((prev) => [created, ...prev])
      } else {
        const updated = await updateBrandVoice(editing.id, form)
        setVoices((prev) => prev.map((v) => (v.id === updated.id ? updated : v)))
      }
      setEditing(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Supprimer cette voix de marque ?')) return
    try {
      await deleteBrandVoice(id)
      setVoices((prev) => prev.filter((v) => v.id !== id))
      if (editing?.id === id) setEditing(null)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="flex h-full">
      {/* List */}
      <div className="w-72 border-r border-gray-800 p-4 flex flex-col gap-3 overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-white font-semibold">Voix de marque</h2>
          <button onClick={startNew} className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-lg">
            + Nouveau
          </button>
        </div>

        {loading && <p className="text-gray-500 text-sm">Chargement...</p>}

        {!loading && voices.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">Aucune voix de marque</p>
            <button onClick={startNew} className="mt-3 text-indigo-400 text-sm underline">Créer la première</button>
          </div>
        )}

        {voices.map((v) => (
          <div
            key={v.id}
            onClick={() => startEdit(v)}
            className={`p-3 rounded-xl cursor-pointer border transition-colors ${
              editing?.id === v.id
                ? 'border-indigo-500 bg-indigo-900/20'
                : 'border-gray-700 hover:border-gray-600 bg-gray-900'
            }`}
          >
            <div className="flex justify-between items-start">
              <p className="text-white text-sm font-medium">{v.name}</p>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(v.id) }}
                className="text-gray-600 hover:text-red-400 text-xs"
              >
                ✕
              </button>
            </div>
            {v.tone && <p className="text-gray-400 text-xs mt-1 truncate">{v.tone}</p>}
          </div>
        ))}
      </div>

      {/* Form */}
      <div className="flex-1 p-6 overflow-y-auto">
        {!editing ? (
          <div className="h-full flex items-center justify-center text-gray-500">
            Sélectionnez une voix de marque ou créez-en une nouvelle
          </div>
        ) : (
          <form onSubmit={handleSave} className="max-w-2xl space-y-5">
            <h3 className="text-white font-semibold text-lg">
              {editing === 'new' ? 'Nouvelle voix de marque' : `Modifier : ${editing.name}`}
            </h3>

            {error && (
              <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">{error}</div>
            )}

            <div>
              <label className="block text-sm text-gray-400 mb-1">Nom *</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Ton</label>
              <input
                value={form.tone}
                onChange={(e) => setForm({ ...form, tone: e.target.value })}
                placeholder="ex: Direct, concret, expert, sans jargon"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Rythme</label>
              <input
                value={form.rhythm}
                onChange={(e) => setForm({ ...form, rhythm: e.target.value })}
                placeholder="ex: Phrases courtes. Paragraphes courts."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>

            <TagInput
              label="Expressions préférées"
              value={form.preferred_expressions || []}
              onChange={(v) => setForm({ ...form, preferred_expressions: v })}
            />

            <TagInput
              label="Expressions interdites"
              value={form.forbidden_expressions || []}
              onChange={(v) => setForm({ ...form, forbidden_expressions: v })}
            />

            <div>
              <label className="block text-sm text-gray-400 mb-1">Règles de style</label>
              <textarea
                value={form.style_rules}
                onChange={(e) => setForm({ ...form, style_rules: e.target.value })}
                rows={3}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 text-sm focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Exemples positifs</label>
              <textarea
                value={form.good_examples}
                onChange={(e) => setForm({ ...form, good_examples: e.target.value })}
                rows={3}
                placeholder="Texte qui représente bien votre voix..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 text-sm focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Exemples à éviter</label>
              <textarea
                value={form.bad_examples}
                onChange={(e) => setForm({ ...form, bad_examples: e.target.value })}
                rows={3}
                placeholder="Texte à ne pas imiter..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 text-sm focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm rounded-lg"
              >
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="px-5 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm rounded-lg"
              >
                Annuler
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
