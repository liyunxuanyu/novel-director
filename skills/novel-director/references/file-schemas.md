# 文件格式

所有文件都在工作区的 `.story/` 下。状态只通过 `story` MCP 写；下面的格式是工具读写的契约。

---

## 1. `state.json`

```json
{
  "title": "雨夜编号",
  "slug": "rain-night-0317",
  "created": "2026-10-25",
  "updated": "2026-10-25T22:30:00+08:00",
  "mode": "director",
  "autonomy": "final-gate",
  "phase": "concept",
  "genre": "悬疑",
  "tone": "冷硬",
  "pov": "third_limited",
  "length_target": 12,
  "chapters_done": [],
  "runs": [],
  "decisions": 0,
  "notes": ""
}
```

- `phase` 是**下一个要做**的阶段：`intake` / `concept` / `world` / `cast` / `plan` / `simulate` / `draft` / `optimize` / `finalize` / `done`
- `mode`：`director` / `author` / `auto`
- `autonomy`：`final-gate` / `gated` / `auto`
- `chapters_done`：已通过评审的章号，如 `["ch01","ch02"]`

`project_status` 额外返回 `story_root`（`.story` 的绝对路径），动态工作流用它拼定稿产物路径。

---

## 1.5 `.story/run-request.json`

由 `run_request_put` 写，`run_request_get` 读。动态工作流用。

```json
{
  "seed": "一个法医发现姐姐失踪案与连环案有关",
  "title": "雨夜编号",
  "genre": "悬疑",
  "tone": "冷硬",
  "pov": "third_limited",
  "chapters": 12,
  "limit": 2,
  "dryRun": false,
  "pluginRoot": "plugins/novel-director"
}
```

`run_request_get` 会额外返回 `storyRoot`（`.story` 的绝对路径）。

---

## 2. `premise.md`
```markdown
# <书名>

## 一句话
## 题材与基调
## 核心冲突
## 钩子
## 禁区
## 成功标准
```

---

## 3. `concept/<n>.md`

```markdown
# 方案 <n>：<标题>

## Logline
## 核心冲突
## 主角
## 钩子
## 三幕草图
## 风险
## 评分
```

---

## 4. `canon/world.md` / `rules.md` / `factions.md` / `locations.md`

自由 Markdown，但必须满足：

- `world.md`：时代、地理、社会结构、日常质感、禁忌
- `rules.md`：每条规则写成「规则 → 约束 → 可被利用的漏洞」
- `factions.md`：每个势力写「想要什么 / 怕什么 / 能做什么 / 不能做什么」
- `locations.md`：每个地点写「谁常来 / 什么时间危险 / 藏了什么」

---

## 5. `canon/voice.md`

见 `prose-voice.md` 的语气卡。最小字段：

```yaml
pov: third_limited
tense: past
sentence:
  avg_length: 18
  short_ratio: 0.35
vocabulary:
  register: 冷硬、克制
  avoid: ["仿佛", "似乎", "不由得"]
metaphor:
  density: low
dialogue:
  ratio: 0.35
sensory_bias: [触觉, 听觉, 气味]
taboo: [总结句, 三连排比, 情绪直说]
```

---

## 6. `canon/characters/<id>.md`

```markdown
---
id: lin_jianwei
name: 林见微
role: 主角 / 法医
age: 34
---

# 林见微

## 欲望
## 需求（她自己不知道的）
## 恐惧
## 创伤
## 谎言（她相信的错误）
## 秘密
## 语气
## 关系
| 对象 | 亲密度 | 信任 | 亏欠 | 秘密 |
|---|---|---|---|---|

## 知识边界
### 知道
### 相信（可能是错的）
### 不知道

## 目标
- 场景：
- 弧线：
- 人生：

## 资源
## 弱点
## 弧线
<从什么状态到什么状态>
```

`id` 只用小写字母、数字、下划线；不要用中文做文件名。

---

## 7. `ledger/facts.jsonl`

每行一条：

```json
{"id":"f_0001","subject":"lin_jianwei","predicate":"has_item","object":"autopsy_copy","source":"run_.../tick3","visibility":["lin_jianwei"],"confidence":1.0,"created_at":"..."}
```

作废记录：

```json
{"id":"f_0001","retired":true,"reason":"报告被周砚收回","retired_at":"..."}
```

`fact_query` 返回最新状态；`retired: true` 的不再参与校验。

---

## 8. `ledger/threads.jsonl`

新增：

```json
{"id":"t_0001","question":"姐姐留下的钥匙打开什么？","planted_in":"ch02","payoff_target":"ch09","status":"planted","related_facts":[],"notes":"","created_at":"..."}
```

更新：

```json
{"id":"t_0001","status":"paid","payoff_in":"ch09","notes":"打开医院旧档案柜","updated_at":"..."}
```

`status`：`planted` / `paid` / `dropped` / `carried`。

---

## 9. `ledger/timeline.jsonl`

```json
{"id":"e_0001","chapter":"ch03","run_id":"run_...","tick":3,"summary":"林见微撬开抽屉，取得尸检报告副本；周砚听见声音进入，未看见动作。","participants":["lin_jianwei","zhou_yan"],"changes":["lin_jianwei 获得 autopsy_copy","zhou_yan trust -1"],"source":"run_.../tick3","created_at":"..."}
```

---

## 10. `sim/runs/<run-id>/config.json`

