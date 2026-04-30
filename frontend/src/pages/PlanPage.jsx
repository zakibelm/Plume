import { useState, useEffect } from 'react'
import { useParams, useNavigate, useOutletContext } from 'react-router-dom'
import { runAgent } from '../services/api.js'
import useWorkflowStore from '../store/workflowStore.js'
import useProjectStore from '../store/projectStore.js'
import AgentStatus from '../components/AgentStatus.jsx'
import StreamingLog from '../components/StreamingLog.jsx'

const PLAN_AGENTS = [
  { name: 'StrategistAgent', label: 'Strategist' },
  { name: 'ArchitectAgent', label: 'Architect' },
]

function HeadingIcon({ level }) {
  const sizes = { 1: 'text-lg', 2: 'text-base', 3: 'text-sm' }
  const colors = { 1: 'text-indigo-400', 2: 'text-indigo-300', 3: 'text-gray-400' }
  return (
    <span className={`font-mono font-bold ${sizes[level]} ${colors[level]} mr-2`}>
      {'H'.repeat(1) + level}
    </span>
  )
}

function PlanSection({ section, depth = 0 }) {
  const padding = depth * 16

  return (
    <div style={{ paddingLeft: `${padding}px` }}>
      <div className={`flex items-start gap-2 py-1.5 ${depth === 0 ? 'border-l-2 border-indigo-600 pl-3 my-2' : ''}`}>
        <HeadingIcon level={Math.min(3, depth + 1)} />
        <div className="flex-1">
          <p className={`font-medium ${depth === 0 ? 'text-gray-100' : depth === 1 ? 'text-gray-200' : 'text-gray-400'} text-sm`}>
            {section.title || section.heading || section.name}
          </p>
          {(section.description || section.brief) && (
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
              {section.description || section.brief}
            </p>
          )}
          {section.keywords && section.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {section.keywords.map((kw, i) => (
                <span key={i} className="text-xs px-1.5 py-0.5 bg-gray-800 text-gray-500 rounded">
                  {kw}
                </span>
              ))}
            </div>
          )}
        </div>
        {section.wordCount && (
          <span className="text-xs text-gray-600 shrink-0">~{section.wordCount}w</span>
        )}
      </div>

      {section.subsections?.map((sub, i) => (
        <PlanSection key={i} section={sub} depth={depth + 1} />
      ))}
      {section.sections?.map((sub, i) => (
        <PlanSection key={i} section={sub} depth={depth + 1} />
      ))}
    </div>
  )
}

function PlanDisplay({ plan }) {
  if (!plan) return null

  // Handle different plan structures
  const sections = plan.sections || plan.outline || plan.structure || (Array.isArray(plan) ? plan : [])

  if (sections.length === 0) {
    return (
      <div className="card p-6">
        <pre className="text-xs text-gray-400 overflow-auto">
          {JSON.stringify(plan, null, 2)}
        </pre>
      </div>
    )
  }

  return (
    <div className="card p-6">
      {plan.title && (
        <div className="mb-4 pb-4 border-b border-gray-800">
          <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Title</span>
          <h2 className="text-lg font-bold text-gray-100 mt-1">{plan.title}</h2>
        </div>
      )}

      {plan.summary && (
        <div className="mb-4 pb-4 border-b border-gray-800">
          <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Summary</span>
          <p className="text-sm text-gray-400 mt-1 leading-relaxed">{plan.summary}</p>
        </div>
      )}

      <div>
        <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold block mb-3">
          Structure ({sections.length} sections)
        </span>
        <div className="space-y-1">
          {sections.map((section, i) => (
            <PlanSection key={i} section={section} depth={0} />
          ))}
        </div>
      </div>

      {plan.totalWords && (
        <div className="mt-4 pt-4 border-t border-gray-800 text-sm text-gray-500">
          Estimated total: <span className="text-gray-300 font-medium">{plan.totalWords} words</span>
        </div>
      )}
    </div>
  )
}

export default function PlanPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const context = useOutletContext()
  const project = context?.project

  const [plan, setPlan] = useState(project?.plan || null)
  const [regenerating, setRegenerating] = useState(false)
  const [error, setError] = useState(null)

  const { startAgentStream, streaming, reset } = useWorkflowStore()
  const { updateCurrentProject } = useProjectStore()

  // Try to load plan from project data
  useEffect(() => {
    if (project?.plan) {
      try {
        const parsed = typeof project.plan === 'string' ? JSON.parse(project.plan) : project.plan
        setPlan(parsed)
      } catch {
        setPlan(null)
      }
    }
  }, [project])

  const handleRegenerate = async () => {
    setError(null)
    setRegenerating(true)
    reset()

    try {
      await startAgentStream(id, 'ArchitectAgent')
      updateCurrentProject({ status: 'planned' })
    } catch (err) {
      setError(err.message || 'Failed to regenerate plan')
    } finally {
      setRegenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-200 mb-1">Editorial Plan</h2>
          <p className="text-sm text-gray-500">
            AI-generated content structure based on your brief.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleRegenerate}
            disabled={regenerating || streaming}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            {regenerating || streaming ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Regenerating…
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
                </svg>
                Regenerate
              </>
            )}
          </button>

          <button
            onClick={() => navigate(`/projects/${id}/editor`)}
            className="btn-primary flex items-center gap-2 text-sm"
            disabled={!plan}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
            Start Writing
          </button>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
          {error}
        </div>
      )}

      {(regenerating || streaming) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <AgentStatus agents={PLAN_AGENTS} />
          <StreamingLog />
        </div>
      )}

      {plan ? (
        <PlanDisplay plan={plan} />
      ) : (
        <div className="card p-12 text-center">
          <div className="w-14 h-14 rounded-xl bg-gray-800 flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.5">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-gray-300 mb-2">No plan yet</h3>
          <p className="text-sm text-gray-500 mb-4">
            Fill in the brief and click "Generate Plan" to create an editorial structure.
          </p>
          <button
            onClick={() => navigate(`/projects/${id}/brief`)}
            className="btn-primary text-sm"
          >
            Go to Brief
          </button>
        </div>
      )}
    </div>
  )
}
