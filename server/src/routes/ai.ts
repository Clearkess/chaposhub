// Ported from src/routes/ai.ts (Hono/Workers version) to Express/Node.
// fetch() is a native global in Node 18+, so the NoMask -> OpenAI -> template
// fallback chain ports essentially verbatim.
import { Router } from 'express'
import { authMiddleware, type AuthedRequest } from '../lib/auth-middleware.js'

const router = Router()

type AIResult = { reply: string; source: 'nomask' | 'openai'; tokensUsed: number }

async function callAIProvider(
  systemPrompt: string,
  userContent: string,
  maxTokens: number
): Promise<AIResult | null> {
  const nomaskKey = process.env.NOMASK_API_KEY
  const openaiKey = process.env.OPENAI_API_KEY

  if (nomaskKey) {
    try {
      const res = await fetch('https://nomask.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${nomaskKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'nemotron-3-ultra_free',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent }
          ],
          max_tokens: maxTokens,
          temperature: 0.7
        })
      })
      const data: any = await res.json()
      if (res.ok && data?.choices?.[0]?.message?.content) {
        return { reply: data.choices[0].message.content, source: 'nomask', tokensUsed: data.usage?.total_tokens || 0 }
      }
    } catch {
      // fall through to OpenAI below on network error
    }
  }

  if (openaiKey) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent }
          ],
          max_tokens: maxTokens,
          temperature: 0.7
        })
      })
      const data: any = await res.json()
      if (res.ok && data?.choices?.[0]?.message?.content) {
        return { reply: data.choices[0].message.content, source: 'openai', tokensUsed: data.usage?.total_tokens || 0 }
      }
    } catch {
      // fall through to template fallback in caller
    }
  }

  return null
}

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

router.post('/reply', authMiddleware, async (req: AuthedRequest, res) => {
  const body = req.body || {}
  const { message, tone } = body

  if (!message || typeof message !== 'string' || message.trim().length === 0 || message.length > 500) {
    return res.status(400).json({ error: 'Validation failed', details: 'message is required (max 500 chars)' })
  }
  if (!tone || !VALID_TONES.includes(tone)) {
    return res.status(400).json({ error: 'Validation failed', details: `tone must be one of: ${VALID_TONES.join(', ')}` })
  }

  const systemPrompt = `You are a helpful assistant. ${TONE_INSTRUCTIONS[tone]} Keep responses concise (2-3 sentences max).`

  const result = await callAIProvider(systemPrompt, message, 150)
  if (result) {
    return res.json({ reply: result.reply, tone, source: result.source, tokensUsed: result.tokensUsed })
  }

  return res.json({
    reply: TEMPLATES[tone](message),
    tone,
    source: process.env.NOMASK_API_KEY || process.env.OPENAI_API_KEY ? 'template-fallback' : 'template',
    tokensUsed: 0
  })
})

type ToolOptions = { tone?: string; platform?: string; style?: string; language?: string }

interface ToolConfig {
  label: string
  maxInputLen: number
  maxTokens: number
  buildSystemPrompt: (opts: ToolOptions) => string
  fallback: (input: string, opts: ToolOptions) => string
}

const GENERIC_FALLBACK = (label: string) =>
  `AI is temporarily unavailable for ${label} right now. Please try again in a moment.`

