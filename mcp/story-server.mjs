#!/usr/bin/env node
/**
 * 小说导演台 MCP Server（零依赖）
 *
 * 协议：MCP over stdio（JSON-RPC 2.0，按行分隔）
 * 状态根：<STORY_PROJECT_DIR>/.story
 *
 * 设计原则：
 * - 所有状态写入只走本服务，避免 LLM 手改 JSON/JSONL 把世界写坏
 * - JSONL 追加写；Markdown/JSON 原子写（临时文件 + rename）
 * - 分支 = 目录快照 + 分叉指针；分支工具带 branch 参数
 */

import {
  readFile,
  writeFile,
  mkdir,
  readdir,
  appendFile,
  rename,
  cp,
  stat,
  rm,
} from 'node:fs/promises'
import { join, resolve, dirname } from 'node:path'

const ROOT = resolve(process.env.STORY_PROJECT_DIR || process.cwd())
const STORY = join(ROOT, '.story')
const NAME_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/i

// ── 基础工具 ───────────────────────────────────────────────

function fail(message, code = -32602) {
  const e = new Error(message)
  e.code = code
  return e
}

function checkName(value, field) {
  if (typeof value !== 'string' || !NAME_RE.test(value)) {
    throw fail(`${field} 不合法：「${String(value)}」。只允许字母、数字、点、下划线、连字符，且不能以符号开头`)
  }
  if (value === '.' || value === '..' || value.includes('..')) {
    throw fail(`${field} 不允许包含 ..`)
  }
  return value
}

function checkText(value, field) {
  if (typeof value !== 'string' || !value.trim()) throw fail(`${field} 不能为空`)
  return value
}

function pad(n, width = 3) {
  return String(n).padStart(width, '0')
}

function now() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  const off = -d.getTimezoneOffset()
  const sign = off >= 0 ? '+' : '-'
  return (
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` +
    `T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}` +
    `${sign}${p(Math.floor(Math.abs(off) / 60))}:${p(Math.abs(off) % 60)}`
  )
}

function today() {
  return now().slice(0, 10)
}

function stamp() {
  return now().replace(/[-:T+]/g, '').slice(0, 14)
}

function countWords(text) {
  const cjk = (String(text).match(/[\u4e00-\u9fff]/g) || []).length
  const words = (String(text).match(/[A-Za-z0-9]+/g) || []).length
  return cjk + words
}

async function ensureDir(p) {
  await mkdir(p, { recursive: true })
}

async function exists(p) {
  try {
    await stat(p)
    return true
  } catch {
    return false
  }
}

async function readJson(p, fallback = null) {
  try {
    return JSON.parse(await readFile(p, 'utf8'))
  } catch (e) {
    if (e.code === 'ENOENT') return fallback
    throw e
  }
}

async function writeAtomic(p, content) {
  await ensureDir(dirname(p))
  const tmp = `${p}.tmp-${process.pid}-${Date.now()}`
  await writeFile(tmp, content, 'utf8')
  try {
    await rename(tmp, p)
  } catch {
    await writeFile(p, content, 'utf8')
    try {
      await rm(tmp)
    } catch {
      /* ignore */
    }
  }
}

async function writeJson(p, obj) {
  await writeAtomic(p, JSON.stringify(obj, null, 2) + '\n')
}

async function appendJsonl(p, obj) {
  await ensureDir(dirname(p))
  await appendFile(p, JSON.stringify(obj) + '\n', 'utf8')
}

async function readJsonl(p) {
  let text = ''
  try {
    text = await readFile(p, 'utf8')
  } catch (e) {
    if (e.code === 'ENOENT') return []
    throw e
  }
  const rows = []
  for (const line of text.split(/\r?\n/)) {
    const s = line.trim()
    if (!s) continue
    try {
      rows.push(JSON.parse(s))
    } catch {
      // 跳过坏行，避免一条脏数据让整个项目打不开
    }
  }
  return rows
}

async function listFiles(p) {
  try {
    return (await readdir(p, { withFileTypes: true }))
      .filter((e) => e.isFile())
      .map((e) => e.name)
  } catch {
    return []
  }
}

async function listDirs(p) {
  try {
    return (await readdir(p, { withFileTypes: true }))
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
  } catch {
    return []
  }
}

// ── 路径与状态 ─────────────────────────────────────────────

function baseDir(branch) {
  if (!branch) return STORY
  checkName(branch, 'branch')
  return join(STORY, 'branches', branch)
}

async function ensureBase(branch) {
  const base = baseDir(branch)
  if (branch) {
    if (!(await exists(base))) throw fail(`分支 ${branch} 不存在`)
    return base
  }
  if (!(await exists(join(STORY, 'state.json')))) {
    throw fail('项目还没初始化，先调用 project_init')
  }
  return base
}

async function getState() {
  const state = await readJson(join(STORY, 'state.json'))
  if (!state) throw fail('项目还没初始化，先调用 project_init')
  return state
}

async function saveState(state) {
  state.updated = now()
  await writeJson(join(STORY, 'state.json'), state)
  return state
}

function reduceFacts(rows) {
  const map = new Map()
  for (const row of rows) {
    if (!row || !row.id) continue
    if (row.retired) {
      map.delete(row.id)
      continue
    }
    map.set(row.id, row)
  }
  return [...map.values()]
}

function reduceThreads(rows) {
  const map = new Map()
  for (const row of rows) {
    if (!row || !row.id) continue
    map.set(row.id, { ...(map.get(row.id) || {}), ...row })
  }
  return [...map.values()]
}

async function nextId(file, prefix) {
  const rows = await readJsonl(file)
  let max = 0
  for (const r of rows) {
    const m = String(r.id || '').match(/_(\d+)$/)
    if (m) max = Math.max(max, parseInt(m[1], 10))
  }
  return `${prefix}_${pad(max + 1, 4)}`
}

function chapterNum(chapter) {
  const m = String(chapter || '').match(/(\d+)/)
  return m ? parseInt(m[1], 10) : 0
}

// ── 工具实现 ───────────────────────────────────────────────

async function projectInit(args) {
  const statePath = join(STORY, 'state.json')
  if (await exists(statePath)) {
    const state = await readJson(statePath)
    return { ...state, already_exists: true }
  }

  const title = checkText(args.title, 'title')
  const premise = checkText(args.premise, 'premise')

  for (const d of [
    'concept',
    'canon/characters',
    'ledger',
    'plan/chapters',
    'plan/scenes',
    'sim/runs',
    'drafts',
    'reviews',
    'branches',
    'final',
  ]) {
    await ensureDir(join(STORY, d))
  }

  const state = {
    title,
    slug: String(args.slug || title)
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || 'novel',
    created: today(),
    updated: now(),
    mode: args.mode || 'director',
    autonomy: args.autonomy || 'final-gate',
    phase: 'concept',
    genre: args.genre || '',
    tone: args.tone || '',
    pov: args.pov || 'third_limited',
    length_target: Number(args.length_target) || 12,
    chapters_done: [],
    runs: [],
    decisions: 0,
    notes: '',
  }

  await writeJson(statePath, state)
  await writeAtomic(
    join(STORY, 'premise.md'),
    `# ${title}\n\n## 一句话\n${premise}\n\n## 题材与基调\n- 题材：${state.genre || '待定'}\n- 基调：${state.tone || '待定'}\n- 篇幅：${state.length_target} 章\n- 视角：${state.pov}\n\n## 核心冲突\n待补\n\n## 钩子\n待补\n\n## 禁区\n待补\n\n## 成功标准\n待补\n`,
  )
  await writeAtomic(join(STORY, 'decisions.md'), `# 决策记录\n\n`)

  return state
}

