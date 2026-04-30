import { useState, useEffect } from 'react'
import { getBudget } from '../services/api.js'

function ProgressBar({ value, max, warning }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  const remaining = 100 - pct
  const isWarning = warning && remaining < 20

  return (
    <div className="w-full bg-gray-800 rounded-full h-2">
      <div
        className={`h-2 rounded-full transition-all duration-500 ${
          isWarning ? 'bg-amber-500' : 'bg-indigo-500'
        }`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export default function BudgetWidget({ projectId, budget: externalBudget }) {
  const [budget, setBudget] = useState(externalBudget || null)
  const [loading, setLoading] = useState(!externalBudget && !!projectId)

  useEffect(() => {
    if (externalBudget) {
      setBudget(externalBudget)
      return
    }
    if (!projectId) return

    let cancelled = false
    setLoading(true)
    getBudget(projectId)
      .then((b) => { if (!cancelled) setBudget(b) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [projectId, externalBudget])

  if (loading) {
    return (
      <div className="card p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Budget</h3>
        <div className="space-y-3">
          <div className="h-3 bg-gray-800 rounded-full animate-pulse" />
          <div className="h-3 bg-gray-800 rounded-full animate-pulse w-3/4" />
        </div>
      </div>
    )
  }

  if (!budget) {
    return (
      <div className="card p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Budget</h3>
        <p className="text-xs text-gray-600">No budget configured</p>
      </div>
    )
  }

  const costPct = budget.costLimit > 0
    ? Math.min(100, (budget.costUsed / budget.costLimit) * 100)
    : 0
  const callsPct = budget.callLimit > 0
    ? Math.min(100, (budget.callsUsed / budget.callLimit) * 100)
    : 0

  const costRemaining = 100 - costPct
  const callsRemaining = 100 - callsPct

  return (
    <div className="card p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Budget</h3>

      <div className="space-y-3">
        {/* Cost */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-gray-400">Cost</span>
            <span className={costRemaining < 20 ? 'text-amber-400 font-medium' : 'text-gray-400'}>
              ${(budget.costUsed || 0).toFixed(2)} / ${(budget.costLimit || 0).toFixed(2)}
            </span>
          </div>
          <ProgressBar value={budget.costUsed} max={budget.costLimit} warning />
          {costRemaining < 20 && (
            <p className="text-xs text-amber-400 mt-1">Low budget remaining</p>
          )}
        </div>

        {/* LLM Calls */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-gray-400">LLM Calls</span>
            <span className={callsRemaining < 20 ? 'text-amber-400 font-medium' : 'text-gray-400'}>
              {budget.callsUsed || 0} / {budget.callLimit || 0}
            </span>
          </div>
          <ProgressBar value={budget.callsUsed} max={budget.callLimit} warning />
          {callsRemaining < 20 && (
            <p className="text-xs text-amber-400 mt-1">Few API calls remaining</p>
          )}
        </div>
      </div>
    </div>
  )
}