const TOOL_CONFIGS: Record<string, ToolConfig> = {
  content: {
    label: 'Content Generator',
    maxInputLen: 500,
    maxTokens: 450,
    buildSystemPrompt: (opts) =>
      `You are an expert content writer. Write clear, engaging, well-structured content based on the user's topic or brief.${opts.tone ? ` Use a ${opts.tone} tone.` : ''} Aim for 150-300 words unless the brief specifies otherwise.`,
    fallback: () => GENERIC_FALLBACK('content generation')
  },
  social: {
    label: 'Social Media Captions',
    maxInputLen: 300,
    maxTokens: 150,
    buildSystemPrompt: (opts) =>
      `You are a social media expert. Write a short, catchy caption${opts.platform ? ` for ${opts.platform}` : ''} based on the user's topic, including relevant emojis and 3-5 hashtags.${opts.tone ? ` Tone: ${opts.tone}.` : ''} Keep it concise and scroll-stopping.`,
    fallback: () => GENERIC_FALLBACK('caption generation')
  },
  product: {
    label: 'Product Descriptions',
    maxInputLen: 400,
    maxTokens: 220,
    buildSystemPrompt: (opts) =>
      `You are an e-commerce copywriter. Write a persuasive, benefit-focused product description (2-4 sentences) that highlights key features and encourages purchase.${opts.tone ? ` Tone: ${opts.tone}.` : ''}`,
    fallback: () => GENERIC_FALLBACK('product description generation')
  },
  email_gen: {
    label: 'Email Generator',
    maxInputLen: 500,
    maxTokens: 350,
    buildSystemPrompt: (opts) =>
      `You are a professional email writer. Write a complete, well-formatted email (including a subject line) based on the user's brief.${opts.tone ? ` Tone: ${opts.tone}.` : ''}`,
    fallback: () => GENERIC_FALLBACK('email generation')
  },
  rewrite: {
    label: 'Rewrite / Improve Text',
    maxInputLen: 2000,
    maxTokens: 450,
    buildSystemPrompt: (opts) =>
      `You are an expert editor. Rewrite and improve the given text for clarity, grammar, and flow, keeping the original meaning and language. Style: ${opts.style || 'clear and polished'}. Return only the rewritten text.`,
    fallback: (input) => input
  },
  chat: {
    label: 'General AI Chat',
    maxInputLen: 1000,
    maxTokens: 350,
    buildSystemPrompt: () =>
      `You are a helpful, knowledgeable AI assistant. Answer the user's question or engage in conversation naturally and concisely.`,
    fallback: () => GENERIC_FALLBACK('chat')
  },
  longform: {
    label: 'Long-Form Content',
    maxInputLen: 500,
    maxTokens: 1200,
    buildSystemPrompt: (opts) =>
      `You are a professional writer. Write a detailed, well-structured long-form piece (article/blog post) with clear headings and paragraphs, based on the user's topic.${opts.tone ? ` Tone: ${opts.tone}.` : ''} Aim for 500-800 words.`,
    fallback: () => GENERIC_FALLBACK('long-form content generation')
  },
  code: {
    label: 'Coding Assistant',
    maxInputLen: 2000,
    maxTokens: 700,
    buildSystemPrompt: (opts) =>
      `You are an expert software engineer. Help with the user's coding request: write code, debug, explain, or refactor as needed. Use markdown code blocks with language tags.${opts.language ? ` Preferred language: ${opts.language}.` : ''}`,
    fallback: () => GENERIC_FALLBACK('code generation')
  }
}

router.post('/generate', authMiddleware, async (req: AuthedRequest, res) => {
  const body = req.body || {}
  const { tool, input, tone, platform, style, language } = body

  const config = typeof tool === 'string' ? TOOL_CONFIGS[tool] : undefined
  if (!config) {
    return res.status(400).json({ error: 'Validation failed', details: `tool must be one of: ${Object.keys(TOOL_CONFIGS).join(', ')}` })
  }
  if (!input || typeof input !== 'string' || input.trim().length === 0 || input.length > config.maxInputLen) {
    return res.status(400).json({ error: 'Validation failed', details: `input is required (max ${config.maxInputLen} chars)` })
  }

  const opts: ToolOptions = { tone, platform, style, language }
  const systemPrompt = config.buildSystemPrompt(opts)

  const result = await callAIProvider(systemPrompt, input, config.maxTokens)
  if (result) {
    return res.json({ reply: result.reply, tool, source: result.source, tokensUsed: result.tokensUsed })
  }

  return res.json({
    reply: config.fallback(input, opts),
    tool,
    source: process.env.NOMASK_API_KEY || process.env.OPENAI_API_KEY ? 'template-fallback' : 'template',
    tokensUsed: 0
  })
})

export default router
