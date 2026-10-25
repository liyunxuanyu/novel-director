---
description: 定弧线、章纲、伏笔账本
argument-hint: "[可选：章数或结构要求，如 \"12 章，三幕，第二幕中点要翻盘\"]"
skills: novel-director
---

使用 `novel-director` 技能处理这个请求：

$ARGUMENTS

## 你的任务

只做规划，不写正文。

1. 读 `premise.md`、选中的 concept、canon（world/rules/factions/characters）、`state.json.length_target`。
2. 派 `novel-director:planner`，产物：
   - `canon/arcs.md`
   - `plan/chapters/ch-001.md` …（数量 = `length_target`）
   - 伏笔账本（`thread_add`）
3. 检查闸门：
   - 每章有转折
   - 每幕有高潮
   - 每条伏笔有回收目标
   - 任意两章的结束状态不重复
   - 章数匹配
4. `project_update({patch:{phase:"simulate"}})`。

## 输出

```markdown
## 章纲已定

**弧线**
- 第一幕（第 1–N 章）：
- 第二幕（第 N–M 章）：
- 第三幕（第 M–end 章）：

**章纲**
| 章 | 标题 | 目标 | 转折 | 结束状态 |

**伏笔**
| id | 问题 | 埋 | 计划收 |

**节奏自检**
<哪两章最像，怎么改>

**产物**
- [arcs.md](<绝对路径>)
- [章纲目录](<绝对路径>)

**需要你定**
<最多 2 条；没有就写「无」>
```
