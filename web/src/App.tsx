import {useEffect,useState} from 'react'
import {NavLink,Route,Routes,useLocation} from 'react-router-dom'
import {loadDataset,type Dataset} from './lib/data'
import Today from './views/Today'
import Library from './views/Library'
import Study from './views/Study'
import Goals from './views/Goals'
import { AccountGate, AccountChip } from './views/AccountGate'
const nav=[['/','今日计划','◷'],['/study','专注学习','↗'],['/library','考纲词库','▤'],['/goals','学习目标','◎']]
export default function App(){const[ds,setDs]=useState<Dataset|null>(null),[error,setError]=useState('');const location=useLocation();useEffect(()=>{loadDataset().then(setDs).catch(e=>setError(String(e)))},[]);const days=Math.max(0,Math.ceil((new Date('2027-06-13').getTime()-Date.now())/86400000));return <div className="workspace">
 <aside className="sidebar"><NavLink to="/" className="wordmark"><span className="brand-mark">e<span>↗</span></span><div>复习札记<small>ENGLISH REVIEW</small></div></NavLink><div className="nav-caption">我的学习空间</div><nav>{nav.map(([to,label,icon])=><NavLink key={to} to={to} end={to==='/'} className={({isActive})=>'side-link'+(isActive?' active':'')}><span>{icon}</span>{label}<i>↗</i></NavLink>)}</nav><div className="sidebar-note"><div className="tiny-label">KEEP SHOWING UP</div><p>A little,<br/>every day.</p><span>每一次复习，都会留下痕迹。</span><div className="note-rule"/><span>距离中考 <b>{days}</b> 天</span></div><AccountChip/></aside>
 <div className="workspace-body"><header className="workspace-header"><div className="breadcrumb">我的学习空间 <span>/</span> <b>{nav.find(n=>n[0]===location.pathname)?.[1]??'今日计划'}</b></div><div className="header-right"><span>{new Intl.DateTimeFormat('zh-CN',{month:'long',day:'numeric',weekday:'long'}).format(new Date())}</span><div className="profile-mark">我</div></div></header><div className={'page-content'+(location.pathname==='/study'?' focus-page':'')}>{error?<div className="empty-state"><h1>暂时没有加载成功</h1><p>请检查网络后刷新页面，学习记录仍保存在本机。</p><details><summary>查看详情</summary>{error}</details></div>:!ds?<div className="empty-state">正在整理你的词库…</div>:<Routes><Route path="/" element={<Today ds={ds}/>}/><Route path="/library" element={<Library ds={ds}/>}/><Route path="/study" element={<Study ds={ds}/>}/><Route path="/goals" element={<Goals/>}/></Routes>}</div><footer className="workspace-footer"><span>ENGLISH REVIEW</span><span>学过的，值得记住。</span></footer></div><AccountGate/></div>}
