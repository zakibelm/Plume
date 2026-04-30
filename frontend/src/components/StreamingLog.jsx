import { useEffect, useRef } from 'react'
import useWorkflowStore from '../store/workflowStore.js'

function EventIcon({ type }) {
  const base = 'w-4 h-4 shrink-0'
  switch (type) {
    case 'agent_start':
      return (
        <svg className={`${base} text-indigo-400`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
      )
    case 'agent_end':
      return (
        <svg className={`${base} text-emerald-400`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )
    case 'agent_error':
      return (
        <svg className={`${base} text-red-400`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      )
    case 'token':
      return (
        <svg className={`${base} text-gray-500`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      )
    case 'quality_score':
      return (
        <svg className={`${base} text-amber-400`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      )
    case 'budget_update':
      return (
        <svg className={`${base} text-purple-400`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4M12 16h.01" />
        </svg>
      )
    case 'workflow_complete':
      return (
        <svg className={`${base} text-emerald-400`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      )
    default:
      return (
        <svg className={`${base} text-gray-600`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="4" />
        </svg>
      )
  }
}

function formatTime(ts) {
  const d = new Date(ts)
  return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function EventRow({ event }) {
  if (event.type === 'token') {
    return (
      <div className="flex items-start gap-2 py-0.5">
        <EventIcon type={event.type} />
        <span className="text-xs text-gray-500 font-mono break-all leading-relaxed">
          {event.content}
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2 py-1">
      <EventIcon type={event.type} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {event.agent && (
            <span className="text-xs font-medium text-indigo-400">{event.agent}</span>
          )}
          <span className="text-xs text-gray-300">
            {event.message || event.type?.replace(/_/g, ' ')}
          </span>
        </div>
      </div>
      <span className="text-xs text-gray-600 shrink-0">{formatTime(event.timestamp)}</span>
    </div>
  )
}

export default function StreamingLog({ maxHeight = '280px' }) {
  const events = useWorkflowStore((s) => s.events)
  const streaming = useWorkflowStore((s) => s.streaming)
  const containerRef = useRef(null)

  // Auto-scroll to bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [events])

  if (events.length === 0) {
    return (
      <div className="card p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
          Event Log
        </h3>
        <div className="flex items-center gap-2 text-sm text-gray-600 py-3">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" />
            <polyline points="13 2 13 9 20 9" />
          </svg>
          <span>No events yet. Start an agent to see the stream.</span>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          Event Log
        </h3>
        <div className="flex items-center gap-2">
          {streaming && (
            <div className="flex items-center gap-1.5 text-xs text-indigo-400">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              Live
            </div>
          )}
          <span className="text-xs text-gray-600">{events.length} events</span>
        </div>
      </div>

      <div
        ref={containerRef}
        className="overflow-y-auto divide-y divide-gray-800/50"
        style={{ maxHeight }}
      >
        {events.map((event, i) => (
          <EventRow key={i} event={event} />
        ))}
      </div>
    </div>
  )
}
