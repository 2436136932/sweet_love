import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenAI } from '@google/genai'
import { env } from './config.js'
import { prisma } from './db.js'

// 应用内部统一使用这套消息结构，各 provider 适配器负责转换成自己的请求格式。
export type AiMessageRole = 'system' | 'user' | 'assistant'

export type AiMessage = {
  role: AiMessageRole
  content: string
}

export type AiChatOptions = {
  maxTokens?: number
  model?: string
  temperature?: number
  timeoutMs?: number
}

export type AiChatResult = {
  content: string
  model?: string
  usage?: unknown
}

// 统一 AI 错误类型：路由层只需要识别 AiError，就能给前端返回一致的错误语义。
export class AiError extends Error {
  provider?: string
  status?: number

  constructor(message: string, status?: number, provider?: string) {
    super(message)
    this.name = 'AiError'
    this.status = status
    this.provider = provider
  }
}

// 只检查当前 AI_PROVIDER 对应的必需配置，未选中的 provider 可以不配置。
export async function isAiConfigured() {
  const cfg = await getEffectiveAiConfig()
  return cfg.configured
}

type EffectiveAiConfig = {
  provider: 'openai-compatible' | 'gemini' | 'claude'
  configured: boolean
  openaiCompatible: {
    apiKey?: string
    baseUrl?: string
    model?: string
    maxTokens: number
    temperature: number
    timeoutMs: number
  }
  gemini: {
    apiKey?: string
    model: string
    maxTokens: number
    temperature: number
    timeoutMs: number
  }
  claude: {
    apiKey?: string
    model: string
    maxTokens: number
    timeoutMs: number
  }
}

// 把 .env 默认配置与数据库 AiConfig 行合并：数据库中非空字段优先于 .env。
export async function getEffectiveAiConfig(): Promise<EffectiveAiConfig> {
  let row: any = null
  try {
    row = await prisma.aiConfig.findUnique({ where: { id: 'singleton' } })
  } catch {
    row = null
  }
  const base = env.ai
  const useDb = Boolean(row && row.enabled)

  const openaiCompatible = {
    apiKey: (useDb && row.openaiApiKey) || base.openaiCompatible.apiKey,
    baseUrl: (
      (useDb && row.openaiBaseUrl) ||
      base.openaiCompatible.baseUrl
    )?.replace(/\/+$/, ''),
    model: (useDb && row.openaiModel) || base.openaiCompatible.model,
    maxTokens:
      (useDb && row.openaiMaxTokens) || base.openaiCompatible.maxTokens,
    temperature:
      useDb && typeof row.openaiTemperature === 'number'
        ? row.openaiTemperature
        : base.openaiCompatible.temperature,
    timeoutMs: (useDb && row.openaiTimeoutMs) || base.openaiCompatible.timeoutMs
  }
  const gemini = {
    apiKey: (useDb && row.geminiApiKey) || base.gemini.apiKey,
    model: (useDb && row.geminiModel) || base.gemini.model,
    maxTokens: (useDb && row.geminiMaxTokens) || base.gemini.maxTokens,
    temperature:
      useDb && typeof row.geminiTemperature === 'number'
        ? row.geminiTemperature
        : base.gemini.temperature,
    timeoutMs: (useDb && row.geminiTimeoutMs) || base.gemini.timeoutMs
  }
  const claude = {
    apiKey: (useDb && row.claudeApiKey) || base.claude.apiKey,
    model: (useDb && row.claudeModel) || base.claude.model,
    maxTokens: (useDb && row.claudeMaxTokens) || base.claude.maxTokens,
    timeoutMs: (useDb && row.claudeTimeoutMs) || base.claude.timeoutMs
  }

  const provider = (useDb && row.provider) || base.provider
  let configured = false
  if (provider === 'openai-compatible') {
    configured = Boolean(
      openaiCompatible.apiKey &&
      openaiCompatible.baseUrl &&
      openaiCompatible.model
    )
  } else if (provider === 'gemini') {
    configured = Boolean(gemini.apiKey)
  } else if (provider === 'claude') {
    configured = Boolean(claude.apiKey)
  }

  return { provider, configured, openaiCompatible, gemini, claude }
}

