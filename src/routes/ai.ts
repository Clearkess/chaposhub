import { Hono } from 'hono'
import { authMiddleware } from '../lib/auth-middleware'
import type { Bindings, AppVariables } from '../lib/types'

const ai = new Hono<{ Bindings: Bindings; Variables: AppVariables }>()

const VALID_TONES = ['professional', 'friendly', 'casual', 'urgent', 'apologetic']

const TEMPLATES: Record<string, (msg: string) => string> = {
  professional: (msg) => `Thank you for your message regarding "${msg.substring(0, 50)}${msg.length > 50 ? '...' : ''}". I have reviewed the matter and will address it promptly.`,
  friendly: (msg) => `Hey! Thanks for reaching out about "${msg.substring(0, 50)}${msg.length > 50 ? '...' : ''}". I'm on it! Let me know if you need anything else.`,
  casual: (msg) => `Got your message about "${msg.substring(0, 50)}${msg.length > 50 ? '...' : ''}". No worries, I'll sort it out!`,
  urgent: (msg) => `URGENT: Acknowledged. Regarding "${msg.substring(0, 50)}${msg.length > 50 ? '...' : ''}" - action is being taken immediately.`,
  apologetic: (msg) => `I sincerely apologize for any inconvenience regarding "${msg.substring(0, 50)}${msg.length > 50 ? '...' : ''}". Let me make this right for you.`
}

const TONE_INSTRUCTIONS: Record<string, string> = {
  professional: 'Respond in a professional, courteous business tone.',
  friendly: 'Respond in a warm, friendly, conversational tone.',
  casual: 'Respond casually, as if texting a friend.',
  urgent: 'Respond with urgency and immediate action items.',
  apologetic: 'Respond with sincere apology and remediation steps.'
}

ai.post('/reply', authMiddleware, async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const { message, tone } = body

  if (!message || typeof message !== 'string' || message.trim().length === 0 || message.length > 500) {
    return c.json({ error: 'Validation failed', details: 'message is required (max 500 chars)' }, 400)
  }
  if (!tone || !VALID_TONES.includes(tone)) {
    return c.json({ error: 'Validation failed', details: `tone must be one of: ${VALID_TONES.join(', ')}` }, 400)
  }

  const systemPrompt = `You are a helpful assistant. ${TONE_INSTRUCTIONS[tone]} Keep responses concise (2-3 sentences max).`

  // Preferred provider: NoMask (Nemotron 3 Ultra), OpenAI-compatible chat-completions.
  // Falls back to OpenAI if NoMask isn't configured/fails, then to a canned
  // template if neither is configured/available. The API key never leaves
  // this server-side route — the browser only ever calls POST /api/ai/reply.
  if (c.env.NOMASK_API_KEY) {
    try {
      const res = await fetch('https://nomask.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${c.env.NOMASK_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'nemotron-3-ultra_free',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message }
          ],
          max_tokens: 150,
          temperature: 0.7
        })
      })
      const data: any = await res.json()
      if (res.ok && data?.choices?.[0]?.message?.content) {
        return c.json({
          reply: data.choices[0].message.content,
          tone,
          source: 'nomask',
          tokensUsed: data.usage?.total_tokens || 0
        })
      }
      // fall through to OpenAI/template below on API error or unexpected shape
    } catch (error) {
      // fall through to OpenAI/template below on network error
    }
  }

  if (!c.env.OPENAI_API_KEY) {
    return c.json({
      reply: TEMPLATES[tone](message),
      tone,
      source: 'template',
      tokensUsed: 0
    })
  }

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${c.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 150,
        temperature: 0.7
      })
    })
    const data: any = await res.json()
    if (!res.ok) {
      // fall back to template on API error
      return c.json({ reply: TEMPLATES[tone](message), tone, source: 'template-fallback', tokensUsed: 0 })
    }
    return c.json({
      reply: data.choices[0].message.content,
      tone,
      source: 'openai',
      tokensUsed: data.usage?.total_tokens || 0
    })
  } catch (error) {
    return c.json({ reply: TEMPLATES[tone](message), tone, source: 'template-fallback', tokensUsed: 0 })
  }
})

export default ai
