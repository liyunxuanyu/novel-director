---
name: novel-director
description: "小说导演台：一句话题材一键推演成书。适用于写长篇小说、短篇、网文、剧本；也适用于续写、改写、分支重演，或只想先看题材/世界/章纲的试跑。包含题材构思、世界与角色、弧线章纲、角色并行推演、正文、连贯性与去 AI 味优化、定稿。"
---

# 小说导演台

一句话：**人是导演，AI 是世界里的演员和史官；小说从一场可回放、可分叉的推演里剪出来。**

这个技能不是「让模型写小说」，而是让一个世界先跑起来，再把值得写的那一段剪成章节。

## 何时使用

- 用户要写长篇小说、短篇、网文、剧本
- 用户要续写、改写、换结局、分支重演
- 用户要「一键推演」：从一句话题材直接到定稿
- 用户要看世界设定、角色卡、章纲、推演报告、连贯性报告

**不要用于**：单段文案、诗歌、非叙事写作、单个句子的润色。这些直接做，别套流程。

## 入口

主入口：

```
/novel-director:forge "<一句话题材>" [--genre 悬疑] [--tone 冷硬] [--chapters 12] [--gated|--auto|--dry-run]
```

细粒度入口：

```
/novel-director:new     建项目、定前提
/novel-director:world   建世界
/novel-director:cast    建角色
/novel-director:plan    定弧线、章纲、伏笔
/novel-director:sim     跑推演
/novel-director:write   成章
/novel-director:review  评审
/novel-director:branch  分支重演
/novel-director:status  看状态
```

**每次进入先读 `.story/state.json`。** 不存在就 `project_status` 确认，再决定是新建还是续跑。不要重新问已经定过的事。

## 三条硬不变量

1. **知识边界**：角色只能基于自己知道的做决定。`actor` 只拿该角色的感知包，不拿全局 canon，不拿别人的秘密。
2. **推演与正文分离**：`actor` / `resolver` / `chronicler` 只产出「谁做了什么、结果如何、谁知道了什么」，不写描写；`prose` 只从已采纳事件和节拍写正文。
3. **状态只走 MCP**：不要手改 `facts.jsonl` / `threads.jsonl` / `timeline.jsonl` / `state.json`。所有状态变更走 `story` MCP 工具，保证原子写和 schema 一致。

违反任意一条，整个产品的差异就不存在了。

## 三种模式

| 模式 | 人做什么 | AI 做什么 | 开启 |
|---|---|---|---|
| `director` 导演（默认） | 给章级/场景级指令，审稿，接管角色 | 推演世界、起草场景、校验 | 默认 |
| `author` 执笔 | 写正文 | 查设定、校语气、查连贯性、给灵感 | `--author` |
| `auto` 放映 | 设检查点，验收 | 按弧线自主推演多章 | `--auto`，必须显式 |

`mode` 记进 `state.json`。`auto` 不是默认，也不要在用户没明说时打开。

## 自主度

| 自主度 | 停在哪 | 开启 |
|---|---|---|
| `final-gate`（默认） | 只在定稿停 | 默认 |
| `gated` | Concept / Cast / Plan / Final 各停一次 | `--gated` |
| `auto` | 不停，质量失败超过重试上限才停 | `--auto` |

**不可逆操作永远停**：删章节、改已定稿正文、覆盖分支、导出覆盖同名文件。

## 八阶段流水线

