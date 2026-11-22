export function firstCharacterHint(answer: string): string {
  return Array.from(answer.trimStart())[0] ?? ''
}

export function composeHintedAnswer(hint: string, input: string): string {
  if (!hint || input.startsWith(hint)) return input
  return hint + input
}