async function projectUpdate(args) {
  const patch = args.patch || {}
  const allowed = ['title', 'mode', 'autonomy', 'phase', 'genre', 'tone', 'pov', 'length_target', 'notes']
  const state = await getState()
  for (const k of allowed) {
    if (patch[k] !== undefined) state[k] = patch[k]
  }
  if (patch.add_chapter) {
    const ch = checkName(patch.add_chapter, 'add_chapter')
    if (!state.chapters_done.includes(ch)) state.chapters_done.push(ch)
  }
  return await saveState(state)
}

async function projectStatus() {
  if (!(await exists(join(STORY, 'state.json')))) return { initialized: false, story_root: STORY }
  const state = await getState()
  const facts = reduceFacts(await readJsonl(join(STORY, 'ledger', 'facts.jsonl')))
  const threads = reduceThreads(await readJsonl(join(STORY, 'ledger', 'threads.jsonl')))
  const timeline = await readJsonl(join(STORY, 'ledger', 'timeline.jsonl'))
  const drafts = (await listFiles(join(STORY, 'drafts'))).filter((f) => f.endsWith('.md'))
  const reviews = (await listFiles(join(STORY, 'reviews'))).filter((f) => f.endsWith('.md'))
  const runs = (await listDirs(join(STORY, 'sim', 'runs'))).length

  const current = chapterNum(state.chapters_done[state.chapters_done.length - 1] || '')
  const overdue = threads.filter(
    (t) =>
      t.status === 'planted' &&
      t.payoff_target &&
      chapterNum(t.payoff_target) > 0 &&
      chapterNum(t.payoff_target) < current,
  )

  return {
    initialized: true,
    story_root: STORY,
    ...state,
    counts: {
      facts: facts.length,
      threads: threads.length,
      threads_open: threads.filter((t) => t.status === 'planted').length,
      threads_overdue: overdue.length,
      timeline: timeline.length,
      drafts: drafts.length,
      reviews: reviews.length,
      runs,
    },
    chapters: drafts.sort().map((f) => f.replace(/\.md$/, '')),
    threads_open: threads.filter((t) => t.status === 'planted'),
    threads_overdue: overdue,
  }
}

async function canonPut(args) {
  const base = await ensureBase(args.branch)
  const kind = checkName(args.kind, 'kind')
  const content = checkText(args.content, 'content')
  let file
  if (kind === 'character') {
    const id = checkName(args.id, 'id')
    file = join(base, 'canon', 'characters', `${id}.md`)
  } else if (['world', 'rules', 'factions', 'locations', 'voice'].includes(kind)) {
    file = join(base, 'canon', `${kind}.md`)
  } else {
    throw fail(`kind 不合法：${kind}。可选 world / rules / factions / locations / voice / character`)
  }
  await writeAtomic(file, content)
  return { path: file, kind, id: args.id || null }
}

async function canonGet(args) {
  const base = await ensureBase(args.branch)
  const kind = checkName(args.kind, 'kind')
  if (kind === 'character') {
    if (args.id) {
      const id = checkName(args.id, 'id')
      const file = join(base, 'canon', 'characters', `${id}.md`)
      return { kind, id, content: await readFile(file, 'utf8') }
    }
    const ids = (await listFiles(join(base, 'canon', 'characters')))
      .filter((f) => f.endsWith('.md'))
      .map((f) => f.replace(/\.md$/, ''))
    return { kind, ids }
  }
  if (!['world', 'rules', 'factions', 'locations', 'voice'].includes(kind)) {
    throw fail(`kind 不合法：${kind}`)
  }
  const file = join(base, 'canon', `${kind}.md`)
  return { kind, content: await readFile(file, 'utf8') }
}

