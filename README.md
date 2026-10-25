# 小说导演台 Novel Director

一句话题材，一键推演成书。人是导演，AI 是世界里的演员和史官；小说从一场可回放、可分叉的世界推演里剪出来。

## 它跟「一键生成小说」有什么不同

- **不是一条提示词写一本**。每章内部是 3–6 个 tick 的角色并行推演：角色只知道自己知道的事，所以会出现误会、抢话、意外。
- **推演和正文分离**。角色只为自己的目标行动；编剧层再决定哪些事件值得写成章节。
- **一致性是结构化的**。事实库带 `visibility`，能判定「这个角色知道了不该知道的事」；伏笔有账本，埋了必须收。
- **每一步都落文件**。`.story/` 下全是可读的 Markdown / JSONL；随时可停、可看、可改、可续跑。
- **可分支**。从任意 tick 分叉，改一个动机重跑，比较不同结局。

## 安装

本插件走本地 marketplace：

1. 打开 **Plugin Marketplace → Add → Add Plugin Marketplace**
2. 粘贴你存放插件的目录（本机示例：`D:/workspace/Agent WorkSpace/plugins`）
3. 在 **Personal → <marketplace 名> → 小说导演台 → Install**
4. 安装后在 **Settings → Plugins** 里确认已启用

## 在另一台设备上继续开发

```bash
git clone https://github.com/liyunxuanyu/novel-director.git
```

把它放到 `<你的工作区>/plugins/novel-director`，然后在 `<你的工作区>/plugins/` 下建一个 `marketplace.json`：直接复制仓库里的 `marketplace.example.json`、改名为 `marketplace.json` 即可，`source` 已经指向 `./novel-director`。再按上面的安装步骤添加 `<你的工作区>/plugins` 这个目录。

改完源码后，在 marketplace 里点 **Update**；MCP server 改动需要重启 ZCode 或重新启用插件。

## 两种跑法

| 跑法 | 命令 | 适合 |
|---|---|---|
| 主 agent 流程 | `/novel-director:forge` | 需要 `--gated` 中途确认、接管角色、逐段调整 |
| ZCode 动态工作流 | `/novel-director:flow` | 一键跑到底；阶段图、章节进度看板、产物卡片；不能中途问人 |

`flow` 用动态工作流脚本 `workflows/forge.dwf.ts`，把章循环、每 tick 角色并行、评审回退写成 TypeScript 控制流；`forge` 由主 agent 按技能调度，支持 `--gated`。

## 主入口

```bash
/novel-director:forge "一个法医发现姐姐失踪案与连环案有关" --genre 悬疑 --chapters 12
```

或者用动态工作流：

```bash
/novel-director:flow "一个法医发现姐姐失踪案与连环案有关" --genre 悬疑 --chapters 12 --limit 2
```

默认只在**定稿**停一次。想中途把关加 `--gated`，在题材、角色、大纲各停一次；`--auto` 连定稿也不停，只用于试跑。

常用参数：

| 参数 | 作用 |
|---|---|
| `--genre 悬疑` | 题材 |
| `--tone 冷硬` | 基调 |
| `--chapters 12` | 目标章数 |
| `--limit 3` | 本次最多跑 3 章，先试水 |
| `--dry-run` | 只出题材 + 世界 + 大纲，不写正文 |
| `--gated` | 在 Concept / Cast / Plan / Final 停 |
| `--auto` | 全程不停（仅试跑） |
| `--title 书名` | 指定书名 |

## 细粒度命令

| 命令 | 做什么 |
|---|---|
| `/novel-director:forge` | 主 agent 一键链：题材→世界→角色→章纲→逐章推演→正文→优化→定稿 |
| `/novel-director:flow` | 动态工作流一键链：同样八阶段，脚本控制，带阶段图和进度看板 |
| `/novel-director:new` | 建项目、定题材/前提/基调/篇幅 |
| `/novel-director:world` | 建世界规则、地理、势力 |
| `/novel-director:cast` | 建 3–6 个角色卡 |
| `/novel-director:plan` | 定弧线、章纲、伏笔计划 |
| `/novel-director:sim` | 导演指令 → N ticks → 推演报告 |
| `/novel-director:write` | 选 run/ticks → 节拍 → 正文 → 校验 |
| `/novel-director:review` | 连贯性 + 戏剧评审 |
| `/novel-director:branch` | 从某 tick 分叉，改变量重跑 |
| `/novel-director:status` | 世界/角色/时间线/伏笔/草稿/未决 |

## 产物

```
<工作区>/.story/
  state.json                 # 进度与模式
  premise.md                 # 前提
  concept/                   # 题材方案
  canon/
    world.md                 # 世界
    rules.md                 # 规则
    characters/<id>.md       # 角色卡
    factions.md
    locations.md
  ledger/
    facts.jsonl              # 结构化事实（带 visibility）
    threads.jsonl            # 伏笔账本
    timeline.jsonl           # 事件时间线
  plan/
    arcs.md                  # 弧线
    chapters/ch01.md         # 章纲
    scenes/ch01-sc01.md      # 场景节拍
  sim/runs/<run-id>/
    config.json              # 导演指令
    ticks/001.json           # 每个 tick 的角色决策与裁决
    report.md                # 推演报告
  drafts/ch01.md             # 正文
  reviews/ch01.md            # 连贯性 + 戏剧评审
  branches/<name>/           # 分支世界线
  final/
    manuscript.md            # 定稿
    report.md                # 交付报告
```

## 三种模式

| 模式 | 人做什么 | AI 做什么 |
|---|---|---|
| 执笔 `author` | 写正文 | 查设定、校语气、查连贯性 |
| 导演 `director`（默认） | 给指令、审稿、接管角色 | 推演世界、起草场景、校验 |
| 放映 `auto` | 设检查点 | 按弧线自主推演多章 |

## 设计边界

- 不做 Web 编辑器（v1 是 ZCode 插件）
- 不做多人协作、账号体系
- 不做模型微调、自建推理
- 不做封面、发布、有声
- 不做「一键百万字」——那是流水线，不是导演

## 文档

- [研究与设计稿](docs/00-research-and-design.md)
- [流水线细则](skills/novel-director/references/pipeline.md)
- [推演协议](skills/novel-director/references/simulation-protocol.md)
- [连贯性规则](skills/novel-director/references/continuity-rules.md)
- [文风与去 AI 味](skills/novel-director/references/prose-voice.md)
- [文件格式](skills/novel-director/references/file-schemas.md)
