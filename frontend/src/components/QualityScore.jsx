const CRITERIA_LABELS = {
  clarity:             'Clarté',
  audience_fit:        'Pertinence audience',
  credibility:         'Crédibilité',
  utility:             'Utilité',
  human_style:         'Style humain',
  brand_voice:         'Voix de marque',
  conversion:          'Conversion',
  originality:         'Originalité',
  objective_alignment: 'Alignement objectif',
  ai_risk:             'Risque IA',
}

function CircleGauge({ score }) {
  const radius = 36
  const circumference = 2 * Math.PI * radius
  // score is /10 from the backend; normalise to 0-100 for the arc
  const pct = ((score || 0) / 10) * 100
  const filled = (pct / 100) * circumference
  const gap = circumference - filled

  const color =
    pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444'

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="96" height="96" className="-rotate-90">
        {/* Background track */}
        <circle
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          stroke="#374151"
          strokeWidth="8"
        />
        {/* Progress arc */}
        <circle
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={`${filled} ${gap}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold text-gray-100">{score != null ? score.toFixed(1) : '—'}</span>
        <span className="text-xs text-gray-500">/ 10</span>
      </div>
    </div>
  )
}

function DecisionBadge({ decision }) {
  if (!decision) return null
  const config = {
    'ACCEPTÉ': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    'À CORRIGER': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    'BLOQUÉ': 'bg-red-500/20 text-red-400 border-red-500/30',
  }
  const cls = config[decision] || 'bg-gray-700 text-gray-400 border-gray-600'

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${cls}`}>
      {decision}
    </span>
  )
}

function CriterionBar({ label, value }) {
  const pct = Math.min(100, Math.max(0, value || 0))
  const color =
    pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500'

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-400 w-28 shrink-0">{label}</span>
      <div className="flex-1 bg-gray-800 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-400 w-7 text-right">{value ?? '—'}</span>
    </div>
  )
}

// Accepts result from the backend QualityAgent:
// { global_score, clarity, audience_fit, credibility, utility, human_style,
//   brand_voice, conversion, originality, objective_alignment, ai_risk,
//   feedback, decision }
export default function QualityScore({ result, compact = false }) {
  if (!result) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
          Score qualité
        </h3>
        <p className="text-sm text-gray-600 text-center py-4">Pas encore évalué</p>
      </div>
    )
  }

  if (compact) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-4">
        <CircleGauge score={result.global_score} />
        <div>
          <DecisionBadge decision={result.decision} />
          {result.feedback && <p className="text-xs text-gray-400 mt-2 leading-relaxed">{result.feedback}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">
        Score qualité
      </h3>

      <div className="flex items-center gap-4 mb-4">
        <CircleGauge score={result.global_score} />
        <div className="flex-1">
          <DecisionBadge decision={result.decision} />
        </div>
      </div>

      {result.feedback && (
        <p className="text-xs text-gray-400 mb-4 leading-relaxed">{result.feedback}</p>
      )}

      <div className="space-y-2">
        {Object.entries(CRITERIA_LABELS).map(([key, label]) => (
          <CriterionBar
            key={key}
            label={label}
            value={result[key] != null ? (result[key] * 10) : undefined}
          />
        ))}
      </div>
    </div>
  )
}
