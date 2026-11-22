import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Dataset } from '../lib/data'
import { practiceLink, type ActiveSubject, type PracticeMode, type PracticeRequest, type PracticeScope } from '../lib/product-types'

export default function PracticeLauncher({ ds }: { ds: Dataset }) {
  const [subject, setSubject] = useState<ActiveSubject>('english')
  const [scope, setScope] = useState<PracticeScope>('all-phrases')
  const [mode, setMode] = useState<PracticeMode>('formal')
  const [order, setOrder] = useState<PracticeRequest['order']>('textbook')
  const [skill, setSkill] = useState<'recognize' | 'dictation'>('dictation')

  const scopes: Array<[PracticeScope, string]> = subject === 'english'
    ? [['all-phrases', `全部词组（${ds.phrases.length}）`], ['all-words', `全部单词（${ds.words.length}）`]]
    : [['senses', '文言词义'], ['poetry', '古诗词'], ['wenyan', '文言文']]

  return (
    <div className="practice-launcher">
      <h1>专项训练</h1>
      <section className="practice-panel space-y-5">
        <fieldset>
          <legend className="mb-2 text-sm font-bold">学科</legend>
          <div className="choice-row">
            {([['english', '英语'], ['chinese', '语文']] as const).map(([value, label]) => (
              <button key={value} aria-pressed={subject === value} className={subject === value ? 'choice active' : 'choice'}
                onClick={() => { setSubject(value); setScope(value === 'english' ? 'all-phrases' : 'senses') }}>{label}</button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-2 text-sm font-bold">内容范围</legend>
          <div className="choice-row">
            {scopes.map(([value, label]) => <button key={value} aria-pressed={scope === value}
              className={scope === value ? 'choice active' : 'choice'} onClick={() => setScope(value)}>{label}</button>)}
            <Link className="choice" to={'/library?subject=' + subject}>去内容库选题</Link>
          </div>
        </fieldset>
        {subject === 'english' && (
          <fieldset>
            <legend className="mb-2 text-sm font-bold">练习方式</legend>
            <div className="choice-row">
              <button aria-pressed={skill === 'recognize'} className={skill === 'recognize' ? 'choice active' : 'choice'} onClick={() => setSkill('recognize')}>认读</button>
              <button aria-pressed={skill === 'dictation'} className={skill === 'dictation' ? 'choice active' : 'choice'} onClick={() => setSkill('dictation')}>默写</button>
            </div>
          </fieldset>
        )}
        <fieldset>
          <legend className="mb-2 text-sm font-bold">顺序</legend>
          <div className="choice-row">
            <button aria-pressed={order === 'textbook'} className={order === 'textbook' ? 'choice active' : 'choice'} onClick={() => setOrder('textbook')}>原书顺序</button>
            <button aria-pressed={order === 'random'} className={order === 'random' ? 'choice active' : 'choice'} onClick={() => setOrder('random')}>随机顺序</button>
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-2 text-sm font-bold">记录方式</legend>
          <div className="choice-row">
            <button aria-pressed={mode === 'formal'} className={mode === 'formal' ? 'choice active' : 'choice'} onClick={() => setMode('formal')}>计入学习进度</button>
            <button aria-pressed={mode === 'practice'} className={mode === 'practice' ? 'choice active' : 'choice'} onClick={() => setMode('practice')}>仅本轮练习</button>
          </div>
        </fieldset>
        <Link className="push w-full" to={practiceLink({ subject, scope, mode, order, skill: subject === 'english' ? skill : undefined })}>开始或继续练习</Link>
      </section>
    </div>
  )
}
