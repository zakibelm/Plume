import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getProject, exportMarkdown, exportHtml } from '../services/api.js'
import QualityScore from '../components/QualityScore.jsx'

export default function ExportPage() {
  const { id: projectId } = useParams()
  const [project, setProject]           = useState(null)
  const [content, setContent]           = useState('')
  const [qualityScore, setQualityScore] = useState(null)
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)
  const [exporting, setExporting]       = useState(null)
  const [copied, setCopied]             = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const proj = await getProject(projectId)
        setProject(proj)

        // Get the latest content version
        const versions = proj.content_versions || []
        const latest = versions[versions.length - 1]
        if (latest) setContent(latest.content || '')

        // Get quality score if available
        if (proj.global_score) {
          setQualityScore({ global_score: proj.global_score })
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [projectId])

  async function handleExport(format) {
    setExporting(format)
    try {
      const blob = format === 'markdown'
        ? await exportMarkdown(projectId)
        : await exportHtml(projectId)

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${project?.name || 'plume'}.${format === 'markdown' ? 'md' : 'html'}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err.message)
    } finally {
      setExporting(null)
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Impossible de copier dans le presse-papiers')
    }
  }

  if (loading) return <div className="p-8 text-gray-400">Chargement...</div>
  if (error && !project) return <div className="p-8 text-red-400">{error}</div>

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{project?.name}</h1>
          <p className="text-gray-400 text-sm mt-1">Export du contenu final</p>
        </div>
        <Link
          to={`/projects/${projectId}/editor`}
          className="text-gray-400 hover:text-white text-sm"
        >
          ← Retour à l'éditeur
        </Link>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">{error}</div>
      )}

      {/* Quality summary */}
      {qualityScore && (
        <div className="mb-6">
          <QualityScore result={qualityScore} compact />
        </div>
      )}

      {/* Export buttons */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={handleCopy}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
        >
          {copied ? '✓ Copié !' : 'Copier le texte'}
        </button>
        <button
          onClick={() => handleExport('markdown')}
          disabled={!!exporting || !content}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
        >
          {exporting === 'markdown' ? 'Export...' : '↓ Markdown (.md)'}
        </button>
        <button
          onClick={() => handleExport('html')}
          disabled={!!exporting || !content}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
        >
          {exporting === 'html' ? 'Export...' : '↓ HTML (.html)'}
        </button>
      </div>

      {/* Content preview */}
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
        {!content ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">Aucun contenu à exporter.</p>
            <Link
              to={`/projects/${projectId}/editor`}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg"
            >
              Aller à l'éditeur
            </Link>
          </div>
        ) : (
          <pre className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap font-mono">
            {content}
          </pre>
        )}
      </div>
    </div>
  )
}