```json
{
  "run_id": "run_20261025_221500_ch03",
  "chapter": "ch03",
  "created_at": "...",
  "scene": {
    "location": "市局旧档案室",
    "time": "凌晨两点",
    "participants": ["lin_jianwei", "zhou_yan"]
  },
  "goal": "林见微拿到姐姐的尸检报告副本",
  "pressure": "周砚开始怀疑她；档案室十一点后断网",
  "constraints": {
    "must": ["林见微看到报告中的镇静剂一栏"],
    "must_not": ["不能当场揭穿周砚"],
    "forbidden_info": ["周砚当晚去过现场"]
  },
  "max_ticks": 5,
  "off_screen": ["父亲在医院醒来"],
  "tone": "冷硬、克制、少对白"
}
```

---

## 11. `sim/runs/<run-id>/perception/<character>.md`

```markdown
# <角色> · tick <n> 感知包

## 你在哪
## 你看到谁
## 你记得什么
## 你相信什么
## 你不知道什么
## 你现在的目标
## 你的秘密
## 最近发生的事
```

---

## 12. `sim/runs/<run-id>/ticks/<nnn>.json`

```json
{
  "tick": 3,
  "scene": "市局旧档案室",
  "actors": [
    {
      "character": "lin_jianwei",
      "intent": "拿到抽屉里的副本",
      "action": "蹲下假装系鞋带，用回形针撬锁",
      "dialogue_intent": "如果被发现，就说在找失踪人口档案",
      "hide": ["她真正想找的是姐姐的编号"],
      "notice": ["周砚把钥匙串放进内袋"],
      "emotional_shift": "从克制到急躁",
      "goal_progress": "接近，但留下撬锁痕迹"
    }
  ],
  "resolution": {
    "outcomes": [],
    "conflicts": [],
    "information_flow": [],
    "state_changes": [],
    "new_facts": [],
    "thread_updates": [],
    "scene_end": false,
    "reason": ""
  }
}
```

---

## 13. `plan/chapters/ch-<nnn>.md`

```markdown
# 第 <n> 章 · <标题>

## 本章目标
## 阻力
## 转折
## 结束状态
## POV
## 必须发生
## 不能发生
## 伏笔
- 埋：
- 收：
```

---

## 14. `plan/scenes/ch-<nnn>-sc<nn>.md`

```markdown
# 场景 <n>

## POV
## 场景目标
## 冲突
## 转折
## 结果
## 节拍
## 用哪些事件
## 砍哪些事件
## 不能加的事实
```

---

## 15. `drafts/ch-<nnn>.md`

```markdown
---
chapter: ch03
title: 第三页
run_id: run_20261025_221500_ch03
word_count: 2680
status: draft
updated: 2026-10-25T23:10:00+08:00
---

正文……
```

---

## 16. `reviews/ch-<nnn>.md`

```markdown
---
chapter: ch03
verdict: pass
blocking: 0
important: 2
minor: 3
updated: 2026-10-25T23:20:00+08:00
---

# 第 3 章 评审

## 连贯性
## 戏剧
## 去 AI 味
## 修改建议
```

---

## 17. `branches/<name>/branch.json`

```json
{
  "name": "zhou-yan-killer",
  "from_run": "run_20261025_221500_ch03",
  "at_tick": 3,
  "note": "把周砚的动机从保护改成灭口",
  "created_at": "...",
  "mainline": false
}
```

分支目录里复制 `canon/`、`ledger/`、`plan/`，不复制 `drafts/` 和 `reviews/`。

---

## 18. `final/manuscript.md`

```markdown
# <书名>

> <一句话简介>

## 第一章 <标题>

正文……

## 第二章 <标题>

正文……
```

---

## 19. `final/report.md`

```markdown
# 交付报告

## 成品
## 章节
## 伏笔清算
## 我替你做的决定
## 留白
## 建议先看
```

---

## 20. `decisions.md`

由 `decision_log` 追加：

```markdown
## 2026-10-25T22:10:00+08:00 · concept
- 决定：选方案 2
- 理由：冲突最强，主角缺陷最具体
```

---

## 21. MCP 工具输入速查

| 工具 | 必填 | 可选 |
|---|---|---|
| `project_init` | `title`, `premise` | `genre`, `tone`, `pov`, `length_target`, `mode`, `autonomy` |
| `project_update` | `patch` | — |
| `canon_put` | `kind`, `content` | `id`（character 必填） |
| `canon_get` | `kind` | `id` |
| `canon_list` | — | `kind` |
| `fact_add` | `subject`, `predicate`, `object`, `source`, `visibility` | `confidence` |
| `fact_query` | — | `subject`, `predicate`, `object`, `visible_to` |
| `fact_check` | `claims` | — |
| `fact_retire` | `id`, `reason` | — |
| `thread_add` | `question`, `planted_in` | `payoff_target`, `notes` |
| `thread_update` | `id` | `status`, `payoff_in`, `notes` |
| `thread_list` | — | `status` |
| `timeline_append` | `summary` | `chapter`, `run_id`, `tick`, `participants`, `changes`, `source` |
| `timeline_list` | — | `chapter`, `run_id`, `limit` |
| `sim_begin` | `chapter`, `config` | — |
| `sim_tick` | `run_id`, `tick`, `actors`, `resolution` | — |
| `sim_end` | `run_id`, `report` | `outcome` |
| `sim_read` | `run_id` | — |
| `sim_list` | — | `chapter` |
| `draft_put` | `chapter`, `title`, `content` | `run_id`, `word_count`, `status` |
| `draft_get` | `chapter` | — |
| `draft_list` | — | — |
| `review_put` | `chapter`, `continuity`, `critic`, `verdict` | `blocking`, `important`, `minor` |
| `review_get` | `chapter` | — |
| `decision_log` | `stage`, `decision`, `reason` | — |
| `decision_list` | — | — |
| `branch_create` | `name` | `from_run`, `at_tick`, `note` |
| `branch_list` | — | — |
| `export_manuscript` | — | `title`, `include_reviews` |