function assertConfigured(configured: boolean, provider: string) {
  if (!configured) {
    throw new AiError(`${provider} AI is not configured`, 503, provider)
  }
}

function readErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== 'object') return undefined
  const data = payload as any
  if (typeof data.message === 'string') return data.message
  if (typeof data.detail === 'string') return data.detail
  if (typeof data.error === 'string') return data.error
  if (data.error && typeof data.error.message === 'string')
    return data.error.message
  return undefined
}

async function readResponseBody(res: Response) {
  const text = await res.text()
  if (!text) return undefined
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

// Gemini 和 Claude SDK 没有复用 fetch 的 AbortController，这里统一包一层请求超时。
async function withTimeout<T>(
  task: Promise<T>,
  timeoutMs: number,
  provider: string
): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined
  const timeoutTask = new Promise<never>((_, reject) => {
    timeout = setTimeout(
      () =>
        reject(
          new AiError(
            `${provider} AI request timed out after ${timeoutMs}ms`,
            504,
            provider
          )
        ),
      timeoutMs
    )
  })

  try {
    return await Promise.race([task, timeoutTask])
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}

// Claude/Gemini 都把 system prompt 放在独立字段，不能像 OpenAI-compatible 那样混在 messages 里。
function splitSystemMessages(messages: AiMessage[]) {
  const system = messages
    .filter((message) => message.role === 'system')
    .map((message) => message.content)
    .join('\n\n')
  const chatMessages = messages.filter(
    (message) => message.role !== 'system'
  ) as Array<AiMessage & { role: 'user' | 'assistant' }>
  return { system, chatMessages }
}

// 兼容 OpenAI Chat Completions 协议的供应商：OpenAI、DeepSeek、通义千问兼容模式、Moonshot 等。
async function chatWithOpenAiCompatible(
  messages: AiMessage[],
  options: AiChatOptions
): Promise<AiChatResult> {
  const provider = 'openai-compatible'
  const effective = await getEffectiveAiConfig()
  const config = effective.openaiCompatible
  assertConfigured(
    effective.provider === provider &&
      Boolean(config.apiKey && config.baseUrl && config.model),
    provider
  )

  const timeoutMs = options.timeoutMs ?? config.timeoutMs
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: options.model ?? config.model,
        messages,
        max_tokens: options.maxTokens ?? config.maxTokens,
        temperature: options.temperature ?? config.temperature
      }),
      signal: controller.signal
    })

    const payload = await readResponseBody(res)
    if (!res.ok) {
      const message =
        readErrorMessage(payload) ||
        `OpenAI-compatible AI request failed with status ${res.status}`
      throw new AiError(message, res.status, provider)
    }

    const data = payload as any
    const content = data?.choices?.[0]?.message?.content
    if (typeof content !== 'string') {
      throw new AiError('Invalid OpenAI-compatible AI response', 502, provider)
    }

    return {
      content,
      model: typeof data.model === 'string' ? data.model : undefined,
      usage: data.usage
    }
  } catch (error) {
    if (error instanceof AiError) throw error
    if (error instanceof Error && error.name === 'AbortError') {
      throw new AiError(
        `OpenAI-compatible AI request timed out after ${timeoutMs}ms`,
        504,
        provider
      )
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

// Gemini 会把 assistant 角色称为 model，文本内容需要放到 parts 里。
function toGeminiContents(
  messages: Array<AiMessage & { role: 'user' | 'assistant' }>
) {
  return messages.map((message) => ({
    role: message.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: message.content }]
  }))
}

