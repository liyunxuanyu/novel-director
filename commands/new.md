---
description: 新建小说项目，定题材、前提、基调、篇幅、视角
argument-hint: "\"一句话题材\" [--genre 悬疑] [--tone 冷硬] [--chapters 12] [--pov third_limited] [--title 书名]"
skills: novel-director
---

使用 `novel-director` 技能处理这个请求：

$ARGUMENTS

## 你的任务

只做项目初始化，不跑后续阶段。

1. 解析参数；缺什么问什么，最多 3 个问题（题材/基调/篇幅/视角）。
2. 调用 `story` MCP 的 `project_init`。
3. 写 `.story/premise.md`，按 `references/file-schemas.md` 的结构：
   - 一句话
   - 题材与基调
   - 核心冲突
   - 钩子
   - 禁区
   - 成功标准
4. 调用 `project_update({patch:{phase:"concept"}})`。

## 输出

```markdown
## 项目已建

- 书名：
- 题材：
- 基调：
- 篇幅：
- 视角：
- 一句话：

**产物**
- [premise.md](<绝对路径>)

下一步：`/novel-director:forge` 继续，或 `/novel-director:cast` 直接建角色。

**需要你定**
<最多 2 条；没有就写「无」>
```

不要建世界、不要建角色、不要写正文。