async function canonList(args) {
  const base = await ensureBase(args.branch)
  const kinds = args.kind ? [checkName(args.kind, 'kind')] : ['world', 'rules', 'factions', 'locations', 'voice', 'character']
  const out = []
  for (const kind of kinds) {
    if (kind === 'character') {
      const ids = (await listFiles(join(base, 'canon', 'characters')))
        .filter((f) => f.endsWith('.md'))
        .map((f) => f.replace(/\.md$/, ''))
      for (const id of ids) out.push({ kind, id, path: join(base, 'canon', 'characters', `${id}.md`) })
    } else {
      const file = join(base, 'canon', `${kind}.md`)
      if (await exists(file)) out.push({ kind, id: null, path: file })
    }
  }
  return { items: out }
}

async function factAdd(args) {
  const base = await ensureBase(args.branch)
  const file = join(base, 'ledger', 'facts.jsonl')
  const visibility =
    Array.isArray(args.visibility) && args.visibility.length
      ? args.visibility.map((v) => String(v))
      : ['public']
  const fact = {
    id: await nextId(file, 'f'),
    subject: checkText(args.subject, 'subject'),
    predicate: checkText(args.predicate, 'predicate'),
    object: checkText(args.object, 'object'),
    source: checkText(args.source, 'source'),
    visibility,
    confidence: typeof args.confidence === 'number' ? args.confidence : 1,
    created_at: now(),
  }
  await appendJsonl(file, fact)
  return fact
}

async function factQuery(args) {
  const base = await ensureBase(args.branch)
  let facts = reduceFacts(await readJsonl(join(base, 'ledger', 'facts.jsonl')))
  if (args.subject) facts = facts.filter((f) => f.subject === args.subject)
  if (args.predicate) facts = facts.filter((f) => f.predicate === args.predicate)
  if (args.object) facts = facts.filter((f) => String(f.object) === String(args.object))
  if (args.visible_to) {
    const who = String(args.visible_to)
    facts = facts.filter((f) => (f.visibility || []).includes('public') || (f.visibility || []).includes(who))
  }
  return { count: facts.length, facts }
}

async function factCheck(args) {
  const base = await ensureBase(args.branch)
  const facts = reduceFacts(await readJsonl(join(base, 'ledger', 'facts.jsonl')))
  const claims = Array.isArray(args.claims) ? args.claims : []
  if (!claims.length) throw fail('claims 不能为空')
  const issues = []
  const unknown = []

  for (const claim of claims) {
    const matches = facts.filter(
      (f) => f.subject === claim.subject && f.predicate === claim.predicate,
    )
    if (!matches.length) {
      unknown.push(claim)
      continue
    }
    const contradictions = matches.filter((f) => String(f.object) !== String(claim.object))
    if (contradictions.length) {
      issues.push({
        type: 'contradiction',
        claim,
        facts: contradictions.map((f) => f.id),
        message: `事实冲突：${claim.subject} ${claim.predicate} 在库中是 ${contradictions
          .map((f) => f.object)
          .join(' / ')}，正文写成 ${claim.object}`,
      })
    }
    if (claim.knower) {
      const visible = matches.some(
        (f) =>
          (f.visibility || []).includes('public') || (f.visibility || []).includes(claim.knower),
      )
      if (!visible) {
        issues.push({
          type: 'knowledge_violation',
          claim,
          facts: matches.map((f) => f.id),
          message: `知识越界：${claim.knower} 不在该事实的 visibility 中`,
        })
      }
    }
  }

  return { ok: issues.length === 0, issues, unknown }
}

async function factRetire(args) {
  const base = await ensureBase(args.branch)
  const file = join(base, 'ledger', 'facts.jsonl')
  const id = checkName(args.id, 'id')
  const rows = await readJsonl(file)
  if (!rows.some((r) => r.id === id)) throw fail(`事实 ${id} 不存在`)
  const row = { id, retired: true, reason: String(args.reason || ''), retired_at: now() }
  await appendJsonl(file, row)
  return row
}

async function threadAdd(args) {
  const base = await ensureBase(args.branch)
  const file = join(base, 'ledger', 'threads.jsonl')
  const thread = {
    id: await nextId(file, 't'),
    question: checkText(args.question, 'question'),
    planted_in: checkText(args.planted_in, 'planted_in'),
    payoff_target: args.payoff_target || '',
    status: 'planted',
    related_facts: Array.isArray(args.related_facts) ? args.related_facts : [],
    notes: String(args.notes || ''),
    created_at: now(),
  }
  await appendJsonl(file, thread)
  return thread
}

async function threadUpdate(args) {
  const base = await ensureBase(args.branch)
  const file = join(base, 'ledger', 'threads.jsonl')
  const id = checkName(args.id, 'id')
  const rows = await readJsonl(file)
  if (!rows.some((r) => r.id === id)) throw fail(`伏笔 ${id} 不存在`)
  const row = {
    id,
    status: args.status,
    payoff_in: args.payoff_in,
    notes: args.notes,
    updated_at: now(),
  }
  for (const k of Object.keys(row)) if (row[k] === undefined) delete row[k]
  await appendJsonl(file, row)
  return row
}

