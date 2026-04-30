import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useProjectStore from '../store/projectStore.js'

const CONTENT_TYPES = [
  { value: 'blog_article', label: 'Article de blog' },
  { value: 'linkedin_post', label: 'Post LinkedIn' },
  { value: 'professional_email', label: 'Email professionnel' },
  { value: 'video_script', label: 'Script vidéo' },
  { value: 'sales_page', label: 'Page de vente' },
  { value: 'book_chapter', label: 'Chapitre de livre' },
]

const BUDGET_MODES = [
  {
    value: 'fast',
    label: 'Fast',
    description: 'Quick generation with Claude Haiku. Best for drafts and experiments.',
    cost: '~$0.05',
    callsLimit: 20,
    badge: 'Economy',
    badgeColor: 'text-gray-400 bg-gray-800',
  },
  {
    value: 'standard',
    label: 'Standard',
    description: 'Balanced quality and cost with Claude Sonnet. Recommended for most content.',
    cost: '~$0.25',
    callsLimit: 40,
    badge: 'Recommended',
    badgeColor: 'text-indigo-400 bg-indigo-500/10',
  },
  {
    value: 'premium',
    label: 'Premium',
    description: 'Maximum quality with Claude Opus. Best for high-stakes content.',
    cost: '~$1.00',
    callsLimit: 60,
    badge: 'Best Quality',
    badgeColor: 'text-amber-400 bg-amber-500/10',
  },
]

export default function NewProjectPage() {
  const [name, setName] = useState('')
  const [contentType, setContentType] = useState('blog_article')
  const [budgetMode, setBudgetMode] = useState('standard')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const { createProject } = useProjectStore()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return

    setError(null)
    setLoading(true)

    try {
      const project = await createProject({
        name: name.trim(),
        contentType,
        budgetMode,
      })
      navigate(`/projects/${project.id}`)
    } catch (err) {
      setError(err.message || 'Failed to create project')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 mb-4 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
        <h1 className="text-2xl font-bold text-gray-100">New Project</h1>
        <p className="text-gray-500 mt-1">Configure your AI editorial project</p>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Project name */}
        <div>
          <label htmlFor="name" className="label">Project Name</label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. How AI is Transforming Content Marketing"
            className="input-field"
          />
        </div>

        {/* Content type */}
        <div>
          <label htmlFor="contentType" className="label">Content Type</label>
          <div className="relative">
            <select
              id="contentType"
              value={contentType}
              onChange={(e) => setContentType(e.target.value)}
              className="input-field appearance-none pr-10"
            >
              {CONTENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <svg
              className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>

        {/* Budget mode */}
        <div>
          <label className="label">Budget Mode</label>
          <div className="space-y-3">
            {BUDGET_MODES.map((mode) => (
              <label
                key={mode.value}
                className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                  budgetMode === mode.value
                    ? 'border-indigo-500 bg-indigo-500/5'
                    : 'border-gray-700 bg-gray-900 hover:border-gray-600'
                }`}
              >
                <input
                  type="radio"
                  name="budgetMode"
                  value={mode.value}
                  checked={budgetMode === mode.value}
                  onChange={() => setBudgetMode(mode.value)}
                  className="mt-1 accent-indigo-500 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-200">{mode.label}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${mode.badgeColor}`}>
                      {mode.badge}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mb-2">{mode.description}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-600">
                    <span>Est. cost: <strong className="text-gray-400">{mode.cost}</strong></span>
                    <span>Max calls: <strong className="text-gray-400">{mode.callsLimit}</strong></span>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="btn-primary flex items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Creating…
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Create Project
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-secondary"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
