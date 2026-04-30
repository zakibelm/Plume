import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getProject, getBrief, getBrandVoices, runAgent } from '../services/api.js'
import useWorkflowStore from '../store/workflowStore.js'
import AgentStatus from '../components/AgentStatus.jsx'
import QualityScore from '../components/QualityScore.jsx'
import StreamingLog from '../components/StreamingLog.jsx'
import BudgetWidget from '../components/BudgetWidget.jsx'

const STEPS = ['writer', 'humanizer', 'brand_voice', 'critic']

export default function EditorPage() {
  const { id: projectId } = useParams()
  const [project, setProject]       = useState(null)
  const [brief, setBrief]           = useState(null)
  const [plan, setPlan]             = useState(null)
  const [sections, setSections]     = useState([])
  const [activeSection, setActiveSection] = useState(0)
  const [brandVoices, setBrandVoices] = useState([])
  const [selectedVoice, setSelectedVoice] = useState('')
  const [loading, setLoading]       = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError]           = useState(null)
  const [qualityResult, setQualityResult] = useState(null)
  const [phase, setPhase]           = useState('write') // write | humanize | brand_voice | critic | done

  const { events, tokenBuffer, addEvent, reset } = useWorkflowStore()

  useEffect(() => {
    async function load() {
      try {
        const [proj, br, voices] = await Promise.all([
          getProject(projectId),
          getBrief(projectId),
          getBrandVoices(),
        ])
        setProject(proj)
        setBrief(br)
        setBrandVoices(voices)

        // Find the latest plan from content_versions
        const planVersion = proj.content_versions?.find((v) => v.step === 'architect')
        if (planVersion) {
          try {
            const parsed = JSON.parse(planVersion.content)
            setPlan(parsed)
            const sectionList = parsed.sections || parsed.structure || []
            setSections(sectionList.map((s) => ({ ...s, content: '', status: 'pending' })))
          } catch {
            setPlan({ title: planVersion.content })
          }
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => reset()
  }, [projectId])

  async function generateSection(idx) {
    const section = sections[idx]
    setGenerating(true)
    setError(null)

    try {
      addEvent({ type: 'step_started', step: `write_section_${idx + 1}` })

      const result = await runAgent('writer', projectId, {
        brief,
        plan,
        section,
        sectionIndex: idx,
        previousSections: sections.slice(0, idx).map((s) => s.content),
      })

      setSections((prev) => {
        const updated = [...prev]
        updated[idx] = { ...updated[idx], content: result.output || result, status: 'done' }
        return updated
      })

      addEvent({ type: 'step_completed', step: `write_section_${idx + 1}` })

      // Auto-advance to next section
      if (idx + 1 < sections.length) {
        setActiveSection(idx + 1)
      } else {
        setPhase('humanize')
      }
    } catch (err) {
      setError(err.message)
      addEvent({ type: 'error', message: err.message, code: 'WRITE_FAILED' })
    } finally {
      setGenerating(false)
    }
  }

  async function runPhase(agentName, phaseInput) {
    setGenerating(true)
    setError(null)
    addEvent({ type: 'step_started', step: agentName })

    try {
      const fullText = sections.map((s) => s.content).join('\n\n')
      const result = await runAgent(agentName, projectId, {
        text: fullText,
        brief,
        ...(agentName === 'brand-voice' && { brandVoice: brandVoices.find((v) => v.id === selectedVoice) }),
        ...phaseInput,
      })

      if (agentName === 'critic') {
        setQualityResult(result.output || result)
        setPhase('done')
      } else {
        const output = result.output || result
        const humanizedText = typeof output === 'string' ? output : JSON.stringify(output)
        const updatedSections = humanizedText.split('\n\n').map((chunk, i) => ({
          ...(sections[i] || {}),
          content: chunk,
          status: 'done',
        }))
        setSections(updatedSections)
        setPhase(agentName === 'humanizer' ? 'brand_voice' : agentName === 'brand-voice' ? 'critic' : 'done')
      }

      addEvent({ type: 'step_completed', step: agentName })
    } catch (err) {
      setError(err.message)
      addEvent({ type: 'error', message: err.message, code: 'PHASE_FAILED' })
    } finally {
      setGenerating(false)
    }
  }

  if (loading) return <div className="p-8 text-gray-400">Chargement...</div>
  if (error && !project) return <div className="p-8 text-red-400">{error}</div>

  const allSectionsDone = sections.length > 0 && sections.every((s) => s.status === 'done')

  return (
    <div className="flex h-full gap-0">
      {/* Left — section list */}
      <div className="w-56 border-r border-gray-800 p-4 flex flex-col gap-2 overflow-y-auto">
        <p className="text-xs uppercase text-gray-500 font-semibold mb-2">Sections</p>
        {sections.length === 0 && (
          <p className="text-gray-500 text-sm">
            Aucun plan trouvé.{' '}
            <Link to={`/projects/${projectId}/plan`} className="text-indigo-400 underline">
              Générer le plan d'abord
            </Link>
          </p>
        )}
        {sections.map((s, i) => (
          <button
            key={i}
            onClick={() => setActiveSection(i)}
            className={`text-left text-sm px-3 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              activeSection === i
                ? 'bg-indigo-600 text-white'
                : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            {s.status === 'done' ? (
              <span className="text-green-400">✓</span>
            ) : (
              <span className="text-gray-600">○</span>
            )}
            <span className="truncate">{s.title || s.heading || `Section ${i + 1}`}</span>
          </button>
        ))}
      </div>

      {/* Center — editor */}
      <div className="flex-1 flex flex-col p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">
            {sections[activeSection]?.title || sections[activeSection]?.heading || `Section ${activeSection + 1}`}
          </h2>
          <div className="flex gap-2">
            {phase === 'write' && (
              <button
                onClick={() => generateSection(activeSection)}
                disabled={generating}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
              >
                {generating ? 'Génération...' : 'Générer la section'}
              </button>
            )}
            {phase === 'humanize' && allSectionsDone && (
              <button
                onClick={() => runPhase('humanizer', {})}
                disabled={generating}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm rounded-lg"
              >
                {generating ? 'Humanisation...' : 'Humaniser le texte'}
              </button>
            )}
            {phase === 'brand_voice' && (
              <div className="flex gap-2 items-center">
                <select
                  value={selectedVoice}
                  onChange={(e) => setSelectedVoice(e.target.value)}
                  className="bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded-lg px-3 py-2"
                >
                  <option value="">Voix de marque (optionnel)</option>
                  {brandVoices.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => runPhase('brand-voice', {})}
                  disabled={generating}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-sm rounded-lg"
                >
                  {generating ? 'Application...' : 'Appliquer la voix'}
                </button>
              </div>
            )}
            {phase === 'critic' && (
              <button
                onClick={() => runPhase('critic', {})}
                disabled={generating}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-sm rounded-lg"
              >
                {generating ? 'Critique en cours...' : 'Analyser (Avocat du diable)'}
              </button>
            )}
            {phase === 'done' && (
              <Link
                to={`/projects/${projectId}/export`}
                className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm rounded-lg"
              >
                Exporter →
              </Link>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        <textarea
          value={sections[activeSection]?.content || (generating ? tokenBuffer : '')}
          onChange={(e) => {
            setSections((prev) => {
              const updated = [...prev]
              if (updated[activeSection]) {
                updated[activeSection] = { ...updated[activeSection], content: e.target.value }
              }
              return updated
            })
          }}
          placeholder={generating ? 'Génération en cours...' : 'Le contenu généré apparaîtra ici. Vous pouvez aussi éditer manuellement.'}
          className="flex-1 bg-gray-900 border border-gray-700 rounded-xl p-4 text-gray-200 text-sm leading-relaxed resize-none font-mono min-h-[400px] focus:outline-none focus:border-indigo-500"
        />

        {qualityResult && (
          <div className="mt-4">
            <QualityScore result={qualityResult} compact={false} />
          </div>
        )}
      </div>

      {/* Right panel */}
      <div className="w-72 border-l border-gray-800 flex flex-col gap-4 p-4 overflow-y-auto">
        <BudgetWidget projectId={projectId} />
        <AgentStatus />
        <StreamingLog events={events} />
      </div>
    </div>
  )
}