async function threadList(args) {
  const base = await ensureBase(args.branch)
  let threads = reduceThreads(await readJsonl(join(base, 'ledger', 'threads.jsonl')))
  if (args.status) threads = threads.filter((t) => t.status === args.status)
  return { count: threads.length, threads }
}

async function timelineAppend(args) {
  const base = await ensureBase(args.branch)
  const file = join(base, 'ledger', 'timeline.jsonl')
  const event = {
    id: await nextId(file, 'e'),
    chapter: args.chapter || '',
    run_id: args.run_id || '',
    tick: args.tick ?? null,
    summary: checkText(args.summary, 'summary'),
    participants: Array.isArray(args.participants) ? args.participants : [],
    changes: Array.isArray(args.changes) ? args.changes : [],
    source: args.source || '',
    created_at: now(),
  }
  await appendJsonl(file, event)
  return event
}

async function timelineList(args) {
  const base = await ensureBase(args.branch)
  let events = await readJsonl(join(base, 'ledger', 'timeline.jsonl'))
  if (args.chapter) events = events.filter((e) => e.chapter === args.chapter)
  if (args.run_id) events = events.filter((e) => e.run_id === args.run_id)
  const limit = Number(args.limit) || 50
  return { count: events.length, events: events.slice(-limit) }
}

async function simBegin(args) {
  const base = await ensureBase(args.branch)
  const chapter = checkName(args.chapter, 'chapter')
  const config = args.config && typeof args.config === 'object' ? args.config : {}
  const root = join(base, 'sim', 'runs')
  let runId = `run_${stamp()}_${chapter}`
  let i = 2
  while (await exists(join(root, runId))) runId = `run_${stamp()}_${chapter}_${i++}`
  const dir = join(root, runId)
  await ensureDir(join(dir, 'ticks'))
  await ensureDir(join(dir, 'perception'))
  const full = { run_id: runId, chapter, created_at: now(), ...config }
  await writeJson(join(dir, 'config.json'), full)
  return { run_id: runId, dir, config: full }
}

async function simTick(args) {
  const base = await ensureBase(args.branch)
  const runId = checkName(args.run_id, 'run_id')
  const dir = join(base, 'sim', 'runs', runId)
  if (!(await exists(dir))) throw fail(`run ${runId} 不存在`)
  const tick = Number(args.tick)
  if (!Number.isFinite(tick) || tick <= 0) throw fail('tick 必须是正整数')
  const payload = {
    tick,
    scene: args.scene || '',
    actors: Array.isArray(args.actors) ? args.actors : [],
    resolution: args.resolution || {},
    recorded_at: now(),
  }
  const file = join(dir, 'ticks', `${pad(tick)}.json`)
  await writeJson(file, payload)
  return { run_id: runId, tick, path: file }
}

async function simEnd(args) {
  const base = await ensureBase(args.branch)
  const runId = checkName(args.run_id, 'run_id')
  const dir = join(base, 'sim', 'runs', runId)
  if (!(await exists(dir))) throw fail(`run ${runId} 不存在`)
  const report = checkText(args.report, 'report')
  await writeAtomic(join(dir, 'report.md'), report)
  await writeJson(join(dir, 'result.json'), args.outcome || {})
  if (!args.branch) {
    const state = await getState()
    if (!state.runs.includes(runId)) {
      state.runs.push(runId)
      await saveState(state)
    }
  }
  return { run_id: runId, report: join(dir, 'report.md') }
}

async function simRead(args) {
  const base = await ensureBase(args.branch)
  const runId = checkName(args.run_id, 'run_id')
  const dir = join(base, 'sim', 'runs', runId)
  if (!(await exists(dir))) throw fail(`run ${runId} 不存在`)
  const config = await readJson(join(dir, 'config.json'), null)
  const tickFiles = (await listFiles(join(dir, 'ticks'))).filter((f) => f.endsWith('.json')).sort()
  const ticks = []
  for (const f of tickFiles) ticks.push(await readJson(join(dir, 'ticks', f)))
  let report = ''
  try {
    report = await readFile(join(dir, 'report.md'), 'utf8')
  } catch {
    /* ignore */
  }
  const result = await readJson(join(dir, 'result.json'), null)
  return { run_id: runId, config, ticks, report, result }
}

async function simList(args) {
  const base = await ensureBase(args.branch)
  const root = join(base, 'sim', 'runs')
  let names = []
  try {
    names = (await readdir(root, { withFileTypes: true }))
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort()
  } catch {
    /* ignore */
  }
  const runs = []
  for (const name of names) {
    const config = await readJson(join(root, name, 'config.json'), null)
    if (args.chapter && config?.chapter !== args.chapter) continue
    runs.push({
      run_id: name,
      chapter: config?.chapter || '',
      created_at: config?.created_at || '',
      goal: config?.goal || config?.scene?.goal || '',
      ticks: (await listFiles(join(root, name, 'ticks'))).filter((f) => f.endsWith('.json')).length,
    })
  }
  return { count: runs.length, runs }
}

async function draftPut(args) {
  const base = await ensureBase(args.branch)
  const chapter = checkName(args.chapter, 'chapter')
  const body = String(args.content || '')
  const stripped = body.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n+/, '')
  const wordCount = Number(args.word_count) || countWords(stripped)
  const fm = [
    '---',
    `chapter: ${chapter}`,
    `title: ${String(args.title || chapter).replace(/\r?\n/g, ' ')}`,
    `run_id: ${String(args.run_id || '')}`,
    `word_count: ${wordCount}`,
    `status: ${String(args.status || 'draft')}`,
    `updated: ${now()}`,
    '---',
    '',
  ].join('\n')
  const file = join(base, 'drafts', `${chapter}.md`)
  await writeAtomic(file, fm + stripped.trimEnd() + '\n')
  return { path: file, chapter, word_count: wordCount }
}