| # | 阶段 | 派谁 | 产物 | 通过条件 |
|---|---|---|---|---|
| 0 | Intake | 主流程 | `premise.md`、`state.json` | 题材/基调/篇幅/视角齐了 |
| 1 | Concept | `novel-director:concept` | `concept/01..03.md` | 3 个方案都有明确冲突与钩子 |
| 2 | World | `novel-director:worldsmith` | `canon/world.md`、`rules.md`、`factions.md`、`locations.md` | 无自相矛盾；至少 3 组世界级张力 |
| 3 | Cast | `novel-director:casting` | `canon/characters/*.md` | 3–6 人；每人有目标/秘密/关系冲突/语气 |
| 4 | Plan | `novel-director:planner` | `plan/arcs.md`、`plan/chapters/*.md`、伏笔账本 | 每章有转折；每幕有高潮；每条伏笔有回收目标 |
| 5 | Simulate | `director` + `actor`×N + `resolver` + `chronicler` | `sim/runs/<run-id>/` | 每章 ≥1 状态变化 + ≥1 关系/认知变化 |
| 6 | Draft | `dramatist` + `prose` | `plan/scenes/*.md`、`drafts/ch-*.md` | 连贯性 0 阻断；字数在范围内 |
| 7 | Optimize | `continuity` + `critic` + `prose` | `reviews/ch-*.md` | Critic 无阻断；去 AI 味通过 |
| 8 | Finalize | 主流程 | `final/manuscript.md`、`final/report.md` | 全部章节通过；伏笔已收或标注留白 |

`--dry-run` 在阶段 4 后停，不写正文。

## 每章内部循环

```
读 plan/chapters/ch-XXX.md
   ↓
director：写 run config（场景/在场者/压力/约束/禁区/max_ticks）
   ↓
actor × N 并行（同一条消息里发多个 Agent 调用）
   ↓
resolver：裁决 + 信息流 + 状态变更
   ↓
chronicler：timeline / facts / threads 落账
   ↓
（3–6 ticks，或 scene_end=true 提前结束）
   ↓
读 run report，判断是否够一章
   ↓
dramatist：选 3–5 个事件 → 场景节拍
   ↓
prose：正文
   ↓
continuity + critic 并行评审
   ↓
prose 改写（最多 2 轮）→ 仍阻断则重演本章（最多 2 次）
   ↓
通过 → drafts/ + reviews/ → 下一章
```

## 派发规则

### 必须单实例

`concept`、`worldsmith`、`casting`、`planner`、`director`、`resolver`、`chronicler`、`dramatist`、`continuity`、`critic`。

它们需要全局视野；拆开会产生互相打架的结论。

### 必须并行

`actor`：一个角色一个实例。**所有 Agent 调用放在同一条消息里**，否则是串行，等于让后一个角色读到前一个的决定。

每个 `actor` 的派发消息必须包含：

- 项目根绝对路径
- 该角色卡路径
- 该角色的感知包路径（`sim/runs/<run-id>/perception/<character>.md`）
- 场景配置路径
- 本 tick 编号
- 一句「你只知道感知包里的内容；不知道的就说不知道」

**不要把 canon 全量、其他角色卡、run report 给 actor。** 给了就没有知识边界。

### 复核实例

以下情况给该阶段额外派一个同角色实例做独立复核，产物写 `<原产物>.review.md`：

- 章纲超过 20 章
- 单章正文预估超过 5000 字
- 上一轮该章被打回
- 涉及分支合并

## 状态与文件

```
.story/
  state.json
  premise.md
  concept/
  canon/
  ledger/
  plan/
  sim/runs/<run-id>/
  drafts/
  reviews/
  branches/
  final/
```

完整格式见 `references/file-schemas.md`。

**写状态的唯一方式**：`story` MCP 工具。

| 动作 | 工具 |
|---|---|
| 建项目 | `project_init` |
| 改阶段/模式 | `project_update` |
| 写世界/角色 | `canon_put` |
| 加事实 | `fact_add` |
| 查事实 | `fact_query` |
| 查知识越界 | `fact_check` |
| 加/更伏笔 | `thread_add` / `thread_update` |
| 加事件 | `timeline_append` |
| 开/记/结推演 | `sim_begin` / `sim_tick` / `sim_end` |
| 存正文 | `draft_put` |
| 存评审 | `review_put` |
| 记决定 | `decision_log` |
| 建分支 | `branch_create` |
| 导出 | `export_manuscript` |

## 质量闸门

