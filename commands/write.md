---
description: 成章：从推演报告选材 → 场景节拍 → 正文 → 连贯性检查
argument-hint: "<章号，如 ch03> [--run <run-id>] [--words 2500]"
skills: novel-director
---

使用 `novel-director` 技能处理这个请求：

$ARGUMENTS

## 你的任务

把一次推演变成一章正文。

1. 解析章号、`--run`（默认该章最近一次 run）、`--words`（默认 2500）。
2. 读 `sim/runs/<run-id>/report.md`、`plan/chapters/<章>.md`、角色卡、`canon/voice.md`。
3. 派 `novel-director:dramatist`：
   - 选 3–5 个改变状态/关系/认知的事件
   - 写 `plan/scenes/<章>-sc01.md`
4. 派 `novel-director:prose`：
   - 按节拍写正文
   - `draft_put`
5. 派 `novel-director:continuity`：
   - 只做连贯性检查
   - `review_put({section:"continuity"})`
6. 如果有阻断 → 派 `prose` 改写（最多 2 轮）。

## 输出

```markdown
## 成章完成 · <章>

- 标题：
- 字数：
- POV：
- 用了哪些事件：
- 砍了哪些事件：

**连贯性**
- 阻断：<n>
- 重要：<n>
- 次要：<n>
- 结论：通过 / 需修改

**产物**
- [草稿](<绝对路径>)
- [场景节拍](<绝对路径>)
- [连贯性报告](<绝对路径>)

下一步：`/novel-director:review <章>` 做戏剧评审。

**需要你定**
<最多 2 条；没有就写「无」>
```

## 执笔模式

如果 `state.json.mode === "author"`：

1. 只派 `dramatist` 出节拍
2. 把节拍给用户，让用户写正文
3. 用户写完，派 `continuity` 检查
4. 不派 `prose`
