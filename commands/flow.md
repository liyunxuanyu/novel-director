---
description: 用 ZCode 动态工作流跑一键推演（题材→世界→角色→章纲→逐章推演→定稿）
argument-hint: "\"一句话题材\" [--genre 悬疑] [--tone 冷硬] [--chapters 12] [--limit 2] [--dry-run] [--plugin-root 路径]"
skills: novel-director
---

使用 `novel-director` 技能处理这个请求：

$ARGUMENTS

## 你的任务

把这次请求写成 `.novel-run.json`，然后启动 ZCode 动态工作流。

### 1. 解析参数

| 参数 | 含义 | 默认 |
|---|---|---|
| 第一个非选项字符串 | 一句话题材 | 必填 |
| `--genre` | 题材 | 空 |
| `--tone` | 基调 | 空 |
| `--pov` | 视角 | `third_limited` |
| `--chapters` | 目标章数 | 12 |
| `--limit` | 本次最多跑几章 | 等于目标章数 |
| `--dry-run` | 只出题材/世界/角色/章纲 | 否 |
| `--title` | 书名 | 未命名 |
| `--plugin-root` | 插件根目录 | `plugins/novel-director` |

### 2. 检查模式

如果用户要 `--gated`：**不要用工作流**。告诉用户：

> 动态工作流不能在中途停下来问人。要分阶段确认，请用 `/novel-director:forge --gated`。

工作流只覆盖「只在定稿停」和 `--auto`。

### 3. 找插件根

优先用 `--plugin-root`。没给就检查 `plugins/novel-director/agents/concept.md` 是否存在。

不存在时用 `Glob` 找 `**/novel-director/agents/concept.md`，取它上面两级目录作为插件根。

### 4. 存请求

调用 `story` MCP 的 `run_request_put`：

```json
{
  "request": {
    "seed": "<一句话题材>",
    "title": "<书名或未命名>",
    "genre": "<题材>",
    "tone": "<基调>",
    "pov": "third_limited",
    "chapters": 12,
    "limit": 12,
    "dryRun": false,
    "pluginRoot": "<插件根绝对路径>"
  }
}
```

`run_request_put` 会把请求写到 `.story/run-request.json`，工作流里的第一个子 agent 用 `run_request_get` 读取。

**不要用 Write 直接写文件**：MCP 的 `STORY_PROJECT_DIR` 才是会话工作区，动态工作流的文件工作区可能不同。

### 5. 找 workflow 脚本

用 `Glob` 找 `**/novel-director/workflows/forge.dwf.ts`，拿绝对路径。

### 6. 加载技能并启动

如果 `dynamic-workflows` 技能还没加载，先调用 `Skill` 加载它。

调用：

```
CreateWorkflow({
  path: "<forge.dwf.ts 的绝对路径>",
  name: "小说导演台 · 一键推演"
})
```

**不要传 `args`**：脚本通过 `story` MCP 的 `run_request_get` 读请求。

`CreateWorkflow` 会先编译脚本，然后弹确认窗口。确认后工作流在后台跑。

### 7. 告诉用户

```markdown
## 动态工作流已提交

- **题材**：<seed>
- **目标**：<chapters> 章，本次跑 <limit> 章
- **模式**：只在定稿停（工作流不支持 `--gated`）
- **脚本**：<绝对路径>

确认窗口里会显示完整脚本。确认后开始跑，完成时会收到通知。

**阶段**
题材构思 → 建世界 → 建角色 → 定章纲 → 逐章推演与成稿 → 定稿与交付

**产物**
- 运行中：章节进度看板
- 完成后：定稿（`.story/final/manuscript.md`）+ 交付报告

不要轮询；完成通知会带回最终报告和产物卡片。
```

### 失败处理

- 编译报错：读报错里的文件路径，`Edit` 后重新 `CreateWorkflow({path})`，不要重贴整段脚本。
- 用户拒绝确认：不要重试，问他们改哪里。
- 工作流中途停下：用 `GetWorkflowRun` 看状态；`stopped` 可 `ResumeWorkflowRun`；脚本错误用 `AmendWorkflow`。
- 子 agent 升级问题：用 `ResolveWorkflowQuestion` 回答，或把问题转给用户。

### 不要做

- 不要传 `args`
- 不要用 `--gated`
- 不要在用户没确认时启动
- 不要轮询运行状态
- 不要覆盖已有的 `.story/`（脚本里的 `project_init` 会返回 `already_exists`）
