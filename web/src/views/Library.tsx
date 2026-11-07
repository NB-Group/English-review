import { useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { Dataset } from '../lib/data'
import type { PhraseEntry, WordEntry } from '../types'
import { describeDue } from '../lib/fsrs'
import { useProfile } from '../lib/store'
import { speak } from '../lib/tts'

const EASE = [0.16, 1, 0.3, 1] as const

type StarFilter = 0 | 1 | 2 | 3 | 'all'
type TriageFilter = 'all' | 'none' | 'unknown' | 'recognize' | 'fluent'

export default function Library({ ds }: { ds: Dataset }) {
  const [star, setStar] = useState<StarFilter>('all')
  const [triage, setTriage] = useState<TriageFilter>('all')
  const [q, setQ] = useState('')
  const [tab, setTab] = useState<'word' | 'phrase'>('word')
  const [selected, setSelected] = useState<{ kind: 'word' | 'phrase'; no: number } | null>(null)
  const profile = useProfile((s) => s.profile)
  const reduce = useReducedMotion()

  const words = useMemo(() => {
    let list = ds.words
    if (star !== 'all') list = list.filter((w) => w.stars === star)
    if (triage !== 'all') {
      list = list.filter((w) => {
        const t = profile.progress[`w:${w.no}`]?.triage ?? null
        return triage === 'none' ? t === null : t === triage
      })
    }
    if (q.trim()) {
      const needle = q.trim().toLowerCase()
      list = list.filter(
        (w) =>
          w.headword.toLowerCase().includes(needle) ||
          w.senses.some((s) => s.zh.includes(q.trim())),
      )
    }
    return list
  }, [ds.words, star, triage, q, profile.progress])

  const phrases = useMemo(() => {
    let list = ds.phrases
    if (star !== 'all') list = list.filter((p) => p.stars === star)
    if (q.trim()) {
      const needle = q.trim().toLowerCase()
      list = list.filter((p) => p.headword.toLowerCase().includes(needle) || p.meaning.includes(q.trim()))
    }
    return list
  }, [ds.phrases, star, q])

  const word = selected?.kind === 'word' ? ds.wordByNo.get(selected.no) : undefined
  const phrase = selected?.kind === 'phrase' ? ds.phraseByNo.get(selected.no) : undefined

  return (
    <div className="mt-6">
      {/* 过滤器 */}
      <div className="glass flex flex-wrap items-center gap-2 p-3">
        <div className="flex rounded-full bg-white/5 p-1">
          {(['word', 'phrase'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative rounded-full px-4 py-1.5 text-sm ${tab === t ? 'text-[#05070f]' : 'text-ink-soft'}`}
            >
              {tab === t && (
                <motion.span layoutId="lib-tab" className="absolute inset-0 rounded-full bg-neon" transition={{ duration: 0.3, ease: EASE }} />
              )}
              <span className="relative">{t === 'word' ? `单词 ${ds.words.length}` : `词组 ${ds.phrases.length}`}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {(['all', 3, 2, 1, 0] as const).map((s) => (
            <button
              key={String(s)}
              onClick={() => setStar(s as StarFilter)}
              className={`rounded-full px-3 py-1.5 text-xs transition-colors ${star === s ? 'bg-amber/20 text-amber' : 'text-ink-faint hover:text-ink-soft'}`}
            >
              {s === 'all' ? '全部星级' : '★'.repeat(s as number) || '无星'}
            </button>
          ))}
        </div>
        {tab === 'word' && (
          <div className="flex gap-1">
            {([['all', '全部'], ['none', '待清洗'], ['unknown', '不会'], ['recognize', '拼不准'], ['fluent', '熟练']] as const).map(([v, label]) => (
              <button
                key={v}
                onClick={() => setTriage(v as TriageFilter)}
                className={`rounded-full px-3 py-1.5 text-xs transition-colors ${triage === v ? 'bg-violet/20 text-violet' : 'text-ink-faint hover:text-ink-soft'}`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        <input className="cyber-input ml-auto w-44 text-sm" placeholder="搜词/搜中文…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {/* 列表 */}
      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {tab === 'word'
          ? words.slice(0, 400).map((w, i) => (
              <Row key={w.no} i={i} reduce={!!reduce} onClick={() => setSelected({ kind: 'word', no: w.no })}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-ink">{w.headword}</span>
                  {w.stars > 0 && <span className="shrink-0 text-xs text-amber">{'★'.repeat(w.stars)}</span>}
                </div>
                <div className="mt-1 truncate text-xs text-ink-faint">{w.senses[0]?.zh}</div>
              </Row>
            ))
          : phrases.slice(0, 400).map((p, i) => (
              <Row key={p.no} i={i} reduce={!!reduce} onClick={() => setSelected({ kind: 'phrase', no: p.no })}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-ink">{p.headword}</span>
                  {p.stars > 0 && <span className="shrink-0 text-xs text-amber">{'★'.repeat(p.stars)}</span>}
                </div>
                <div className="mt-1 truncate text-xs text-ink-faint">{p.meaning}</div>
              </Row>
            ))}
        {((tab === 'word' ? words : phrases).length === 0) && (
          <div className="col-span-full py-16 text-center text-ink-faint">没有匹配的词条</div>
        )}
      </div>
      {((tab === 'word' ? words : phrases).length > 400) && (
        <p className="mt-3 text-center text-xs text-ink-faint">只显示前 400 条，请用筛选缩小范围</p>
      )}

      {/* 详情 */}
      <AnimatePresence>
        {(word || phrase) && (
          <motion.div
            key="detail"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-8"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={reduce ? false : { y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={reduce ? undefined : { y: 30, opacity: 0 }}
              transition={{ duration: 0.32, ease: EASE }}
              className="glass-strong max-h-[85dvh] w-full max-w-2xl overflow-y-auto rounded-b-none rounded-t-3xl p-8 sm:rounded-3xl"
              onClick={(e) => e.stopPropagation()}
            >
              {word && <WordDetail w={word} />}
              {phrase && <PhraseDetail p={phrase} />}
              <button onClick={() => setSelected(null)} className="mt-8 w-full rounded-xl border border-line-bright py-3 text-sm text-ink-soft hover:text-ink">
                关闭
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Row({ children, onClick, i, reduce }: { children: React.ReactNode; onClick: () => void; i: number; reduce: boolean }) {
  return (
    <motion.button
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE, delay: Math.min(i * 0.02, 0.4) }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="glass p-3 text-left transition-colors hover:border-line-bright"
    >
      {children}
    </motion.button>
  )
}

function Stars({ n }: { n: number }) {
  return n > 0 ? <span className="text-amber">{'★'.repeat(n)}</span> : null
}

function WordDetail({ w }: { w: WordEntry }) {
  const progress = useProfile((s) => s.profile.progress[`w:${w.no}`])
  return (
    <div>
      <div className="eyebrow">考纲单词 · W{w.no} · p{w.page}</div>
      <div className="mt-2 flex items-baseline gap-4">
        <button onClick={() => speak(w.headword)} className="font-display text-4xl text-ink hover:text-neon">
          {w.headword}
        </button>
        {w.ipa && <span className="font-mono text-ink-soft">{w.ipa}</span>}
        <Stars n={w.stars} />
      </div>
      {progress?.triage && (
        <div className="mt-2 text-xs text-ink-faint">
          清洗：{progress.triage === 'fluent' ? '滚瓜烂熟' : progress.triage === 'recognize' ? '认识拼不出' : '不会'} ·
          认词 {describeDue(progress.dims.w1 ?? null)} · 默词 {describeDue(progress.dims.w2 ?? null)}
        </div>
      )}
      {w.inflections.length > 0 && (
        <div className="mt-3 text-sm text-ink-soft">
          {w.inflections.map((f, i) => <span key={i} className="mr-3">（{f.note} {f.form}）</span>)}
        </div>
      )}
      <div className="mt-4 space-y-1">
        {w.senses.map((s, i) => (
          <div key={i} className="text-lg text-ink-soft"><span className="mr-2 text-xs text-violet">{s.pos}</span>{s.zh}</div>
        ))}
      </div>
      {w.textbook_tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">{w.textbook_tags.map((t) => <span key={t} className="glass px-2 py-1 text-xs text-ink-faint">{t}</span>)}</div>
      )}
      {w.examples.map((ex, i) => (
        <div key={i} className="glass mt-4 p-4">
          <div className="text-ink">{ex.en}</div>
          <div className="mt-1 text-sm text-ink-faint">{ex.zh}</div>
          {ex.rewrite && <div className="mt-1 text-sm text-neon/80">{ex.rewrite}</div>}
        </div>
      ))}
      <SubSection title="词形拓展">
        {w.derivations.map((d, i) => <div key={i}><span className="text-ink">{d.word}</span> <span className="text-xs text-violet">{d.pos}</span> {d.zh}</div>)}
      </SubSection>
      <SubSection title="常用词组">{w.phrases.map((p, i) => <div key={i}>{p}</div>)}</SubSection>
      <SubSection title="近义">{w.synonyms.join(' · ')}</SubSection>
      <SubSection title="反义">{w.antonyms.join(' · ')}</SubSection>
      <SubSection title="谚语">{w.proverbs.map((p, i) => <div key={i}>{p}</div>)}</SubSection>
      <SubSection title="名师点拨">{w.notes.map((n, i) => <div key={i} className="text-ink-soft">{n}</div>)}</SubSection>
    </div>
  )
}

function PhraseDetail({ p }: { p: PhraseEntry }) {
  const progress = useProfile((s) => s.profile.progress[`p:${p.no}`])
  return (
    <div>
      <div className="eyebrow">考纲词组 · P{p.no} · p{p.page}</div>
      <div className="mt-2 flex items-baseline gap-4">
        <button onClick={() => speak(p.headword)} className="font-display text-3xl text-ink hover:text-neon">{p.headword}</button>
        <Stars n={p.stars} />
      </div>
      <div className="mt-3 text-lg text-ink-soft"><span className="mr-2 text-xs text-violet">{p.pos}</span>{p.meaning}</div>
      {progress?.triage && <div className="mt-2 text-xs text-ink-faint">清洗：{progress.triage}</div>}
      {p.examples.map((ex, i) => (
        <div key={i} className="glass mt-4 p-4">
          <div className="text-ink">{ex.en}</div>
          <div className="mt-1 text-sm text-ink-faint">{ex.zh}</div>
          {ex.rewrite && <div className="mt-1 text-sm text-neon/80">{ex.rewrite}</div>}
        </div>
      ))}
      <SubSection title="名师点拨">{p.notes.map((n, i) => <div key={i} className="text-ink-soft">{n}</div>)}</SubSection>
    </div>
  )
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  const arr = Array.isArray(children) ? children : [children]
  if (!arr.some((c) => c !== null && c !== undefined && String(c).trim() !== '')) return null
  return (
    <div className="mt-6">
      <div className="eyebrow mb-2">{title}</div>
      <div className="space-y-1 text-sm text-ink-soft">{children}</div>
    </div>
  )
}
