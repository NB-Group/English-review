import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { PracticeMode, PracticeRequest, StudySubject } from '../lib/product-types'

export default function PracticeLauncher() {
  const navigate = useNavigate()
  const [subject, setSubject] = useState<StudySubject>('english')
  const [scope, setScope] = useState<PracticeRequest['scope']>('all-phrases')
  const [mode, setMode] = useState<PracticeMode>('formal')
  const [order, setOrder] = useState<PracticeRequest['order']>('textbook')

  const start = () => {
    if (subject === 'chinese') return navigate('/chinese')
    if (subject === 'chemistry') return
    navigate(`/practice?subject=${subject}&scope=${scope}&mode=${mode}&order=${order}`)
  }

  return (
    <div className="practice-launcher">
      <div className="eyebrow">PRACTICE BUILDER</div>
      <h1>选择今天要练的内容。</h1>
      <p className="practice-lead">你可以跟着今日计划，也可以直接指定一组内容。</p>

      <section className="practice-panel">
        <label>学科</label>
        <div className="choice-row">
          {([['english', '英语'], ['chinese', '语文'], ['chemistry', '化学']] as const).map(([value, label]) => (
            <button key={value} className={subject === value ? 'choice active' : 'choice'} onClick={() => { setSubject(value); if (value === 'english') setScope('all-phrases') }}>{label}</button>
          ))}
        </div>

        <label>范围</label>
        <div className="choice-list">
          {subject === 'english' && <>
            <button className={scope === 'today' ? 'choice-line active' : 'choice-line'} onClick={() => setScope('today')}><b>今日任务</b><span>按记忆状态安排</span></button>
            <button className={scope === 'all-phrases' ? 'choice-line active' : 'choice-line'} onClick={() => setScope('all-phrases')}><b>全部词组</b><span>完整检查 347 个词组</span></button>
            <button className={scope === 'all-words' ? 'choice-line active' : 'choice-line'} onClick={() => setScope('all-words')}><b>全部单词</b><span>完整检查考纲单词</span></button>
          </>}
          {subject === 'chinese' && <button className="choice-line active"><b>语文背诵</b><span>诗文句段和实词</span></button>}
          {subject === 'chemistry' && <button className="choice-line disabled"><b>化学方程式</b><span>等待书写规则接入</span></button>}
        </div>

        <label>顺序</label>
        <div className="choice-row">
          <button className={order === 'textbook' ? 'choice active' : 'choice'} onClick={() => setOrder('textbook')}>教材顺序</button>
          <button className={order === 'random' ? 'choice active' : 'choice'} onClick={() => setOrder('random')}>随机顺序</button>
        </div>

        <label>记录方式</label>
        <div className="choice-row">
          <button className={mode === 'formal' ? 'choice active' : 'choice'} onClick={() => setMode('formal')}>计入学习进度</button>
          <button className={mode === 'practice' ? 'choice active' : 'choice'} onClick={() => setMode('practice')}>只练习不改进度</button>
        </div>
      </section>

      <button className="push practice-start" disabled={subject === 'chemistry'} onClick={start}>开始练习 <span>↗</span></button>
    </div>
  )
}
