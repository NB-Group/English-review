export function firstCharacterHint(answer: string): string {
  return Array.from(answer.trimStart())[0] ?? ''
}

export function composeHintedAnswer(hint: string, input: string): string {
  if (!hint || input.startsWith(hint)) return input
  return hint + input
}
import { grade, spellingVariants } from './grader'


export function spellingSubmission(expected: string, input: string): string {
  if (grade(input, [expected]) === 'exact') return input.trim()
  const hint = firstCharacterHint(expected)
  if (/^\S\s/.test(expected.trimStart()) && !/^\S\s/.test(input)) return `${hint} ${input.trimStart()}`
  return composeHintedAnswer(hint, input)
}

export function contextHint(expected: string, example?: string): string {
  const variants = spellingVariants(expected)
  if (example && variants.length) {
    const pattern = [...variants].sort((a, b) => b.length - a.length)
      .map((variant) => variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
    const masked = example.replace(new RegExp(`(?<![A-Za-z])(?:${pattern})(?![A-Za-z])`, 'gi'), '____')
    if (masked !== example) return masked
  }
  const counts = [...new Set(variants.map((variant) => variant.split(/\s+/).length))].sort((a, b) => a - b)
  if (counts.some((count) => count > 1)) return `答案有 ${counts.join(' 或 ')} 个词。`
  const lengths = [...new Set(variants.map((variant) => (variant.match(/[A-Za-z]/g) ?? []).length).filter(Boolean))]
  return lengths.length ? `答案有 ${lengths.sort((a, b) => a - b).join(' 或 ')} 个字母。` : ''
}
