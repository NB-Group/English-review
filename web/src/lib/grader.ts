/** 答案判分：归一化 + 精确/近似分级（W2 打字题自动评分用） */

export type Grade = 'exact' | 'near' | 'wrong'

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[.,!?;:"()]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 0; j <= b.length; j++) dp[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
    }
  }
  return dp[a.length][b.length]
}

/** user 对 accepted（可多个可接受答案）的判级 */
export function grade(user: string, accepted: string[]): Grade {
  const u = normalize(user)
  if (!u) return 'wrong'
  const norms = accepted.map(normalize).filter(Boolean)
  if (norms.includes(u)) return 'exact'
  // 近似：编辑距离 ≤1，或单复数差异（含 -s/-es/-ves/-ies 变化）
  const stems = (s: string): Set<string> => {
    const out = new Set([s])
    if (s.endsWith('ies')) out.add(s.slice(0, -3) + 'y')
    if (s.endsWith('ves')) out.add(s.slice(0, -3) + 'f')
    if (s.endsWith('es')) out.add(s.slice(0, -2))
    if (s.endsWith('s')) out.add(s.slice(0, -1))
    return out
  }
  const pluralMatch = (a: string, b: string) => {
    for (const x of stems(a)) for (const y of stems(b)) if (x === y) return true
    return false
  }
  if (norms.some((n) => pluralMatch(n, u))) return 'near'
  if (norms.some((n) => Math.abs(n.length - u.length) <= 2 && editDistance(n, u) <= 1)) return 'near'
  return 'wrong'
}
