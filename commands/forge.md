---
description: 一键推演：题材构思 → 世界 → 角色 → 章纲 → 逐章推演 → 正文 → 优化 → 定稿
argument-hint: "\"一句话题材\" [--genre 悬疑] [--tone 冷硬] [--chapters 12] [--limit 3] [--gated|--auto|--dry-run] [--title 书名]"
skills: novel-director
---

使用 `novel-director` 技能处理这个请求：

$ARGUMENTS

## 你的任务

跑完整条「小说导演台」流水线。默认只在**定稿**停一次。

### 0. 解析参数

| 参数 | 含义 | 默认 |
|---|---|---|
| 第一个非选项字符串 | 一句话题材/种子 | 必填（续跑可空） |
| `--genre` | 题材 | 从种子推断 |
| `--tone` | 基调 | 从种子推断 |
| `--pov` | 视角 | `third_limited` |
| `--chapters` | 目标章数 | 12 |
| `--limit` | 本次最多跑几章（试水） | 全部 |
| `--title` | 书名 | 暂定名 |
| `--gated` | 在 Concept / Cast / Plan / Final 停 | 否 |
| `--auto` | 全程不停，仅试跑 | 否 |
| `--dry-run` | 只到章纲，不写正文 | 否 |
| `--author` | 执笔模式：正文由人写 | 否 |

### 1. 定位

读 `.story/state.json`：

- 不存在 → 进入新建流程（步骤 2）
- 存在且 `phase != done` → 从 `phase` 续跑，不要重问已定的事
- 存在且 `phase == done` → 问用户是重开、续写还是分支

### 2. Intake

调用 `story` MCP 的 `project_init`：

```json
{
  "title": "<书名或暂定名>",
  "premise": "<一句话题材>",
  "genre": "<题材>",
  "tone": "<基调>",
  "pov": "<视角>",
  "length_target": 12,
  "mode": "director",
  "autonomy": "final-gate"
}
```

写 `.story/premise.md`（按 `references/file-schemas.md`）。缺什么问什么，最多 3 个问题。

### 3. Concept

派 `novel-director:concept`，输入 `premise.md`，产物 `concept/01..03.md`。

闸门检查：3 个方案都有明确冲突与钩子。

- `--gated` → 停下来，贴三个方案的 logline/冲突/评分，让用户选
- 否则 → 选总分最高，`decision_log` 记「选方案 N，因为……；另外两个落选因为……」

调用 `project_update({patch:{phase:"world"}})`。

### 4. World

派 `novel-director:worldsmith`，输入选中的 concept，产物 `canon/world.md`、`rules.md`、`factions.md`、`locations.md`，并 `fact_add` 初始事实。

闸门检查：无自相矛盾；至少 3 组世界级张力；每条规则能制造约束。

调用 `project_update({patch:{phase:"cast"}})`。

### 5. Cast

派 `novel-director:casting`，产物 `canon/characters/*.md`。

闸门检查：3–6 人；至少两个角色目标冲突；至少一个主动反对主角；每人有秘密/语气/知识边界。

- `--gated` → 停下来贴角色表，让用户确认
- 否则 → 通过

调用 `project_update({patch:{phase:"plan"}})`。

### 6. Plan

派 `novel-director:planner`，产物 `canon/arcs.md`、`plan/chapters/*.md`、伏笔账本。

闸门检查：每章有转折；每幕有高潮；每条伏笔有回收目标；章数匹配 `--chapters`。

- `--gated` → 停下来贴章纲表
- `--dry-run` → 到这里停，输出题材 + 世界 + 角色 + 章纲，结束
- 否则 → 通过

调用 `project_update({patch:{phase:"simulate"}})`。

### 7. 逐章循环

对每一章（受 `--limit` 限制）：

#### 7.1 推演

1. 派 `novel-director:director`：
   - 输入：`plan/chapters/ch-XXX.md`、canon、最近 timeline、相关 facts、threads、用户的导演指令
   - 输出：`sim_begin` 写 config；为每个在场角色写感知包
2. 对每个 tick（最多 `max_ticks`）：
   - 并行派 `novel-director:actor` × N（**同一条消息里发多个 Agent 调用**）
   - 派 `novel-director:resolver` 裁决
   - 派 `novel-director:chronicler` 记账
   - 调用 `sim_tick` 写 tick 文件
   - 检查 `resolution.scene_end`，true 就结束
3. 调用 `sim_end` 写 `report.md`

闸门检查：

- 至少 1 个状态变化 + 1 个关系/认知变化
- 至少 1 个角色做出导演没预设的选择
- 没有知识越界

不通过 → 回退 `director`，加压力重演（最多 2 次）。

#### 7.2 成章

1. 派 `novel-director:dramatist`：从 report 选 3–5 个事件，写 `plan/scenes/ch-XXX-scYY.md`
2. 派 `novel-director:prose`：按节拍写正文，`draft_put`

闸门检查：只用已采纳事件；字数在范围内；没有新增事实。

#### 7.3 优化

并行派：

- `novel-director:continuity` → `review_put({section:"continuity"})`
- `novel-director:critic` → `review_put({section:"critic"})`

汇总：

- 有阻断 → 派 `prose` 改写（带原文引用和修法），改完重跑 `continuity`
- 最多 2 轮；仍阻断 → 回退 7.1 重演本章（最多 2 次）
- 仍不过 → 停下，把问题清单和选项交给用户

通过 → `project_update` 把章号加进 `chapters_done`，进入下一章。

### 8. 定稿

1. 检查所有章节 `drafts/` 存在、`reviews/` 无阻断
2. `thread_list` 清算伏笔：`planted` 的改成 `paid` 或标 `carried`
3. `export_manuscript`
4. `project_update({patch:{phase:"done"}})`
5. 读 `final/report.md`，按下面的格式输出

```markdown
## 定稿完成

**成品**
- 书名：
- 题材：
- 章数：
- 总字数：

**章节**
| 章 | 标题 | 字数 | 连贯性 | 戏剧 |

**伏笔清算**
| 伏笔 | 埋 | 计划收 | 实际 | 状态 |

**我替你做的决定**
<来自 decision_log，逐条：决定了什么 + 为什么>

**留白**
<没收的伏笔，为什么>

**产物**
- [manuscript.md](<绝对路径>)
- [report.md](<绝对路径>)

**建议先看**
<2–3 章>

**回复「通过」验收，或告诉我改哪里**
```

### 失败处理

| 情况 | 动作 |
|---|---|
| 子 agent 返回「待确认」 | 在最近的门槛统一问，不要逐条打断 |
| 角色趋同 | 回退 `director`，加冲突目标/秘密/误会 |
| 推演无状态变化 | 加不可逆压力，重演（最多 2 次） |
| 知识越界 | 回退 `prose`，改正文；不要改 facts 迁就 |
| 伏笔遗忘 | 回退 `planner` 补收，或标 `carried` |
| 超过重试上限 | 停下，报告问题和选项，不要无限重试 |

### 不要做

- 不要一次把所有章节塞进上下文；一章一章来
- 不要让 `actor` 看到全局 canon 或其他角色卡
- 不要手改 JSONL / state.json
- 不要在用户没同意时覆盖已有草稿或分支
- 不要把 `--auto` 当默认
