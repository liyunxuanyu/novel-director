# 小说导演台 Novel Director — 同类项目研究与插件设计方案

> 插件：**novel-director** / 显示名「小说导演台」
> 状态：设计已定，按本文档落插件
> 边界：未读取任何本地小说项目；只查了公开资料与 ZCode 插件规范

---

## 0. 一句话

一个长在 ZCode 里的长篇小说创作平台：**人是导演，AI 是世界里的演员和史官；小说不是一次性生成出来的，而是从一场可回放、可分叉的世界推演里剪出来的。**

---

## 1. 同类项目：四个阵营，各解决一半问题

### A. 商业写作台 —— 解决「一致性」，但不解决「世界活着」

| 产品 | 核心机制 | 强在哪 | 缺什么 |
|---|---|---|---|
| [Novelcrafter](https://www.novelcrafter.com/) | Codex 结构化百科 + BYOK + 场景/章节规划 | 设定管理、长期系列、模型自由 | AI 被动；Codex 靠人维护；角色不自主 |
| [Sudowrite](https://sudowrite.com/) | Story Bible + Muse 模型 + Canvas/Describe/Rewrite | 文笔、改写、引导式工作流 | 一致性靠人；无推演；闭源 |
| [NovelAI](https://novelai.net/) | Lorebook 关键词触发 + 自训练模块 + 无审查 | 氛围、自由度、角色扮演 | 事实校验弱；Lorebook 手工维护 |
| [彩云小梦](https://www.xiaomengai.com/) | 三条平行续写 + 世界设定 + 角色扮演 + 世界广场 | 多分支选择的交互直觉 | 长篇结构弱；偏短篇/互动 |
| [马良写作](https://maliangwriter.com/) | 续写 + 角色/设定/伏笔/时间线整理 + 逐段对比 | 中文长篇、可控改写 | 仍是「AI 辅助写作」，无世界推演 |
| [墨斗 AI](https://yuantuai.com/products/writing-tool.html) / 墨狐 / 文枢 | 设定库→大纲→细纲→正文→一致性校验→去 AI 味 | 网文工业化流程 | 流水线，角色不自主 |
| [Novarrium](https://novarrium.com/) | 自动抽取事实 + Logic-Locking + 生成后校验 | 一致性守卫的产品化 | 新、生态小；仍是写作台 |

**共同点**：它们把「设定」当资料库，AI 是查询/生成器。故事世界本身不运行，角色不会在你不在场时做出选择。

### B. 开源流水线 —— 解决「自动化」，但不解决「人机协作」

| 项目 | 做法 | 强在哪 | 缺什么 |
|---|---|---|---|
| [AI_NovelGenerator](https://github.com/YILING0013/AI_NovelGenerator) | 世界观/角色/大纲/章节，自动衔接上下文与伏笔 | 中文社区验证，结构完整 | 单机脚本，人机协作弱 |
| [ainovel-cli](https://github.com/voocel/ainovel-cli) | 多 agent：世界观→角色→大纲→逐章→评审→重写→弧摘要→角色快照 | 全自动、角色快照 | 一键生成，导演介入少 |
| [PlotPilot / 墨枢](https://github.com/shenminglinyi/PlotPilot) | 剧情引擎内核，不是聊天助手 | 把「剧情」当引擎 | 偏工程内核，产品化早期 |
| [AI-Novel-Writing-Assistant](https://github.com/ExplosiveCoderflome/AI-Novel-Writing-Assistant) | Agent + 世界观 + 写法引擎 + RAG + 整本生产 | 工程完整 | 重，学习成本高 |
| [NovelWriter_public](https://github.com/tuxiangxianzhe/NovelWriter_public) | 分步生成，每步可基于建议修订 | 分步可控 | 仍是生成流水线 |
| [lightnovel-studio](https://github.com/mmlong818/lightnovel-studio) | 一句话全稿，中日双语 | 快速出稿 | 轻量，深度有限 |

**共同点**：把小说当「生产任务」，追求从一句话到一本书。人只在开头给一句设定，中间没有导演位。

### C. 多智能体推演 —— 解决「涌现」，但不解决「小说」

| 项目 | 做法 | 强在哪 | 缺什么 |
|---|---|---|---|
| [Generative Agents (Stanford)](https://arxiv.org/abs/2304.03442) | memory stream + reflection + planning；25 个 agent 自发社交 | 涌现、记忆、反思 | 不是小说；无叙事压缩 |
| [AI Town](https://github.com/a16z-infra/ai-town) | 可部署的 agent 小镇 starter kit | 工程化、可玩 | 沙盒，无长篇结构 |
| [Project Sid (Altera)](https://github.com/altera-al/project-sid) | PIANO 架构，50–1000 agents 文明模拟 | 大规模社会涌现 | 研究导向，不是创作工具 |
| [Dramatron (DeepMind)](https://github.com/google-deepmind/dramatron) | logline→characters→plot→scenes→dialogue 层级生成 | 结构一致性、人机共创 | 无角色自主；prompt chaining |
| [Multi-Agent Character Simulation (2025)](https://aclanthology.org/2025.in2writing-1.9.pdf) | 从叙事计划出发，agents 角色扮演演场景，再重写成故事 | 最接近「推演→小说」 | 学术原型，无产品化 |
| [AI Dungeon](https://help.aidungeon.com/faq/the-memory-system) | Memory System + Story Cards + Story Summary | 回合制互动、记忆压缩 | 无长篇结构；玩家即主角 |
| [SillyTavern](https://docs.sillytavern.app/usage/core-concepts/worldinfo/) | World Info/Lorebook + 群聊 + 角色卡 | 角色扮演、群像 | 无叙事结构；无成书流程 |

**共同点**：世界真的在跑，但没有「成书」这一步。事件很多，没有人负责把它们剪成有节奏的章节。

### D. ZCode / Claude Code 插件生态 —— 证明形态可行

| 项目 | 做法 | 意义 |
|---|---|---|
| [book-genesis-v4](https://github.com/felipelobomotta-blip/book-genesis-v4) | 20 个 Claude Code skills 写整本书 | 证明 skill 流水线可行 |
| [Claude Book](https://hackernoon.com/claude-book-a-multi-agent-framework-for-writing-novels-with-claude-code) | 多 agent + 一致性检查 + perplexity gate | 证明多 agent 编排可行 |

**共同点**：都是「生成管线」，不是「世界模拟 + 导演」。

### 参考项目的具体做法：AI-Novel-Writing-Assistant（Biz Novel Studio）

你点名的那套「导演模式」，具体是它的 V2 Director Console：

- **一本书一个导演台**：读本书的大纲、正文、素材，决定下一段推进什么。
- **两种推进**：全自动（在授权章节范围内自己规划、写、检查、保存、继续）和按阶段确认（到确认点停下等人）。
- **范围受限**：提交第 1–3 章，不会自动写第 4 章；模型不可用、需要重规划、用量保护、数据完整性问题时会暂停。
- **每章流水线**：组装上下文 → 正文生成 → 章节检查 → 保存 → 预算内局部修文 → 复验并选择保留稿 → 同步角色/资源/伏笔状态 → 结果复盘。
- **质量策略**：完成优先（残余问题留作提醒）或质量优先（保存后暂停等人处理）。
- **配套**：拆书、世界样本库、角色库、风格引擎、反 AI 规则、知识库/RAG、逐任务模型路由、token 缓存。

它已经把「导演台 + 分阶段推进 + 章节质检 + 状态同步」做得很完整。我们不在 Web 工作台上跟它比，而是做它没有的那一层：

| 维度 | AI-Novel-Writing-Assistant | 小说导演台（本插件） |
|---|---|---|
| 形态 | 完整 Web/Electron 工作台 | ZCode 插件，对话即工作台 |
| 世界 | 设定库 + RAG 检索 | 可运行的推演世界：角色并行决策、信息流、状态变更 |
| 角色 | 角色卡 + 关系图 | 角色有知识边界，只基于自己知道的行动 |
| 导演 | 决定下一段推进 + 质量策略 | 导演指令 + 接管角色 + 分支重演 |
| 小说来源 | 大纲 → 逐章生成 | 推演事件 → 选材 → 节拍 → 正文 |
| 一致性 | 章节检查 + 状态同步 | 结构化事实 + visibility 知识校验 + 伏笔账本 |
| 交付 | Web 应用 | `/novel-director:forge` 一条命令，产物落在 `.story/` |

一句话：**它把「导演台」产品化了；我们把「导演台」变成可推演、可分支、可审计的世界。**

### 结论：四个能力，没人同时做到

| 能力 | 商业写作台 | 开源流水线 | 推演派 | 我们要做的 |
|---|---|---|---|---|
| 长期一致性 | 强（人工维护） | 中 | 弱 | 强（结构化事实 + 知识边界） |
| 角色自主性 | 弱 | 弱 | 强 | 强（角色并行决策） |
| 叙事结构 | 强 | 中 | 弱 | 强（编剧层 + 章纲） |
| 导演式人机协作 | 中 | 弱 | 中 | 强（导演指令/接管/分支） |
| 分支与回放 | 弱 | 弱 | 中 | 强（状态快照 + tick 回放） |
| 去 AI 味 | 中 | 中 | 弱 | 中（语气卡 + 编辑层） |

**空位**：把「推演」和「叙事」分成两层，人站在中间当导演。不是让 AI 写小说，而是让 AI 把一个世界跑起来，人决定哪一段值得写成小说。

---

## 2. 产品定义

### 2.1 三种模式

| 模式 | 人做什么 | AI 做什么 | 默认 |
|---|---|---|---|
| **执笔** Author | 写正文 | 查设定、校语气、查连贯性、给灵感 | 否 |
| **导演** Director | 给章级/场景级指令，审稿，接管角色 | 推演世界、起草场景、校验 | **是** |
| **放映** Auto | 设检查点，验收 | 按弧线自主推演多章 | 否，必须显式开启 |

> 「暂时不要开自动」= 默认导演模式，任何自动推演都要人先给 run 配置和 tick 上限。

### 2.2 核心循环

```
人：导演指令（意图 / 压力 / 禁区）
        ↓
Director：场景配置（地点 / 时间 / 在场者 / 目标 / 压力 / 约束）
        ↓
Actor × N（并行，各自只知道自己的认知）
        ↓
Resolver：冲突裁决 + 信息流 + 状态变更
        ↓
Chronicler：事件入 timeline，事实入 facts，伏笔入 threads
        ↓
（循环 N 个 tick）
        ↓
Run Report：发生了什么、谁改变了、哪些线索被埋/被收
        ↓
人：选材 / 改指令 / 接管角色 / 分支
        ↓
Dramatist：场景节拍（POV / 目标 / 冲突 / 转折 / 结果）
        ↓
Prose：正文
        ↓
Continuity + Critic：事实校验 + 戏剧评审
        ↓
人：采纳 / 改写 / 重演 / 分支
```

### 2.3 五个不变量

1. **知识边界**：角色只能基于自己知道的做决定。读者知道的、作者知道的、角色知道的，三者分开。
2. **推演与正文分离**：推演只产出「谁做了什么、结果如何」，不产出描写。正文是二次创作。
3. **正文只从已采纳事件派生**：没进 canon 的推演结果不能出现在正文里。
4. **canon 变更可追溯**：每条事实/关系/伏笔变更都记录来源（章号 / tick / 导演指令）。
5. **分支不改历史**：分叉是复制状态，不是回滚覆盖；主线永远可复现。

### 2.4 一键推演（Forge Pipeline）

一条命令跑完整条链，但不是「一条提示词生成一本小说」。它是**有边界、有产物、可中断、可回放**的流水线，中间每一站都落文件。

```bash
/novel-director:forge "一个法医发现姐姐失踪案与连环案有关" --genre 悬疑 --chapters 12
```

| 阶段 | 做什么 | 产物 | 默认停不停 |
|---|---|---|---|
| 0 Intake | 解析种子；缺什么问什么（题材/基调/篇幅/视角） | `premise.md` | 不停 |
| 1 Concept | 出 3 个题材方案：logline、核心冲突、主角欲望/障碍、钩子、三幕草图、风险 | `concept/*.md` | 默认不停，`--gated` 停 |
| 2 World & Cast | 世界规则、3–6 角色、关系图、秘密、知识边界 | `canon/` | 默认不停，`--gated` 停 |
| 3 Plan | 弧线、章纲、伏笔账本；每章必须有转折和状态变化 | `plan/` | 默认不停，`--gated` 停 |
| 4 Simulate | 逐章推演 3–6 ticks；导演施压、角色并行、裁决、记账 | `sim/runs/` | 不停（失败重跑） |
| 5 Draft | 选材→节拍→正文 2000–3000 字/章 | `drafts/` | 不停 |
| 6 Optimize | 连贯性校验 + 戏剧评审 + 去 AI 味改写，最多 2 轮 | `reviews/` | 不停（阻断则回退重演） |
| 7 Finalize | 合并定稿、伏笔清算、风格报告、导出 | `final/` | **停**（人验收） |

**默认只停一次：Final。** 想在中途把关就加 `--gated`，在 Concept / World & Cast / Plan 各停一次；`--auto` 连 Final 也不停，只用于试跑。

**每章的内部循环**：

```
Plan 的章纲
   ↓
Director：本章压力 / 禁区 / 在场者
   ↓
Actor × N 并行 → Resolver 裁决 → Chronicler 记账（3–6 ticks）
   ↓
Run Report：状态变化 / 关系变化 / 认知变化 / 新埋或回收的伏笔
   ↓
Dramatist：选 3–5 个事件 → 场景节拍
   ↓
Prose：正文
   ↓
Continuity（阻断/重要/次要）+ Critic（赌注/主动性/节奏/语气/俗套/AI 味）
   ↓
Prose 改写（最多 2 轮）→ 仍阻断则回退重演本章
   ↓
章节通过 → 写入 drafts/ + reviews/ → 下一章
```

**「一键」的边界**：

- 一键 = 一条命令 + 一条流水线，不是一次模型调用。
- 每站都有产物，随时可以停、看、改、续跑。
- 失败会回退到具体阶段，不会整本重来。
- `--chapters 3` 先跑 3 章试水；`--dry-run` 只出题材+世界+大纲，不写正文。

**优化到底优化什么**：

1. **连贯性**：事实冲突、知识越界、时间线错位、伏笔遗忘。
2. **戏剧**：赌注是否清楚、主角是否主动、场景是否有转折、节奏是否拖。
3. **文风**：语气卡一致性、句式节奏、禁用词、情绪直说、总结句、排比三连。
4. **去 AI 味**：把抽象情绪改成动作/感官；删掉解释性总结；打散均匀句式；保留人的不完美。

**质量闸门**：

| 阶段 | 通过条件 | 不通过怎么办 |
|---|---|---|
| Concept | 3 个方案都有明确冲突与钩子 | 重出 |
| World | 无自相矛盾；每个角色有目标/秘密/关系冲突 | 补丁 |
| Plan | 每章有转折；每幕有高潮；每条伏笔有回收目标 | 重排 |
| Sim | 每章至少 1 个状态变化 + 1 个关系/认知变化 | 加压重演 |
| Draft | 连贯性 0 阻断；字数在范围内 | 改写 |
| Optimize | Critic 无阻断；去 AI 味通过 | 改写 2 轮，仍不过回退重演 |
| Final | 全部章节通过；伏笔已收或明确标注为续作留白 | 出报告，不硬凑 |

---

## 3. 领域模型

| 实体 | 作用 | 存放 | 谁写 |
|---|---|---|---|
| World | 世界规则、地理、势力、时代、禁忌 | `canon/world.md` | worldsmith |
| Character | 欲望/恐惧/创伤/秘密/语气/关系/知识边界/目标 | `canon/characters/*.md` | casting |
| Fact | 结构化事实：主语/谓语/宾语/来源/可见性 | `ledger/facts.jsonl` | chronicler |
| Thread | 伏笔：埋在哪、问什么、何时收、状态 | `ledger/threads.jsonl` | chronicler / dramatist |
| Event | 时间线事件：tick、在场者、动作、结果、信息流 | `ledger/timeline.jsonl` | chronicler |
| Run | 一次推演：配置、ticks、报告 | `sim/runs/<id>/` | director / actor / resolver |
| Scene | 场景节拍：POV、目标、冲突、转折、结果 | `plan/scenes/*.md` | dramatist |
| Chapter | 章节草稿 | `drafts/ch-*.md` | prose |
| Branch | 分支世界线：canon + ledger 快照 + 分叉点 | `branches/<id>/` | 人 / MCP |

### 3.1 角色卡的最小字段

```yaml
name: 林见微
role: 主角 / 法医
desire: 找出姐姐失踪的真相
need: 承认自己不是唯一的受害者
fear: 自己也会变成加害者
wound: 十二年前没能阻止父亲带走姐姐
lie: 只要足够理性，就不会重蹈覆辙
secret: 她保留了姐姐案发现场的一件物证
voice: 短句，少形容词，习惯用职业术语掩饰情绪
relationships:
  - target: 周砚
    affinity: 3        # -5..5
    trust: 2
    debt: 0
    secret: 她怀疑周砚当年在场
knowledge:
  knows: [姐姐失踪于雨夜, 父亲有暴力史]
  believes: [周砚是清白的]   # 可能是错的
  unaware: [周砚当晚去过现场]
goals:
  scene: 拿到尸检报告
  arc: 进入旧案调查组
  life: 找到姐姐
```

### 3.2 事实的最小字段

```json
{
  "id": "f_0001",
  "subject": "lin_jianwei",
  "predicate": "has_item",
  "object": "sister_case_evidence",
  "source": "ch01",
  "visibility": ["lin_jianwei"],
  "confidence": 1.0,
  "created_at": "2026-10-25T10:00:00+08:00"
}
```

> `visibility` 是一致性校验的核心：正文里如果让周砚说出只有林见微知道的事，continuity 直接标「知识越界」。

### 3.3 伏笔账本

```json
{
  "id": "t_0003",
  "question": "姐姐留下的钥匙打开什么？",
  "planted_in": "ch02",
  "payoff_target": "ch09",
  "status": "planted",
  "related_facts": ["f_0007"],
  "notes": "最迟 ch10 必须收，否则读者会忘"
}
```

---

## 4. 插件架构

### 4.1 目录

```
plugins/novel-director/
  .zcode-plugin/plugin.json
  skills/novel-director/
    SKILL.md
    references/
      pipeline.md                # 八阶段流水线与闸门
      simulation-protocol.md     # 推演规则：tick、感知、裁决、信息流
      continuity-rules.md        # 连贯性校验规则与分级
      prose-voice.md             # 语气卡、禁用句式、去 AI 味
      file-schemas.md            # 所有文件格式
  agents/
    concept.md
    director.md
    worldsmith.md
    casting.md
    planner.md
    actor.md
    resolver.md
    chronicler.md
    dramatist.md
    prose.md
    continuity.md
    critic.md
  commands/
    forge.md
    flow.md
    new.md
    world.md
    cast.md
    plan.md
    sim.md
    write.md
    review.md
    branch.md
    status.md
  mcp/
    story-server.mjs
  workflows/
    forge.dwf.ts
```

### 4.2 Agent 分工

| Agent | 输入 | 输出 | 明确不做 |
|---|---|---|---|
| `concept` | 一句话题材 + 偏好 | 3 个题材方案（logline/冲突/钩子/三幕/风险/评分） | 不建世界、不写正文 |
| `director` | 人的导演指令 + canon + 当前弧线 | run config：场景、在场者、压力、约束、禁区 | 不写角色台词、不写正文 |
| `worldsmith` | premise + 题材 | world.md + rules.md + 初始 facts | 不建角色、不写剧情 |
| `casting` | world + premise | 3–6 张角色卡 | 不写大纲、不写正文 |
| `planner` | concept + world + cast | 弧线、章纲、伏笔账本 | 不写正文、不改角色 |
| `actor` | 角色卡 + 该角色感知 + 记忆 + 目标 | 意图/动作/台词意图/隐藏/注意 | 不知道全局真相；不写描写 |
| `resolver` | 所有 actor 输出 + 世界规则 | 裁决结果 + 信息流 + 状态变更 | 不替角色做决定；不写正文 |
| `chronicler` | 裁决结果 | timeline 事件 + facts + threads 更新 | 不评价好坏、不写正文 |
| `dramatist` | run report + 章纲 + 风格 | 场景节拍（POV/目标/冲突/转折/结果） | 不写正文、不改 canon |
| `prose` | 节拍 + 角色语气 + 风格指纹 | 章节草稿 | 不加新事实、不改剧情 |
| `continuity` | 草稿 + facts + threads + timeline | 分级问题清单（阻断/重要/次要） | 不改稿 |
| `critic` | 草稿 + 节拍 | 戏剧评审：赌注/主动性/节奏/语气/俗套/AI 味 | 不改稿 |

> 角色是模板，不是实例。`actor` 可以并行派 N 次，每次带不同角色卡路径。这是「同时决策」的关键。

### 4.3 命令

| 命令 | 做什么 | 门槛 |
|---|---|---|
| `/novel-director:forge` | **一键推演（主 agent 流程）**：题材→世界→角色→大纲→逐章推演→正文→优化→定稿 | 默认只在 Final 停；`--gated` 加三个中间停点 |
| `/novel-director:flow` | **一键推演（ZCode 动态工作流）**：同样八阶段，脚本控制章循环与角色并行，带阶段图和进度看板 | 只在定稿停；不支持 `--gated` |
| `/novel-director:new` | 建项目、定题材/前提/基调/篇幅 | 人确认 premise |
| `/novel-director:world` | 建世界规则、地理、势力 | 人确认 canon |
| `/novel-director:cast` | 建 3–6 个角色卡 | 人确认 cast |
| `/novel-director:plan` | 定弧线、章纲、伏笔计划 | 人确认大纲 |
| `/novel-director:sim` | 导演指令 → N ticks → run report | 人可中途接管/叫停 |
| `/novel-director:write` | 选 run/ticks → 节拍 → 正文 → 校验 | 人采纳/改写/重演 |
| `/novel-director:review` | 连贯性 + 戏剧评审 | 人决定是否回退 |
| `/novel-director:branch` | 从某 tick 分叉，改变量重跑 | 人确认分叉点 |
| `/novel-director:status` | 世界/角色/时间线/伏笔/草稿/未决 | 只读 |

### 4.4 MCP 工具（只让工具写状态，不让 LLM 手改 JSON）

| 组 | 工具 |
|---|---|
| 项目 | `project_init`, `project_status`, `project_update`, `run_request_put`, `run_request_get` |
| Canon | `canon_get`, `canon_put`, `canon_list` |
| 事实 | `fact_add`, `fact_query`, `fact_check`, `fact_retire` |
| 伏笔 | `thread_add`, `thread_update`, `thread_list` |
| 时间线 | `timeline_append`, `timeline_list` |
| 推演 | `sim_begin`, `sim_tick`, `sim_end`, `sim_read`, `sim_list` |
| 草稿 | `draft_put`, `draft_get`, `draft_list` |
| 评审 | `review_put`, `review_get` |
| 决策 | `decision_log`, `decision_list` |
| 分支 | `branch_create`, `branch_list` |
| 导出 | `export_manuscript` |

实现要点：JSONL 追加写；原子写（临时文件 + rename）；schema 校验；分支 = 目录快照 + 分叉指针。

### 4.5 项目文件布局

```
<小说项目>/.story/
  state.json
  premise.md
  canon/
    world.md
    rules.md
    characters/<slug>.md
    factions.md
    locations.md
  ledger/
    facts.jsonl
    threads.jsonl
    timeline.jsonl
  plan/
    arcs.md
    chapters/ch-001.md
    scenes/ch-001-sc01.md
  sim/
    runs/<run-id>/
      config.json
      ticks/001.json
      report.md
  drafts/ch-001.md
  reviews/ch-001.md
  branches/<branch-id>/
```

### 4.6 动态工作流集成

**为什么加。** 这条流水线的形状是「章循环 + 每 tick 角色并行 + 评审回退 + 有界重试」，正好是脚本控制流擅长的事。让主 agent 逐条照 markdown 执行，容易漏、容易串行、容易在长上下文里丢状态；写成动态工作流后，章循环、并行扇出、重试上限、产物发布都是确定的。

**怎么接。**

- `workflows/forge.dwf.ts`：TypeScript 脚本，由 `/novel-director:flow` 触发。
- 命令先把请求通过 `run_request_put` 写进 `.story/run-request.json`；脚本的第一个子 agent 用 `run_request_get` 读取（seed / genre / tone / chapters / limit / dryRun / pluginRoot），所以同一条命令可以反复用不同输入。
- 六个 phase：题材构思 → 建世界 → 建角色 → 定章纲 → 逐章推演与成稿 → 定稿与交付。
- `agent()` 没有 `subagent_type`，所以每个子 agent 的 persona 是「先读 `<pluginRoot>/agents/<role>.md` 并严格按它执行」；角色定义只有一份，主 agent 流程和工作流共用。
- 子 agent 共享同一套工具，包括 `story` MCP；状态写入仍然只走 MCP。
- 章节进度用 `artifact.board` + `report(item, "chapters")` 做实时看板；定稿和交付报告用 `artifact.file` 发布。
- 每章评审阻断最多改写 2 轮；仍阻断则标 `needs-human` 并继续，不整本停。

**边界。**

| 能力 | `forge` 主 agent 流程 | `flow` 动态工作流 |
|---|---|---|
| 一键跑完 | 是 | 是 |
| 中途停（`--gated`） | 是 | 否（工作流不能中途问人） |
| 接管角色 | 是 | 否（脚本运行中不接人类输入） |
| 章循环 / 并行扇出 | 主 agent 自己保证 | 脚本保证 |
| 阶段图 / 进度看板 | 对话里汇报 | 原生阶段图 + 看板 |
| 断点续跑 | 靠 `.story/state.json` | `ResumeWorkflowRun` / `AmendWorkflow` |
| 失败修复 | 主 agent 回退 | `AmendWorkflow` 只重跑改动部分 |

**结论**：`flow` 是「一键到底」的默认形态；`forge --gated` 是「我要中途把关」的形态。两者共用同一套 agent、MCP 和 `.story/` 产物。

---

## 5. v1 垂直切片

不做全量，先证明「推演 → 成章」这条链真的能跑。

### 验收场景

1. 输入一句前提，10 分钟内建好世界 + 3 个角色。
2. 跑 5 个 tick，产出 run report；至少 1 个角色做出导演没预设的选择。
3. 从 run 里选 3–4 个事件，写成 2000–3000 字一章。
4. continuity 0 阻断；critic 至少指出 1 个真问题。
5. 从第 3 个 tick 分叉，改一个角色动机，重跑，得到不同结局。
6. 全程在 ZCode 对话里完成，不需要打开别的编辑器。

### v1 范围

- 11 个命令（`/novel-director:forge` 主流程 + `/novel-director:flow` 动态工作流 + 9 个细粒度入口）
- 12 个 agent
- 1 个 MCP server（约 30 个工具）
- 1 个主 skill + 5 份 reference
- 1 个动态工作流脚本（`workflows/forge.dwf.ts`）
- 不做 UI 面板（v1.1 再加「故事看板」）

---

## 6. 关键设计决策

**为什么推演和正文分离？**
如果让同一个 agent 一边演角色一边写正文，它会为了「写得好看」而扭曲角色行为。分开后，角色只为自己的目标行动，编剧层再决定怎么讲。这是「涌现」和「好看」能同时存在的前提。

**为什么用结构化事实库，而不是靠长上下文？**
长上下文解决的是「模型能不能看到」，解决不了「角色该不该知道」。`visibility` 让「知识越界」变成可判定错误，而不是靠人读出来。

**为什么角色要并行派发？**
串行派发会让后一个角色读到前一个角色的决定，变成「配合演出」。并行 + 局部感知，才会出现误会、抢话、同时行动。

**为什么默认导演模式，不做全自动？**
全自动的问题不是写不出来，是写出来的东西没人负责。导演模式把「决定什么值得写」留给人，这是这个产品跟流水线的分界线。

**为什么先做插件，不做 Web？**
ZCode 已经提供了对话、文件、子 agent、MCP、命令。插件能最快验证「推演 → 成章」的核心假设；Web 编辑器是验证成功后的放大，不是前提。

---

## 7. 风险与对策

| 风险 | 表现 | 对策 |
|---|---|---|
| 角色趋同 | 所有人都理性、都配合 | 目标冲突设计；秘密/误会；导演施压；actor 只给局部信息 |
| 推演冗长 | 大量无戏剧价值的事件 | 只记录改变状态/关系/认知的事件；dramatist 按「转折密度」选材 |
| 文风 AI 味 | 排比、总结句、情绪直说 | voice card + 禁用句式 + 编辑层 + 人审 |
| token 成本 | 每 tick 全量上下文 | 角色局部上下文 + 结构化摘要 + 并行 + 只读相关 facts |
| 状态损坏 | LLM 手改 JSON | 只允许 MCP 写状态；原子写；schema 校验 |
| 分支爆炸 | 分支太多无法收敛 | 分支命名 + 主线指针 + 只保留有差异的分支 |

---

## 8. 明确不做

- 不做 Web 编辑器 / 原型（本轮）
- 不做多人协作 / 账号体系
- 不做模型微调 / 自建推理
- 不做发布、版权、封面、有声
- 不做「一键百万字」——那是流水线，不是导演
- 不碰用户本地已有项目

---

## 9. 已定

- **名字**：小说导演台（plugin id `novel-director`）
- **v1 范围**：一键链（主流程 + 动态工作流）+ 细粒度命令（11 命令）
- **默认停点**：只在 Final 停；`--gated` 增加三个中间停点；`--auto` 仅试跑
- **动态工作流**：`/novel-director:flow` 走 `workflows/forge.dwf.ts`；只覆盖 final-gate/auto，`--gated` 走主流程
- **参考**：AI-Novel-Writing-Assistant 的 V2 Director Console 是「导演台 + 分阶段推进 + 章节质检」的成熟形态；本插件补的是「可推演世界 + 知识边界 + 分支重演」

下一步：按本文档落插件源码。
