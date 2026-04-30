import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import useProjectStore from '../store/projectStore.js'
import useAuthStore from '../store/authStore.js'

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'text-gray-400 bg-gray-800' },
  briefed: { label: 'Briefed', color: 'text-blue-400 bg-blue-500/10' },
  planned: { label: 'Planned', color: 'text-indigo-400 bg-indigo-500/10' },
  writing: { label: 'Writing', color: 'text-amber-400 bg-amber-500/10' },
  review: { label: 'In Review', color: 'text-purple-400 bg-purple-500/10' },
  completed: { label: 'Completed', color: 'text-emerald-400 bg-emerald-500/10' },
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  )
}

function ScoreChip({ score }) {
  if (score == null) return null
  const color = score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-amber-400' : 'text-red-400'
  return (
    <span className={`text-sm font-semibold ${color}`}>{score}</span>
  )
}

function ProjectCard({ project }) {
  const date = new Date(project.createdAt || project.created_at)
  const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <Link
      to={`/projects/${project.id}`}
      className="card p-5 hover:border-gray-700 hover:bg-gray-800/50 transition-all duration-150 group block"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="font-medium text-gray-200 group-hover:text-white transition-colors line-clamp-2 leading-snug">
          {project.name}
        </h3>
        <StatusBadge status={project.status} />
      </div>

      <p className="text-xs text-gray-500 mb-3 capitalize">
        {(project.contentType || project.content_type || '').replace(/_/g, ' ')}
      </p>

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-600">{formattedDate}</span>
        <ScoreChip score={project.qualityScore ?? project.quality_score} />
      </div>
    </Link>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gray-900 border border-gray-800 flex items-center justify-center mb-4">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.5">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="12" y1="18" x2="12" y2="12" />
          <line x1="9" y1="15" x2="15" y2="15" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-300 mb-2">No projects yet</h3>
      <p className="text-sm text-gray-500 mb-6 max-w-xs">
        Create your first AI-generated content project and start building with Plume.
      </p>
      <Link to="/projects/new" className="btn-primary flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        New Project
      </Link>
    </div>
  )
}

export default function DashboardPage() {
  const { projects, loading, fetchProjects } = useProjectStore()
  const { user } = useAuthStore()

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">
            {greeting()}{user?.email ? `, ${user.email.split('@')[0]}` : ''}
          </h1>
          <p className="text-gray-500 mt-1">
            {projects.length > 0
              ? `You have ${projects.length} project${projects.length > 1 ? 's' : ''}`
              : 'Ready to create something great?'}
          </p>
        </div>
        <Link to="/projects/new" className="btn-primary flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Project
        </Link>
      </div>

      {/* Stats bar */}
      {projects.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: 'Total',
              value: projects.length,
              icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                </svg>
              ),
            },
            {
              label: 'Completed',
              value: projects.filter((p) => p.status === 'completed').length,
              icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ),
            },
            {
              label: 'In Progress',
              value: projects.filter((p) => ['writing', 'review', 'planned', 'briefed'].includes(p.status)).length,
              icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              ),
            },
            {
              label: 'Avg Score',
              value: (() => {
                const scored = projects.filter((p) => (p.qualityScore ?? p.quality_score) != null)
                if (!scored.length) return '—'
                const avg = scored.reduce((sum, p) => sum + (p.qualityScore ?? p.quality_score), 0) / scored.length
                return Math.round(avg)
              })(),
              icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              ),
            },
          ].map((stat) => (
            <div key={stat.label} className="card p-4">
              <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
                {stat.icon}
                <span>{stat.label}</span>
              </div>
              <p className="text-2xl font-bold text-gray-100">{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Projects grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-4 bg-gray-800 rounded mb-3 w-3/4" />
              <div className="h-3 bg-gray-800 rounded mb-4 w-1/3" />
              <div className="h-3 bg-gray-800 rounded w-1/4" />
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  )
}
