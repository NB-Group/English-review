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

function SpeakerInline({ text }: { text: string }) {
  return (
    <motion.button
      whileTap={{ scale: 0.85 }}
      onClick={() => speak(text)}
      className="grid size-9 shrink-0 place-items-center rounded-full bg-duo-blue-tint text-sm"
      title="朗读"
    >
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" strokeLinecap="round"/></svg>
    </motion.button>
  )
}

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
        (w) => w.headword.toLowerCase().includes(needle) || w.senses.some((s) => s.zh.includes(q.trim())),
      )
    }
    return list
  }, [ds.words, star, triage, q, profile.progress])

  const phrases = useMemo(() => {
    let list = ds.phrases
    if (star !== 'all') list = list.filter((p) => p.stars === star)
    if (triage !== 'all') {
      list = list.filter((p) => {
        const t = profile.progress[`p:${p.no}`]?.triage ?? null
        return triage === 'none' ? t === null : t === triage
      })
    }
    if (q.trim()) {
      const needle = q.trim().toLowerCase()
      list = list.filter((p) => p.headword.toLowerCase().includes(needle) || p.meaning.includes(q.trim()))
    }
    return list
  }, [ds.phrases, star, triage, q, profile.progress])

  const word = selected?.kind === 'word' ? ds.wordByNo.get(selected.no) : undefined
  const phrase = selected?.kind === 'phrase' ? ds.phraseByNo.get(selected.no) : undefined
  const shown = tab === 'word' ? words : phrases

  const filterChip = (active: boolean) =>
    `chip !py-1.5 transition-all ${active ? 'bg-duo-blue text-white shadow-[0_2px_0_var(--color-duo-blue-dark)]' : 'bg-mist text-ink-soft hover:bg-hare/60'}`

  return (
    <div className="library-page mt-6">
      <div className="page-heading library-heading"><div><div className="eyebrow">THE VOCABULARY COLLECTION</div><h1>每一个词，都有它的位置。</h1><p>{ds.words.length} 个单词 · {ds.phrases.length} 个词组，按你的节奏逐一掌握。</p></div></div>
      {/* 过滤器 */}
      <div className="library-tools card flex flex-wrap items-center gap-2 p-3">
        <div className="flex rounded-full bg-mist p-1">
          {(['word', 'phrase'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative rounded-full px-4 py-1.5 text-sm font-extrabold ${tab === t ? 'text-white' : 'text-ink-soft'}`}
            >
              {tab === t && (
                <motion.span layoutId="lib-tab" className="absolute inset-0 rounded-full bg-duo-blue"
                  transition={{ duration: 0.3, ease: EASE }} />
              )}
              <span className="relative">{t === 'word' ? `单词 ${ds.words.length}` : `词组 ${ds.phrases.length}`}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(['all', 3, 2, 1, 0] as const).map((s) => (
            <button key={String(s)} onClick={() => setStar(s as StarFilter)} className={filterChip(star === s)}>
              {s === 'all' ? '全部' : s === 0 ? '无星' : '★'.repeat(s as number)}
            </button>
          ))}
        </div>
        {(
          <div className="flex flex-wrap gap-1.5">
            {([['all', '全部'], ['none', '待清洗'], ['unknown', '不会'], ['recognize', '拼不准'], ['fluent', '熟练']] as const).map(([v, label]) => (
              <button key={v} onClick={() => setTriage(v as TriageFilter)} className={filterChip(triage === v)}>
                {label}
              </button>
            ))}
          </div>
        )}
        <input
          className="duo-input ml-auto !w-48 !rounded-full !py-2 text-sm font-semibold"
          placeholder="搜索英文或中文释义"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {/* 列表 */}
      <div className="library-entries mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {shown.slice(0, 400).map((e, i) => (
          <motion.button
            key={e.no}
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: EASE, delay: Math.min(i * 0.015, 0.3) }}
            whileHover={reduce ? undefined : { y: -3 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setSelected({ kind: tab, no: e.no })}
            className="library-entry card p-4 text-left transition-colors hover:border-duo-blue"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-base font-extrabold text-ink">{e.headword}</span>
              {e.stars > 0 && <span className="shrink-0 text-xs font-bold text-duo-gold-dark">{'★'.repeat(e.stars)}</span>}
            </div>
            <div className="mt-1 truncate text-xs font-semibold text-ink-faint">
              {tab === 'word' ? (e as WordEntry).senses[0]?.zh : (e as PhraseEntry).meaning}
            </div>
          </motion.button>
        ))}
        {shown.length === 0 && (
          <div className="empty-state col-span-full">
            <h1 style={{ fontSize: 22 }}>没有匹配的词条</h1>
            <p style={{ marginTop: 8 }}>换个关键词，或者放宽筛选条件。</p>
          </div>
        )}
      </div>
      {shown.length > 400 && (
        <p className="mt-3 text-center text-xs font-bold text-ink-faint">只显示前 400 条，用筛选缩小范围</p>
      )}

      {/* 详情：底部抽屉 */}
      <AnimatePresence>
        {(word || phrase) && (
          <motion.div
            key="detail"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 flex items-end justify-center bg-black/45 backdrop-blur-sm"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={reduce ? false : { y: 80, opacity: 0.5 }}
              animate={{ y: 0, opacity: 1 }}
              exit={reduce ? undefined : { y: 80, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              className="max-h-[86dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-snow p-7 sm:m-6 sm:rounded-3xl"
              onClick={(ev) => ev.stopPropagation()}
            >
              <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-hare sm:hidden" />
              {word && <WordDetail w={word} />}
              {phrase && <PhraseDetail p={phrase} />}
              <button
                onClick={() => setSelected(null)}
                className="push push-ghost mt-7 w-full py-3"
              >
                关闭
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Stars({ n }: { n: number }) {
  return n > 0 ? <span className="text-duo-gold-dark">{'★'.repeat(n)}</span> : null
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const arr = Array.isArray(children) ? children : [children]
  if (!arr.some((c) => c !== null && c !== undefined && String(c).trim() !== '')) return null
  return (
    <div className="mt-6">
      <div className="text-[12px] font-extrabold text-ink-faint">{title}</div>
      <div className="space-y-1.5 text-sm font-bold text-ink-soft">{children}</div>
    </div>
  )
}

function WordDetail({ w }: { w: WordEntry }) {
  const progress = useProfile((s) => s.profile.progress[`w:${w.no}`])
  return (
    <div>
      <div className="text-[12px] font-extrabold text-ink-faint">考纲单词 W{w.no} · 第{w.page}页</div>
      <div className="mt-2 flex items-center gap-3">
        <div className="text-4xl font-black tracking-wide text-ink">{w.headword}</div>
        <SpeakerInline text={w.headword} />
        <Stars n={w.stars} />
      </div>
      {w.ipa && <div className="mt-1.5 font-mono text-sm font-bold text-ink-faint">{w.ipa}</div>}
      {progress?.triage && (
        <div className="mt-3 text-[13px] font-bold text-ink-soft">
          {progress.triage === 'fluent' ? '😎 滚瓜烂熟' : progress.triage === 'recognize' ? '🤔 认识拼不出' : '😵 不会'}
          <span className="mx-2 text-hare">|</span>认词 {describeDue(progress.dims.w1 ?? null)}
          <span className="mx-2 text-hare">|</span>默词 {describeDue(progress.dims.w2 ?? null)}
        </div>
      )}
      {w.inflections.length > 0 && (
        <div className="mt-3 text-sm font-bold text-ink-soft">
          {w.inflections.map((f, i) => <span key={i} className="mr-3">（{f.note} {f.form}）</span>)}
        </div>
      )}
      <div className="mt-4 space-y-1.5">
        {w.senses.map((s, i) => (
          <div key={i} className="text-lg font-extrabold text-ink">
            <span className="mr-2 text-sm font-bold text-duo-purple">{s.pos}</span>{s.zh}
          </div>
        ))}
      </div>
      {w.textbook_tags.length > 0 && (
        <div className="mt-3 text-[13px] font-bold text-ink-faint">教材 {w.textbook_tags.join(' / ')}</div>
      )}
      {w.examples.map((ex, i) => (
        <div key={i} className="mt-4 rounded-2xl bg-mist p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="font-bold text-ink">{ex.en}</div>
            <SpeakerInline text={ex.en} />
          </div>
          <div className="mt-1 text-sm font-semibold text-ink-faint">{ex.zh}</div>
          {ex.rewrite && <div className="mt-1 text-sm font-extrabold text-duo-blue-dark">{ex.rewrite}</div>}
        </div>
      ))}
      <Section title="词形拓展">
        {w.derivations.map((d, i) => (
          <div key={i}><span className="text-ink">{d.word}</span> <span className="text-xs text-duo-purple">{d.pos}</span> {d.zh}</div>
        ))}
      </Section>
      <Section title="常用词组">{w.phrases.map((p, i) => <div key={i}>{p}</div>)}</Section>
      <Section title="近义">{w.synonyms.join(' · ')}</Section>
      <Section title="反义">{w.antonyms.join(' · ')}</Section>
      <Section title="谚语">{w.proverbs.map((p, i) => <div key={i}>{p}</div>)}</Section>
      <Section title="名师点拨">{w.notes.map((n, i) => <div key={i}>{n}</div>)}</Section>
    </div>
  )
}

function PhraseDetail({ p }: { p: PhraseEntry }) {
  const progress = useProfile((s) => s.profile.progress[`p:${p.no}`])
  return (
    <div>
      <div className="text-[12px] font-extrabold text-ink-faint">考纲词组 P{p.no} · 第{p.page}页</div>
      <div className="mt-2 flex items-center gap-3">
        <div className="text-3xl font-black tracking-wide text-ink">{p.headword}</div>
        <SpeakerInline text={p.headword} />
        <Stars n={p.stars} />
      </div>
      <div className="mt-3 text-lg font-extrabold text-ink">
        <span className="mr-2 text-sm font-bold text-duo-purple">{p.pos}</span>{p.meaning}
      </div>
      {progress?.triage && (
        <div className="mt-3 text-xs">
          <span className="chip bg-mist text-ink-soft">
            {progress.triage === 'fluent' ? '😎 滚瓜烂熟' : progress.triage === 'recognize' ? '🤔 认识拼不出' : '😵 不会'}
          </span>
        </div>
      )}
      {p.examples.map((ex, i) => (
        <div key={i} className="mt-4 rounded-2xl bg-mist p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="font-bold text-ink">{ex.en}</div>
            <SpeakerInline text={ex.en} />
          </div>
          <div className="mt-1 text-sm font-semibold text-ink-faint">{ex.zh}</div>
          {ex.rewrite && <div className="mt-1 text-sm font-extrabold text-duo-blue-dark">{ex.rewrite}</div>}
        </div>
      ))}
      <Section title="名师点拨">{p.notes.map((n, i) => <div key={i}>{n}</div>)}</Section>
    </div>
  )
}