async function draftGet(args) {
  const base = await ensureBase(args.branch)
  const chapter = checkName(args.chapter, 'chapter')
  const file = join(base, 'drafts', `${chapter}.md`)
  return { chapter, content: await readFile(file, 'utf8') }
}

async function draftList(args) {
  const base = await ensureBase(args.branch)
  const files = (await listFiles(join(base, 'drafts'))).filter((f) => /^ch-?\d+\.md$/.test(f)).sort()
  const drafts = []
  for (const f of files) {
    const text = await readFile(join(base, 'drafts', f), 'utf8')
    const chapter = f.replace(/\.md$/, '')
    const title = (text.match(/^---\r?\n[\s\S]*?title:\s*(.+)\r?\n/) || [])[1] || chapter
    const words = (text.match(/^---\r?\n[\s\S]*?word_count:\s*(\d+)/) || [])[1] || ''
    drafts.push({ chapter, title: title.trim(), word_count: Number(words) || countWords(text), path: join(base, 'drafts', f) })
  }
  return { count: drafts.length, drafts }
}

async function reviewPut(args) {
  const base = await ensureBase(args.branch)
  const chapter = checkName(args.chapter, 'chapter')
  const jsonPath = join(base, 'reviews', `${chapter}.json`)
  const existing = (await readJson(jsonPath, null)) || {
    chapter,
    verdict: 'pending',
    sections: {},
    blocking: 0,
    important: 0,
    minor: 0,
    updated: '',
  }
  const section = args.section || 'general'
  if (args.content) existing.sections[section] = String(args.content)
  if (args.verdict) existing.verdict = String(args.verdict)
  if (args.blocking !== undefined) existing.blocking = Number(args.blocking) || 0
  if (args.important !== undefined) existing.important = Number(args.important) || 0
  if (args.minor !== undefined) existing.minor = Number(args.minor) || 0
  existing.updated = now()

  const title = { continuity: '连贯性', critic: '戏剧', general: '总评' }[section] || section
  const md = [
    '---',
    `chapter: ${chapter}`,
    `verdict: ${existing.verdict}`,
    `blocking: ${existing.blocking}`,
    `important: ${existing.important}`,
    `minor: ${existing.minor}`,
    `updated: ${existing.updated}`,
    '---',
    '',
    `# 第 ${chapterNum(chapter)} 章 评审`,
    '',
    ...Object.entries(existing.sections).flatMap(([k, v]) => [
      `## ${{ continuity: '连贯性', critic: '戏剧', general: '总评' }[k] || k}`,
      '',
      v,
      '',
    ]),
  ].join('\n')

  await writeJson(jsonPath, existing)
  await writeAtomic(join(base, 'reviews', `${chapter}.md`), md)
  return { chapter, section: title, verdict: existing.verdict, path: join(base, 'reviews', `${chapter}.md`) }
}

async function reviewGet(args) {
  const base = await ensureBase(args.branch)
  const chapter = checkName(args.chapter, 'chapter')
  const data = await readJson(join(base, 'reviews', `${chapter}.json`), null)
  if (!data) throw fail(`第 ${chapter} 章还没有评审`)
  return data
}

async function decisionLog(args) {
  const stage = checkText(args.stage, 'stage')
  const decision = checkText(args.decision, 'decision')
  const reason = String(args.reason || '')
  const file = join(STORY, 'decisions.md')
  const entry = `\n## ${now()} · ${stage}\n- 决定：${decision}\n- 理由：${reason || '（未写）'}\n`
  await appendFile(file, entry, 'utf8')
  const state = await getState()
  state.decisions = (state.decisions || 0) + 1
  await saveState(state)
  return { stage, decision, reason }
}

