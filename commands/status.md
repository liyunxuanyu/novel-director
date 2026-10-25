---
description: 看状态：世界、角色、时间线、伏笔、草稿、评审、未决问题
argument-hint: "[可选：ch03 / threads / runs]"
skills: novel-director
---

使用 `novel-director` 技能处理这个请求：

$ARGUMENTS

## 你的任务

只读汇报，不改任何文件。

1. 调用 `story` MCP 的 `project_status`。
2. 按参数决定展开哪一块：
   - 无参数 → 总览
   - `ch03` → 该章草稿、评审、run
   - `threads` → 伏笔账本
   - `runs` → 所有推演
3. 输出。

## 总览格式

```markdown
## <书名>

- **模式**：director / author / auto
- **自主度**：final-gate / gated / auto
- **当前阶段**：<phase>
- **进度**：<done>/<target> 章
- **题材**：<genre> · **基调**：<tone> · **视角**：<pov>

### 世界
- [world.md](<绝对路径>) — <一句话>
- 角色：<n> 人
- 事实：<n> 条
- 时间线：<n> 条

### 伏笔
- 已埋未收：<n>
- 逾期：<n>
- 已收：<n>

### 章节
| 章 | 标题 | 字数 | 连贯性 | 戏剧 | 状态 |

### 最近推演
| run | 章 | ticks | 结论 |

### 未决
- <阻断问题>
- <待用户确认>

### 下一步
<建议命令>
```

## 注意

- 不要复述正文
- 不要改文件
- 路径用正斜杠；含空格用尖括号
- 没有的问题写「无」