| 阶段 | 通过条件 | 不通过 |
|---|---|---|
| Concept | 3 个方案都有明确冲突与钩子 | 重出 |
| World | 无自相矛盾；每个角色有目标/秘密/关系冲突 | 补丁 |
| Plan | 每章有转折；每幕有高潮；每条伏笔有回收目标 | 重排 |
| Sim | 每章 ≥1 状态变化 + ≥1 关系/认知变化 | 加压重演（最多 2 次） |
| Draft | 连贯性 0 阻断；字数在范围内 | 改写 |
| Optimize | Critic 无阻断；去 AI 味通过 | 改写 2 轮，仍不过回退重演 |
| Final | 全部章节通过；伏笔已收或标注留白 | 出报告，不硬凑 |

**重试上限**：每章最多 3 次推演、2 轮改写。超过就停下，把问题和选项交给用户，不要无限重试。

## 门槛汇报格式

到停点时，不要只给路径。按下面格式贴真实内容：

```markdown
## 阶段 <key>：<名称> 已完成

**产物**
- [<文件>](<绝对路径>) — <一句话摘要>

**核心内容**
<按阶段贴真实内容：3 个题材方案 / 角色表 / 章纲表 / 推演报告摘要 / 评审问题清单>

**我替你做的决定**
<逐条：决定了什么 + 为什么>

**需要你决定**
<最多 3 条；超出的标「非阻塞，默认按 A 处理」>

**回复「通过」继续，或告诉我改哪里**
```

路径用正斜杠；含空格用尖括号包住。不要用 `- [ ]` 复选框。

## 失败与回退

| 情况 | 处理 |
|---|---|
| 角色趋同、没人反对 | 回退到 `director`，加压力：至少一个角色的目标与主角冲突；至少一个秘密会被触碰 |
| 推演没有状态变化 | 重跑本章，加一个不可逆压力（截止时间/损失/第三方介入） |
| 正文出现未采纳事件 | 回退 `prose`，删掉该事实；必要时补 `fact_add` 并标注来源 |
| 知识越界 | 回退 `prose`，改成该角色能知道的信息；不要改 facts 迁就正文 |
| 伏笔埋了没收 | 回退 `planner`，补回收章；或在 `final/report.md` 标注「续作留白」 |
| 文风 AI 味重 | 回退 `prose`，按 `references/prose-voice.md` 做一轮去 AI 味 |
| 分支与主线冲突 | 以分支目录为准；不要把分支事实写回主线 |

**不要在下游硬圆上游的矛盾。** 发现 PRD/章纲/角色卡互相打架，回退到产生矛盾的那一阶段。

## 分支

```
/novel-director:branch --from <run-id> --tick <n> --name <分支名> --change "把周砚的动机从保护改成灭口"
```

流程：

1. `branch_create` 复制 `canon/`、`ledger/`、`plan/` 到 `branches/<name>/`
2. 在分支目录里改一个变量（角色动机/事实/关系/世界规则）
3. 从分叉 tick 重跑，产物写分支目录
4. 对比两份 run report，给用户看差异

**分支不改历史**：主线文件不动；分支是复制，不是回滚。

## 定稿

`export_manuscript` 生成：

- `final/manuscript.md`：按章合并，带章标题
- `final/report.md`：字数、章节、伏笔清算、连贯性问题统计、AI 自己做的决定（来自 `decision_log`）、留白清单

定稿是人的事：导出前必须让用户确认书名、章节顺序、是否包含评审附录。

## 沟通方式

- 到门槛贴真实内容，不只给链接
- 自动通过的阶段用两三句话简报
- 不要复述整份文档；贴用户判断方向需要的那部分
- 发现方向性问题直接说，不要为了流程顺畅含糊过去
- 用户说「停一下」「先给我看」→ 立即把 `autonomy` 改成 `gated`，从当前阶段走门槛

## 边界

- 不碰用户工作区里已有的小说项目，除非用户明确要求
- 不伪造引用、不假装查过资料
- 不替用户决定书名、笔名、发布平台
- 不做封面、排版、有声、版权
- 不承诺「零编辑出版」；交付的是可编辑的定稿
