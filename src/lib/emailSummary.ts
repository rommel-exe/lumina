import type { EmailItem } from '../state/models'

const normalize = (text: string) => text.replace(/\s+/g, ' ').trim()

const splitSentences = (text: string): string[] =>
  normalize(text)
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean)

const getUrgencyLabel = (text: string) => {
  const haystack = text.toLowerCase()
  if (/(urgent|asap|immediately|today|by eod|deadline)/.test(haystack)) return 'High'
  if (/(soon|this week|follow up|review)/.test(haystack)) return 'Medium'
  return 'Low'
}

const extractActionHints = (text: string): string[] => {
  const sentencePool = splitSentences(text)
  const picks = sentencePool.filter((sentence) =>
    /(please|need to|can you|action|review|send|confirm|update|schedule|follow up)/i.test(sentence),
  )

  if (picks.length > 0) return picks.slice(0, 2)
  return sentencePool.slice(0, 2)
}

export type EmailSummary = {
  headline: string
  urgency: 'High' | 'Medium' | 'Low'
  bullets: string[]
}

export const summarizeEmail = (email: EmailItem): EmailSummary => {
  const sourceText = normalize(`${email.subject}. ${email.body ?? email.snippet}`)
  const sentences = splitSentences(sourceText)

  const headline = sentences[0] ?? email.subject
  const urgency = getUrgencyLabel(sourceText)
  const bullets = extractActionHints(sourceText).map((sentence) =>
    sentence.length > 160 ? `${sentence.slice(0, 157)}...` : sentence,
  )

  return {
    headline,
    urgency,
    bullets: bullets.length > 0 ? bullets : ['No obvious action items detected.'],
  }
}
