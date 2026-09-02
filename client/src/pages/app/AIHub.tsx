import React, { useMemo, useState } from 'react'
import PageHeader from '../../components/PageHeader'
import { AI_TOOLS, CONFIG } from '../../lib/config'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { api, APIError } from '../../api/client'

// Ported from `#page-ai` + AI_TOOLS / setAITool() / generateAIContent() in
// public/static/js/app.js.
export default function AIHub() {
  const { user, refreshUser } = useAuth()
  const { showToast } = useToast()

  const [toolKey, setToolKey] = useState('reply')
  const [input, setInput] = useState('')
  const [extraValues, setExtraValues] = useState<Record<string, string>>({})
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)

  const tool = AI_TOOLS[toolKey]
  const cost = CONFIG.points[tool.costKey] || 0

  function selectTool(key: string) {
    const t = AI_TOOLS[key]
    setToolKey(key)
    setInput('')
    setOutput('')
    const defaults: Record<string, string> = {}
    t.extras.forEach((f) => {
      defaults[f.id] = f.options[0]
    })
    setExtraValues(defaults)
  }

  const extras = useMemo(() => {
    const defaults: Record<string, string> = {}
    tool.extras.forEach((f) => {
      defaults[f.id] = extraValues[f.id] ?? f.options[0]
    })
    return defaults
  }, [tool, extraValues])

  async function generate() {
    if ((user?.points || 0) < cost) {
      showToast(`❌ Need ${cost} points for ${tool.label}`, 'error')
      return
    }
    const trimmed = input.trim()
    if (!trimmed) {
      showToast('Please enter some input')
      return
    }

    const opts: Record<string, string> = {}
    tool.extras.forEach((f) => {
      const val = extras[f.id]
      if (f.id.startsWith('aiTone')) opts.tone = val
      else if (f.id === 'aiPlatform') opts.platform = val
      else if (f.id === 'aiStyle') opts.style = val
      else if (f.id === 'aiLanguage') opts.language = val
    })

    setLoading(true)
    try {
      let res: { reply: string }
      let description: string
      if (toolKey === 'reply') {
        const tone = opts.tone || 'professional'
        res = await api.generateAIReply(trimmed, tone)
        description = tone.charAt(0).toUpperCase() + tone.slice(1) + ' tone'
      } else {
        res = await api.generateAIContent(toolKey, trimmed, opts)
        description = tool.label
      }
      setOutput(res.reply)
      await api.deductPoints(cost, tool.costKey, description)
      await refreshUser()
      showToast(`✨ ${tool.label} generated! (-${cost} pts)`, 'success')
    } catch (err) {
      if (err instanceof APIError && err.status === 401) {
        showToast('❌ Please log in again', 'error')
      } else {
        showToast('❌ ' + (err instanceof Error ? err.message : 'Something went wrong'), 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  function copyOutput() {
    if (!output) return
    navigator.clipboard
      .writeText(output)
      .then(() => showToast('📋 Copied to clipboard!', 'success'))
      .catch(() => showToast('❌ Could not copy'))
  }

  return (
    <div className="page active" role="main" aria-label="AI Assistant">
      <PageHeader title="🤖 Chapo'sHub AI" />
      <div className="ai-tool-scroll" role="tablist" aria-label="AI tools">
        {Object.entries(AI_TOOLS).map(([key, t]) => (
          <div
            key={key}
            className={`ai-tool-chip ${key === toolKey ? 'active' : ''}`}
            onClick={() => selectTool(key)}
            role="tab"
            aria-selected={key === toolKey}
          >
            {t.icon} {t.label}
          </div>
        ))}
      </div>
      <div style={{ padding: '0 1rem 1rem' }}>
        <div className="ai-card">
          <div style={{ fontSize: '.85rem', fontWeight: 700, marginBottom: '.8rem' }}>{tool.prompt}</div>
          <textarea
            className="ai-input"
            placeholder={tool.placeholder}
            required
            maxLength={tool.maxLen}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <div>
            {tool.extras.map((f) => (
              <select
                key={f.id}
                className="ai-extra-field"
                value={extras[f.id]}
                onChange={(e) => setExtraValues((prev) => ({ ...prev, [f.id]: e.target.value }))}
              >
                {f.options.map((o) => (
                  <option key={o} value={o}>
                    {o.charAt(0).toUpperCase() + o.slice(1)}
                  </option>
                ))}
              </select>
            ))}
          </div>
          <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', textAlign: 'right', margin: '-.5rem 0 .6rem' }}>
            {input.length} / {tool.maxLen}
          </div>
          <button className="ai-generate-btn" onClick={generate} disabled={loading}>
            {loading ? '✨ Generating...' : `${tool.btnLabel} (${cost} pts)`}
          </button>
          {output && <div className="ai-output show">{output}</div>}
          {output && (
            <div className="ai-output-actions" style={{ display: 'flex' }}>
              <button className="action-btn secondary" onClick={copyOutput}>
                📋 Copy
              </button>
              <button className="action-btn secondary" onClick={() => setOutput('')}>
                🗑️ Clear
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