// Gemini 适配器：把统一的 maxTokens/temperature 映射到 generateContent 的 config。
async function chatWithGemini(
  messages: AiMessage[],
  options: AiChatOptions
): Promise<AiChatResult> {
  const provider = 'gemini'
  const effective = await getEffectiveAiConfig()
  const config = effective.gemini
  assertConfigured(
    effective.provider === provider && Boolean(config.apiKey),
    provider
  )

  const { system, chatMessages } = splitSystemMessages(messages)
  const client = new GoogleGenAI({ apiKey: config.apiKey })
  const model = options.model ?? config.model
  const timeoutMs = options.timeoutMs ?? config.timeoutMs

  try {
    const response = await withTimeout(
      client.models.generateContent({
        model,
        contents: toGeminiContents(chatMessages),
        config: {
          ...(system ? { systemInstruction: system } : {}),
          maxOutputTokens: options.maxTokens ?? config.maxTokens,
          temperature: options.temperature ?? config.temperature
        }
      }),
      timeoutMs,
      provider
    )
    const data = response as any
    const content = typeof data.text === 'string' ? data.text : ''
    if (!content) {
      throw new AiError('Invalid Gemini AI response', 502, provider)
    }

    return {
      content,
      model: typeof data.modelVersion === 'string' ? data.modelVersion : model,
      usage: data.usageMetadata
    }
  } catch (error) {
    if (error instanceof AiError) throw error
    const status =
      typeof (error as any)?.status === 'number'
        ? (error as any).status
        : undefined
    const message =
      error instanceof Error ? error.message : 'Gemini AI request failed'
    throw new AiError(message, status, provider)
  }
}

// Claude SDK 接受 user/assistant 消息，system prompt 需要单独传入 messages.create。
function toClaudeMessages(
  messages: Array<AiMessage & { role: 'user' | 'assistant' }>
): Anthropic.MessageParam[] {
  return messages.map((message) => ({
    role: message.role,
    content: message.content
  }))
}

// Claude 可能返回多段 content block；这里只拼接文本块，保持前端现有 content 字段不变。
function readClaudeContent(response: Anthropic.Message) {
  return response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('')
}

// Claude 适配器：按计划不传 temperature，避免新 Claude 模型对采样参数的兼容差异。
async function chatWithClaude(
  messages: AiMessage[],
  options: AiChatOptions
): Promise<AiChatResult> {
  const provider = 'claude'
  const effective = await getEffectiveAiConfig()
  const config = effective.claude
  assertConfigured(
    effective.provider === provider && Boolean(config.apiKey),
    provider
  )

  const { system, chatMessages } = splitSystemMessages(messages)
  const client = new Anthropic({ apiKey: config.apiKey })
  const model = options.model ?? config.model
  const timeoutMs = options.timeoutMs ?? config.timeoutMs

  try {
    const response = await withTimeout(
      client.messages.create({
        model,
        max_tokens: options.maxTokens ?? config.maxTokens,
        ...(system ? { system } : {}),
        messages: toClaudeMessages(chatMessages)
      }),
      timeoutMs,
      provider
    )
    const content = readClaudeContent(response)
    if (!content) {
      throw new AiError('Invalid Claude AI response', 502, provider)
    }

    return {
      content,
      model: response.model,
      usage: response.usage
    }
  } catch (error) {
    if (error instanceof AiError) throw error
    if (error instanceof Anthropic.APIError) {
      throw new AiError(error.message, error.status, provider)
    }
    const message =
      error instanceof Error ? error.message : 'Claude AI request failed'
    throw new AiError(message, undefined, provider)
  }
}

// 对外唯一入口：业务代码不关心 provider，只拿统一的 content/model/usage。
export async function chatWithAi(
  messages: AiMessage[],
  options: AiChatOptions = {}
): Promise<AiChatResult> {
  const effective = await getEffectiveAiConfig()
  switch (effective.provider) {
    case 'openai-compatible':
      return chatWithOpenAiCompatible(messages, options)
    case 'gemini':
      return chatWithGemini(messages, options)
    case 'claude':
      return chatWithClaude(messages, options)
  }
}