async function decisionList() {
  let text = ''
  try {
    text = await readFile(join(STORY, 'decisions.md'), 'utf8')
  } catch {
    return { count: 0, content: '' }
  }
  return { count: (text.match(/^## /gm) || []).length, content: text }
}

async function branchCreate(args) {
  const name = checkName(args.name, 'name')
  const target = join(STORY, 'branches', name)
  if (await exists(target)) throw fail(`分支 ${name} 已存在，不要覆盖`)
  await ensureDir(target)
  for (const sub of ['canon', 'ledger', 'plan']) {
    const src = join(STORY, sub)
    if (await exists(src)) await cp(src, join(target, sub), { recursive: true })
  }
  for (const sub of ['sim', 'drafts', 'reviews']) await ensureDir(join(target, sub))
  const meta = {
    name,
    from_run: args.from_run || null,
    at_tick: args.at_tick ?? null,
    note: String(args.note || ''),
    created_at: now(),
    mainline: false,
  }
  await writeJson(join(target, 'branch.json'), meta)
  return { ...meta, path: target }
}

async function branchList() {
  const root = join(STORY, 'branches')
  let names = []
  try {
    names = (await readdir(root, { withFileTypes: true }))
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort()
  } catch {
    /* ignore */
  }
  const branches = []
  for (const name of names) {
    const meta = await readJson(join(root, name, 'branch.json'), null)
    branches.push(meta || { name })
  }
  return { count: branches.length, branches }
}

async function exportManuscript(args) {
  const base = await ensureBase(args.branch)
  const draftsDir = join(base, 'drafts')
  const files = (await listFiles(draftsDir)).filter((f) => /^ch-?\d+\.md$/.test(f)).sort()
  const state = args.branch ? await getState() : await getState()
  const title = args.title || state.title || '未命名'

  const parts = []
  for (const f of files) {
    const text = await readFile(join(draftsDir, f), 'utf8')
    const body = text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n+/, '').trim()
    const t = (text.match(/^---\r?\n[\s\S]*?title:\s*(.+)\r?\n/) || [])[1]
    const chapter = f.replace(/\.md$/, '')
    parts.push(`## 第 ${chapterNum(chapter)} 章 ${t ? t.trim() : ''}\n\n${body}`)
  }

  const manuscript = `# ${title}\n\n${parts.join('\n\n')}\n`
  const manuscriptPath = join(base, 'final', 'manuscript.md')
  await writeAtomic(manuscriptPath, manuscript)

  const threads = reduceThreads(await readJsonl(join(base, 'ledger', 'threads.jsonl')))
  const facts = reduceFacts(await readJsonl(join(base, 'ledger', 'facts.jsonl')))
  const timeline = await readJsonl(join(base, 'ledger', 'timeline.jsonl'))
  let decisions = ''
  try {
    decisions = (await readFile(join(STORY, 'decisions.md'), 'utf8'))
      .replace(/^#\s*决策记录\s*\n+/, '')
      .trim()
  } catch {
    decisions = ''
  }

  const threadTable = threads.length
    ? threads
        .map(
          (t) =>
            `| ${t.id} | ${t.question} | ${t.planted_in || ''} | ${t.payoff_target || ''} | ${t.payoff_in || ''} | ${t.status} |`,
        )
        .join('\n')
    : '（无）'

  const report = [
    '# 交付报告',
    '',
    '## 成品',
    `- 书名：${title}`,
    `- 章数：${files.length}`,
    `- 总字数：${countWords(manuscript)}`,
    '',
    '## 伏笔清算',
    '| id | 问题 | 埋 | 计划收 | 实际 | 状态 |',
    '|---|---|---|---|---|---|',
    threadTable,
    '',
    '## 统计',
    `- 事实：${facts.length}`,
    `- 事件：${timeline.length}`,
    '',
    '## 我替你做的决定',
    decisions || '（无）',
    '',
    '## 留白',
    threads.filter((t) => t.status !== 'paid').length
      ? threads
          .filter((t) => t.status !== 'paid')
          .map((t) => `- ${t.id} ${t.question}（${t.status}）`)
          .join('\n')
      : '（无）',
    '',
  ].join('\n')

  const reportPath = join(base, 'final', 'report.md')
  await writeAtomic(reportPath, report)
  return { manuscript: manuscriptPath, report: reportPath, chapters: files.length }
}

async function runRequestPut(args) {
  const request = args.request && typeof args.request === 'object' ? args.request : null
  if (!request) throw fail('request 必须是对象')
  await ensureDir(STORY)
  const file = join(STORY, 'run-request.json')
  await writeJson(file, request)
  return { path: file, request }
}

async function runRequestGet() {
  const file = join(STORY, 'run-request.json')
  const request = await readJson(file, null)
  if (!request) throw fail('还没有 run-request.json；先调用 run_request_put')
  return { ...request, storyRoot: STORY }
}

// ── 工具定义 ───────────────────────────────────────────────

const branchProp = {
  type: 'string',
  description: '可选：分支名。不填则操作主线。',
}

const TOOLS = [
  {
    name: 'run_request_put',
    description: '写入本次一键推演的请求（seed/title/genre/tone/pov/chapters/limit/dryRun/pluginRoot）。',
    inputSchema: {
      type: 'object',
      properties: {
        request: { type: 'object' },
      },
      required: ['request'],
    },
  },
  {
    name: 'run_request_get',
    description: '读取本次一键推演的请求，并返回 .story 的绝对路径。',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'project_init',
    description: '初始化小说项目，创建 .story 骨架和 state.json。已存在则返回现有状态。',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        premise: { type: 'string', description: '一句话前提' },
        genre: { type: 'string' },
        tone: { type: 'string' },
        pov: { type: 'string' },
        length_target: { type: 'number' },
        mode: { type: 'string', enum: ['director', 'author', 'auto'] },
        autonomy: { type: 'string', enum: ['final-gate', 'gated', 'auto'] },
      },
      required: ['title', 'premise'],
    },
  },
  {
    name: 'project_status',
    description: '项目总览：阶段、模式、章节、事实、伏笔、推演、评审。',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'project_update',
    description: '更新项目状态（阶段/模式/自主度/题材/基调/视角/目标章数/备注）。',
    inputSchema: {
      type: 'object',
      properties: {
        patch: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            mode: { type: 'string', enum: ['director', 'author', 'auto'] },
            autonomy: { type: 'string', enum: ['final-gate', 'gated', 'auto'] },
            phase: {
              type: 'string',
              enum: ['intake', 'concept', 'world', 'cast', 'plan', 'simulate', 'draft', 'optimize', 'finalize', 'done'],
            },
            genre: { type: 'string' },
            tone: { type: 'string' },
            pov: { type: 'string' },
            length_target: { type: 'number' },
            notes: { type: 'string' },
            add_chapter: { type: 'string', description: '把章号加入 chapters_done，如 ch03' },
          },
        },
      },
      required: ['patch'],
    },
  },
  {
    name: 'canon_put',
    description: '写世界/规则/势力/地点/语气卡/角色卡。角色卡必须给 id。',
    inputSchema: {
      type: 'object',
      properties: {
        kind: { type: 'string', enum: ['world', 'rules', 'factions', 'locations', 'voice', 'character'] },
        id: { type: 'string', description: '角色 id；kind=character 时必填' },
        content: { type: 'string' },
        branch: branchProp,
      },
      required: ['kind', 'content'],
    },
  },
  {
    name: 'canon_get',
    description: '读世界/规则/势力/地点/语气卡/角色卡。角色不给 id 时返回 id 列表。',
    inputSchema: {
      type: 'object',
      properties: {
        kind: { type: 'string', enum: ['world', 'rules', 'factions', 'locations', 'voice', 'character'] },
        id: { type: 'string' },
        branch: branchProp,
      },
      required: ['kind'],
    },
  },
  {
    name: 'canon_list',
    description: '列出 canon 下的文件。',
    inputSchema: {
      type: 'object',
      properties: {
        kind: { type: 'string' },
        branch: branchProp,
      },
    },
  },
  {
    name: 'fact_add',
    description: '追加一条结构化事实。visibility 决定谁知道；默认 public。',
    inputSchema: {
      type: 'object',
      properties: {
        subject: { type: 'string' },
        predicate: { type: 'string' },
        object: { type: 'string' },
        source: { type: 'string' },
        visibility: { type: 'array', items: { type: 'string' } },
        confidence: { type: 'number' },
        branch: branchProp,
      },
      required: ['subject', 'predicate', 'object', 'source'],
    },
  },
  {
    name: 'fact_query',
    description: '查询事实，可按 subject/predicate/object/visible_to 过滤。',
    inputSchema: {
      type: 'object',
      properties: {
        subject: { type: 'string' },
        predicate: { type: 'string' },
        object: { type: 'string' },
        visible_to: { type: 'string' },
        branch: branchProp,
      },
    },
  },
  {
    name: 'fact_check',
    description: '检查一组 claim 是否与事实库冲突、是否知识越界。',
    inputSchema: {
      type: 'object',
      properties: {
        claims: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              subject: { type: 'string' },
              predicate: { type: 'string' },
              object: { type: 'string' },
              knower: { type: 'string' },
            },
            required: ['subject', 'predicate', 'object'],
          },
        },
        branch: branchProp,
      },
      required: ['claims'],
    },
  },
  {
    name: 'fact_retire',
    description: '作废一条事实（追加 retired 记录，不删除历史）。',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        reason: { type: 'string' },
        branch: branchProp,
      },
      required: ['id', 'reason'],
    },
  },
  {
    name: 'thread_add',
    description: '新增一条伏笔。',
    inputSchema: {
      type: 'object',
      properties: {
        question: { type: 'string' },
        planted_in: { type: 'string' },
        payoff_target: { type: 'string' },
        notes: { type: 'string' },
        branch: branchProp,
      },
      required: ['question', 'planted_in'],
    },
  },
  {
    name: 'thread_update',
    description: '更新伏笔状态：planted / paid / dropped / carried。',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        status: { type: 'string', enum: ['planted', 'paid', 'dropped', 'carried'] },
        payoff_in: { type: 'string' },
        notes: { type: 'string' },
        branch: branchProp,
      },
      required: ['id'],
    },
  },
  {
    name: 'thread_list',
    description: '列出伏笔，可按状态过滤。',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['planted', 'paid', 'dropped', 'carried'] },
        branch: branchProp,
      },
    },
  },
  {
    name: 'timeline_append',
    description: '追加一条时间线事件（中性叙述）。',
    inputSchema: {
      type: 'object',
      properties: {
        summary: { type: 'string' },
        chapter: { type: 'string' },
        run_id: { type: 'string' },
        tick: { type: 'number' },
        participants: { type: 'array', items: { type: 'string' } },
        changes: { type: 'array', items: { type: 'string' } },
        source: { type: 'string' },
        branch: branchProp,
      },
      required: ['summary'],
    },
  },
  {
    name: 'timeline_list',
    description: '列出时间线事件，可按章/run 过滤。',
    inputSchema: {
      type: 'object',
      properties: {
        chapter: { type: 'string' },
        run_id: { type: 'string' },
        limit: { type: 'number' },
        branch: branchProp,
      },
    },
  },
  {
    name: 'sim_begin',
    description: '开始一次推演，写 config.json，返回 run_id。',
    inputSchema: {
      type: 'object',
      properties: {
        chapter: { type: 'string' },
        config: { type: 'object' },
        branch: branchProp,
      },
      required: ['chapter', 'config'],
    },
  },
  {
    name: 'sim_tick',
    description: '记录一个 tick：角色决策 + 裁决结果。',
    inputSchema: {
      type: 'object',
      properties: {
        run_id: { type: 'string' },
        tick: { type: 'number' },
        scene: { type: 'string' },
        actors: { type: 'array', items: { type: 'object' } },
        resolution: { type: 'object' },
        branch: branchProp,
      },
      required: ['run_id', 'tick', 'actors', 'resolution'],
    },
  },
  {
    name: 'sim_end',
    description: '结束一次推演，写 report.md 和 result.json。',
    inputSchema: {
      type: 'object',
      properties: {
        run_id: { type: 'string' },
        report: { type: 'string' },
        outcome: { type: 'object' },
        branch: branchProp,
      },
      required: ['run_id', 'report'],
    },
  },
  {
    name: 'sim_read',
    description: '读一次推演的 config、ticks、report。',
    inputSchema: {
      type: 'object',
      properties: { run_id: { type: 'string' }, branch: branchProp },
      required: ['run_id'],
    },
  },
  {
    name: 'sim_list',
    description: '列出推演，可按章过滤。',
    inputSchema: {
      type: 'object',
      properties: { chapter: { type: 'string' }, branch: branchProp },
    },
  },
  {
    name: 'draft_put',
    description: '保存章节正文，自动写 frontmatter。',
    inputSchema: {
      type: 'object',
      properties: {
        chapter: { type: 'string' },
        title: { type: 'string' },
        content: { type: 'string' },
        run_id: { type: 'string' },
        word_count: { type: 'number' },
        status: { type: 'string' },
        branch: branchProp,
      },
      required: ['chapter', 'title', 'content'],
    },
  },
  {
    name: 'draft_get',
    description: '读一章正文。',
    inputSchema: {
      type: 'object',
      properties: { chapter: { type: 'string' }, branch: branchProp },
      required: ['chapter'],
    },
  },
  {
    name: 'draft_list',
    description: '列出所有章节草稿。',
    inputSchema: { type: 'object', properties: { branch: branchProp } },
  },
  {
    name: 'review_put',
    description: '写/合并一章评审。section=continuity 或 critic；同一章多次调用会合并。',
    inputSchema: {
      type: 'object',
      properties: {
        chapter: { type: 'string' },
        section: { type: 'string', enum: ['continuity', 'critic', 'general'] },
        content: { type: 'string' },
        verdict: { type: 'string' },
        blocking: { type: 'number' },
        important: { type: 'number' },
        minor: { type: 'number' },
        branch: branchProp,
      },
      required: ['chapter', 'section', 'content'],
    },
  },
  {
    name: 'review_get',
    description: '读一章评审。',
    inputSchema: {
      type: 'object',
      properties: { chapter: { type: 'string' }, branch: branchProp },
      required: ['chapter'],
    },
  },
  {
    name: 'decision_log',
    description: '记录一个 AI 替用户做的决定（进交付报告）。',
    inputSchema: {
      type: 'object',
      properties: {
        stage: { type: 'string' },
        decision: { type: 'string' },
        reason: { type: 'string' },
      },
      required: ['stage', 'decision'],
    },
  },
  {
    name: 'decision_list',
    description: '读所有决策记录。',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'branch_create',
    description: '从主线复制 canon/ledger/plan 建一个分支。',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        from_run: { type: 'string' },
        at_tick: { type: 'number' },
        note: { type: 'string' },
      },
      required: ['name'],
    },
  },
  {
    name: 'branch_list',
    description: '列出所有分支。',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'export_manuscript',
    description: '合并所有章节为 final/manuscript.md，并生成 final/report.md。',
    inputSchema: {
      type: 'object',
      properties: { title: { type: 'string' }, branch: branchProp },
    },
  },
]

