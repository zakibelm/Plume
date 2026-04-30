import { useEffect } from 'react'
import { useParams, useNavigate, Outlet, NavLink, Link } from 'react-router-dom'
import useProjectStore from '../store/projectStore.js'
import BudgetWidget from '../components/BudgetWidget.jsx'

const STATUS_STEPS = [
  { key: 'draft', label: 'Draft' },
  { key: 'briefed', label: 'Briefed' },
  { key: 'planned', label: 'Planned' },
  { key: 'writing', label: 'Writing' },
  { key: 'review', label: 'Review' },
  { key: 'completed', label: 'Completed' },
]

const STATUS_ORDER = STATUS_STEPS.map((s) => s.key)

function StatusTimeline({ status }) {
  const currentIdx = STATUS_ORDER.indexOf(status)

  return (
    <div className="flex items-center gap-1">
      {STATUS_STEPS.map((step, i) => {
        const done = i < currentIdx
        const current = i === currentIdx
        return (
          <div key={step.key} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  done
                    ? 'bg-emerald-500'
                    : current
                    ? 'bg-indigo-500 ring-2 ring-indigo-500/30'
                    : 'bg-gray-700'
                }`}
              />
              <span className={`text-xs mt-1 whitespace-nowrap hidden sm:block ${
                current ? 'text-indigo-400 font-medium' : done ? 'text-gray-500' : 'text-gray-600'
              }`}>
                {step.label}
              </span>
            </div>
            {i < STATUS_STEPS.length - 1 && (
              <div className={`w-8 sm:w-12 h-px mx-1 mb-4 sm:mb-0 ${i < currentIdx ? 'bg-emerald-600' : 'bg-gray-700'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function TabLink({ to, children }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
          isActive
            ? 'border-indigo-500 text-indigo-400'
            : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-600'
        }`
      }
    >
      {children}
    </NavLink>
  )
}

export default function ProjectPage() {
  const { id } = useParams()
  const { currentProject, fetchProject, loading } = useProjectStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (id) fetchProject(id)
  }, [id, fetchProject])

  if (loading && !currentProject) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-800 rounded w-1/2" />
          <div className="h-4 bg-gray-800 rounded w-1/4" />
        </div>
      </div>
    )
  }

  if (!currentProject) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-8 text-center">
        <p className="text-gray-500">Project not found.</p>
        <Link to="/" className="text-indigo-400 hover:underline mt-2 inline-block">
          Back to dashboard
        </Link>
      </div>
    )
  }

  const project = currentProject

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 mb-4 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Dashboard
        </button>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-100 mb-1">{project.name}</h1>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-gray-500 capitalize">
                {(project.contentType || project.content_type || '').replace(/_/g, ' ')}
              </span>
              <span className="text-gray-700">•</span>
              <span className="text-gray-500 capitalize">
                {(project.budgetMode || project.budget_mode || '')} mode
              </span>
              {(project.qualityScore ?? project.quality_score) != null && (
                <>
                  <span className="text-gray-700">•</span>
                  <span className="text-emerald-400 font-medium">
                    Score: {project.qualityScore ?? project.quality_score}
                  </span>
                </>
              )}
            </div>
          </div>

          <StatusTimeline status={project.status || 'draft'} />
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-800 mb-6 -mx-6 px-6 flex items-center gap-1 overflow-x-auto">
        <TabLink to={`/projects/${id}`}>Overview</TabLink>
        <TabLink to={`/projects/${id}/brief`}>Brief</TabLink>
        <TabLink to={`/projects/${id}/plan`}>Plan</TabLink>
        <TabLink to={`/projects/${id}/editor`}>Editor</TabLink>
        <TabLink to={`/projects/${id}/export`}>Export</TabLink>
      </div>

      {/* Main content + sidebar */}
      <div className="flex gap-6">
        <div className="flex-1 min-w-0">
          <Outlet context={{ project }} />

          {/* Default overview content when no sub-route */}
          {location.pathname === `/projects/${id}` && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-200">Get started</h2>
              <p className="text-gray-500 text-sm">
                Start by filling in the <Link to={`/projects/${id}/brief`} className="text-indigo-400 hover:underline">Brief</Link> to define your content goals, then generate the editorial plan and write your content.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { to: `/projects/${id}/brief`, label: 'Fill Brief', icon: '📝', step: 1 },
                  { to: `/projects/${id}/plan`, label: 'Review Plan', icon: '🗺️', step: 2 },
                  { to: `/projects/${id}/editor`, label: 'Write Content', icon: '✍️', step: 3 },
                  { to: `/projects/${id}/export`, label: 'Export', icon: '📤', step: 4 },
                ].map((item) => (
                  <Link
                    key={item.step}
                    to={item.to}
                    className="card p-4 hover:border-gray-700 hover:bg-gray-800/50 transition-all text-center"
                  >
                    <div className="text-2xl mb-2">{item.icon}</div>
                    <div className="text-xs text-gray-500 mb-1">Step {item.step}</div>
                    <div className="text-sm font-medium text-gray-300">{item.label}</div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="w-64 shrink-0 hidden xl:block">
          <BudgetWidget projectId={id} />
        </div>
      </div>
    </div>
  )
}
