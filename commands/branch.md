---
description: 分支重演：从某个 tick 分叉，改一个变量，重跑，对比结局
argument-hint: "--from <run-id> --tick <n> --name <分支名> --change \"把周砚的动机从保护改成灭口\""
skills: novel-director
---

使用 `novel-director` 技能处理这个请求：

$ARGUMENTS

## 你的任务

从一次推演里分叉，改一个变量，重跑，给用户看差异。

1. 解析参数：
   - `--from`：run id（默认该章最近一次）
   - `--tick`：分叉 tick
   - `--name`：分支名（小写字母/数字/连字符）
   - `--change`：改什么（自然语言）
2. 调用 `branch_create({name, from_run, at_tick, note})`。
3. 读分支目录里的 canon/ledger/plan，按 `--change` 改**一个**变量：
   - 角色动机 → 改 `canon/characters/<id>.md`
   - 一条事实 → `fact_retire` 旧事实 + `fact_add` 新事实（带 `branch` 参数）
   - 关系值 → 改角色卡的关系表
   - 世界规则 → 改 `canon/rules.md`
4. 从分叉 tick 重跑：
   - 派 `director` 写新 config（带 `branch`）
   - 并行派 `actor` × N
   - 派 `resolver`、`chronicler`
   - `sim_begin` / `sim_tick` / `sim_end` 都带 `branch`
5. 对比主线与分支的 report：
   - 哪些事件变了
   - 哪些没变
   - 为什么
6. 不写回主线。

## 输出

```markdown
## 分支 · <name>

**分叉点**
<run-id> / tick <n>

**改了什么**
<一个变量 + 为什么>

**主线结局**
<一句话>

**分支结局**
<一句话>

**差异**
| 事件 | 主线 | 分支 | 为什么变/没变 |
|---|---|---|---|

**产物**
- [分支目录](<绝对路径>)
- [分支报告](<绝对路径>)

**要不要**
- A. 把分支的某个变化合并回主线（需逐条确认）
- B. 保留分支，主线不动
- C. 再分一个叉

回复 A/B/C。
```

## 边界

- 分支只读主线，不写主线
- 合并回主线必须逐条确认；不可逆
- 分支名不能重复；重名就报错，不要覆盖