const HANDLERS = {
  run_request_put: runRequestPut,
  run_request_get: runRequestGet,
  project_init: projectInit,
  project_status: projectStatus,
  project_update: projectUpdate,
  canon_put: canonPut,
  canon_get: canonGet,
  canon_list: canonList,
  fact_add: factAdd,
  fact_query: factQuery,
  fact_check: factCheck,
  fact_retire: factRetire,
  thread_add: threadAdd,
  thread_update: threadUpdate,
  thread_list: threadList,
  timeline_append: timelineAppend,
  timeline_list: timelineList,
  sim_begin: simBegin,
  sim_tick: simTick,
  sim_end: simEnd,
  sim_read: simRead,
  sim_list: simList,
  draft_put: draftPut,
  draft_get: draftGet,
  draft_list: draftList,
  review_put: reviewPut,
  review_get: reviewGet,
  decision_log: decisionLog,
  decision_list: decisionList,
  branch_create: branchCreate,
  branch_list: branchList,
  export_manuscript: exportManuscript,
}

// ── MCP 协议 ───────────────────────────────────────────────

let buffer = ''
process.stdin.setEncoding('utf8')
process.stdin.on('data', async (chunk) => {
  buffer += chunk
  let idx
  while ((idx = buffer.indexOf('\n')) !== -1) {
    const line = buffer.slice(0, idx).trim()
    buffer = buffer.slice(idx + 1)
    if (!line) continue

    let msg
    try {
      msg = JSON.parse(line)
    } catch {
      continue
    }
    if (msg.id === undefined) continue

    try {
      let result
      if (msg.method === 'initialize') {
        result = {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {}, resources: {} },
          serverInfo: { name: 'novel-director', version: '0.2.0' },
        }
      } else if (msg.method === 'tools/list') {
        result = { tools: TOOLS }
      } else if (msg.method === 'tools/call') {
        const name = msg.params?.name
        const handler = HANDLERS[name]
        if (!handler) throw fail(`未知工具 ${name}`)
        const out = await handler(msg.params?.arguments || {})
        result = { content: [{ type: 'text', text: JSON.stringify(out, null, 2) }] }
      } else if (msg.method === 'resources/list') {
        result = { resources: [] }
      } else if (msg.method === 'ping') {
        result = {}
      } else {
        throw fail(`未知方法 ${msg.method}`)
      }
      process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result }) + '\n')
    } catch (e) {
      process.stdout.write(
        JSON.stringify({
          jsonrpc: '2.0',
          id: msg.id,
          error: { code: e.code ?? -32603, message: String(e.message || e) },
        }) + '\n',
      )
    }
  }
})

process.stdin.on('end', () => process.exit(0))
