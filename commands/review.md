---
description: 评审：连贯性 + 戏剧 + 去 AI 味，出分级问题清单
argument-hint: "<章号，如 ch03> [--quality-first]"
skills: novel-director
---

使用 `novel-director` 技能处理这个请求：

$ARGUMENTS

## 你的任务

对一章正文做完整评审，不改稿。

1. 读 `drafts/<章>.md`、`plan/scenes/`、facts、threads、timeline、角色卡、`canon/voice.md`。
2. 并行派：
   - `novel-director:continuity` → `review_put({section:"continuity"})`
   - `novel-director:critic` → `review_put({section:"critic"})`
3. 合并两份报告：
   - 按「阻断 / 重要 / 次要」排序
   - 去重但不降级：任一维度标阻断，合并后仍是阻断
   - 结论取最严的
4. 有阻断 → 给出修改方案，问用户是「派 prose 改」还是「回退重演」。
5. `--quality-first` 时，重要也必须改。

## 输出

```markdown
## 评审 · <章>

**结论**：通过 / 需修改 / 回退重演
- 阻断：<n>
- 重要：<n>
- 次要：<n>

**阻断问题**
1. [<维度>] <位置>：<问题>
   - 原文：> ...
   - 修法：...

**重要问题**
1. ...

**最该改的三处**
1. ...
2. ...
3. ...

**这一章最好的地方**
<一句；没有就写「没有」>

**产物**
- [评审报告](<绝对路径>)

**需要你决定**
- A. 派 `prose` 按修法改
- B. 回退 `sim` 重演本章
- C. 带问题交付（仅当无阻断）

回复 A/B/C。
```
