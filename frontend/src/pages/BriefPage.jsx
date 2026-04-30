import { useState, useEffect, useCallback } from 'react'
import { useParams, useOutletContext } from 'react-router-dom'
import { createBrief, getBrief } from '../services/api.js'
import useWorkflowStore from '../store/workflowStore.js'
import useProjectStore from '../store/projectStore.js'
import StreamingLog from '../components/StreamingLog.jsx'
import AgentStatus from '../components/AgentStatus.jsx'

const BRIEF_AGENTS = [
  { name: 'StrategistAgent', label: 'Strategist' },
  { name: 'ArchitectAgent', label: 'Architect' },
]

const REQUIRED_FIELDS = ['mission', 'objective', 'audience', 'problem', 'promise', 'angle', 'cta', 'forbidden']

const FIELDS = [
  { key: 'mission', label: 'Mission', placeholder: "What's the purpose of this content?", required: true, rows: 2 },
  { key: 'objective', label: 'Objectif', placeholder: 'What measurable outcome do you want?', required: true, rows: 2 },
  { key: 'audience', label: 'Audience', placeholder: 'Describe your target reader in detail', required: true, rows: 3 },
  { key: 'problem', label: 'Problème', placeholder: "What pain point does this content address?", required: true, rows: 2 },
  { key: 'promise', label: 'Promesse', placeholder: 'What transformation or value do you promise?', required: true, rows: 2 },
  { key: 'angle', label: 'Angle', placeholder: 'Unique angle or narrative approach', required: true, rows: 2 },
  { key: 'channel', label: 'Canal', placeholder: 'Distribution channel (blog, newsletter, LinkedIn…)', required: false, rows: 1 },
  { key: 'tone', label: 'Ton', placeholder: 'Writing tone (expert, conversational, inspiring…)', required: false, rows: 1 },
  { key: 'cta', label: 'CTA', placeholder: 'Call to action — what should the reader do next?', required: true, rows: 1 },
  { key: 'constraints', label: 'Contraintes', placeholder: 'Word count, format requirements, etc.', required: false, rows: 2 },
  { key: 'forbidden', label: 'Interdits', placeholder: 'Topics, words, or angles to avoid absolutely', required: true, rows: 2 },
  { key: 'sources', label: 'Sources', placeholder: 'Reference URLs, books, studies to draw from', required: false, rows: 2 },
  { key: 'notes', label: 'Notes', placeholder: 'Any other context for the AI agents', required: false, rows: 3 },
]

export default function BriefPage() {
  const { id } = useParams()
  const context = useOutletContext()
  const project = context?.project

  const [formData, setFormData] = useState(
    Object.fromEntries(FIELDS.map((f) => [f.key, '']))
  )
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [error, setError] = useState(null)
  const [briefLoaded, setBriefLoaded] = useState(false)

  const { startAgentStream, streaming, reset } = useWorkflowStore()
  const { updateCurrentProject } = useProjectStore()

  // Load existing brief
  useEffect(() => {
    if (!id || briefLoaded) return
    getBrief(id)
      .then((brief) => {
        if (brief) {
          const data = {}
          FIELDS.forEach((f) => { data[f.key] = brief[f.key] || '' })
          setFormData(data)
          setBriefLoaded(true)
        }
      })
      .catch(() => setBriefLoaded(true))
  }, [id, briefLoaded])

  const handleChange = useCallback((key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }, [])

  const isValid = REQUIRED_FIELDS.every((k) => formData[k]?.trim())

  const handleSave = async () => {
    if (!isValid) {
      setError('Please fill in all required fields.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await createBrief(id, formData)
      setSaveSuccess(true)
      updateCurrentProject({ status: 'briefed' })
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      setError(err.message || 'Failed to save brief')
    } finally {
      setSaving(false)
    }
  }

  const handleGenerate = async () => {
    if (!isValid) {
      setError('Please fill in all required fields first.')
      return
    }

    setError(null)
    setGenerating(true)
    reset()

    try {
      // Save brief first
      await createBrief(id, formData)

      // Run StrategistAgent → ArchitectAgent in sequence
      await startAgentStream(id, 'StrategistAgent')
      updateCurrentProject({ status: 'planned' })
    } catch (err) {
      setError(err.message || 'Failed to start generation')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-200 mb-1">Brief Master</h2>
        <p className="text-sm text-gray-500">
          Define all parameters for your content. Required fields are marked with *.
        </p>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
          {error}
        </div>
      )}

      {saveSuccess && (
        <div className="px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm text-emerald-400 flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Brief saved successfully
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {FIELDS.map((field) => (
          <div
            key={field.key}
            className={field.rows >= 3 ? 'lg:col-span-2' : ''}
          >
            <label className="label">
              {field.label}
              {field.required && <span className="text-red-400 ml-1">*</span>}
            </label>
            {field.rows === 1 ? (
              <input
                type="text"
                value={formData[field.key]}
                onChange={(e) => handleChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                className="input-field"
              />
            ) : (
              <textarea
                value={formData[field.key]}
                onChange={(e) => handleChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                rows={field.rows}
                className="input-field resize-none"
              />
            )}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-800">
        <button
          onClick={handleSave}
          disabled={saving || !isValid}
          className="btn-secondary flex items-center gap-2"
        >
          {saving ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Saving…
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              Save Brief
            </>
          )}
        </button>

        <button
          onClick={handleGenerate}
          disabled={generating || streaming || !isValid}
          className="btn-primary flex items-center gap-2"
        >
          {generating || streaming ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generating Plan…
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Generate Plan
            </>
          )}
        </button>

        {(generating || streaming) && (
          <button
            onClick={() => { reset(); setGenerating(false) }}
            className="btn-danger text-sm"
          >
            Stop
          </button>
        )}
      </div>

      {/* Streaming output */}
      {(generating || streaming) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <AgentStatus agents={BRIEF_AGENTS} />
          <StreamingLog />
        </div>
      )}
    </div>
  )
}
