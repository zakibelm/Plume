import useWorkflowStore from '../store/workflowStore.js'

const AGENTS = [
  { name: 'StrategistAgent', label: 'Strategist' },
  { name: 'ArchitectAgent', label: 'Architect' },
  { name: 'WriterAgent', label: 'Writer' },
  { name: 'HumanizerAgent', label: 'Humanizer' },
  { name: 'BrandVoiceAgent', label: 'Brand Voice' },
  { name: 'CriticAgent', label: 'Critic' },
]

function StatusIcon({ status }) {
  if (status === 'running') {
    return (
      <svg className="animate-spin h-4 w-4 text-indigo-400" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    )
  }
  if (status === 'success') {
    return (
      <svg className="h-4 w-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    )
  }
  if (status === 'failed') {
    return (
      <svg className="h-4 w-4 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    )
  }
  // pending
  return <span className="h-4 w-4 rounded-full border-2 border-gray-700 block" />
}

function statusLabel(status) {
  switch (status) {
    case 'running': return 'Running'
    case 'success': return 'Done'
    case 'failed': return 'Failed'
    default: return 'Pending'
  }
}

function statusColor(status) {
  switch (status) {
    case 'running': return 'text-indigo-400'
    case 'success': return 'text-emerald-400'
    case 'failed': return 'text-red-400'
    default: return 'text-gray-600'
  }
}

export default function AgentStatus({ agents = null }) {
  const steps = useWorkflowStore((s) => s.steps)
  const currentStep = useWorkflowStore((s) => s.currentStep)

  const agentsToShow = agents || AGENTS

  return (
    <div className="card p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
        Agent Pipeline
      </h3>
      <div className="space-y-2">
        {agentsToShow.map((agent) => {
          const step = steps[agent.name] || {}
          const status = step.status || 'pending'
          const isActive = currentStep === agent.name

          return (
            <div
              key={agent.name}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive ? 'bg-indigo-600/10 border border-indigo-600/20' : 'bg-gray-800/50'
              }`}
            >
              <StatusIcon status={status} />
              <div className="flex-1 min-w-0">
                <span className="text-sm text-gray-300">{agent.label}</span>
                {step.error && (
                  <p className="text-xs text-red-400 mt-0.5 truncate">{step.error}</p>
                )}
              </div>
              <span className={`text-xs font-medium ${statusColor(status)}`}>
                {statusLabel(status)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
