export function firstCharacterHint(answer: string): string {
  return Array.from(answer.trimStart())[0] ?? ''
}
