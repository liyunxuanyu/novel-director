---
description: 跑推演：导演配置 → 角色并行决策 → 裁决 → 记账 → 推演报告
argument-hint: "<章号，如 ch03> [--ticks 5] [--note \"本章要让周砚起疑但不能揭穿\"]"
skills: novel-director
---

使用 `novel-director` 技能处理这个请求：

$ARGUMENTS

## 你的任务

只跑推演，不写正文。

1. 解析章号（默认下一章）、`--ticks`（默认取 director 的 max_ticks）、`--note`。
2. 读 `plan/chapters/<章>.md`、canon、最近 timeline、相关 facts、threads。
3. 派 `novel-director:director`：
   - `sim_begin` 写 config
   - 为每个在场角色写感知包
4. 对每个 tick（最多 max_ticks）：
   - 并行派 `novel-director:actor` × N（同一条消息）
   - 派 `novel-director:resolver`
   - 派 `novel-director:chronicler`
   - `sim_tick` 写 tick
   - `resolution.scene_end === true` → 结束
5. `sim_end` 写 report。
6. 闸门检查：
   - 至少 1 个状态变化 + 1 个关系/认知变化
   - 至少 1 个角色做出导演没预设的选择
   - 没有知识越界
7. 不通过 → 加压力重演（最多 2 次）。

## 输出

```markdown
## 推演完成 · <章>

**一句话**
<发生了什么>

**场景**
<地点/时间/在场>

**关键事件**
1. ...
2. ...
3. ...

**谁变了**
- <角色>：<状态/关系/认知>

**埋了/收了什么**
- 埋：
- 收：

**导演没预设的事**
- ...

**可用素材**
1. ...
2. ...
3. ...

**产物**
- [config.json](<绝对路径>)
- [report.md](<绝对路径>)

下一步：`/novel-director:write <章>` 成章。

**需要你定**
<最多 2 条；没有就写「无」>
```

## 接管

如果用户说「这一 tick 我演 <角色>」：

1. 把该角色的感知包给用户
2. 用户写 `action` / `dialogue_intent`
3. 该 tick 不派该角色的 `actor`，把人类输入整理成 actor JSON，标 `human_takeover`
4. 照常派 `resolver` 裁决

接管不是作弊：一样受世界规则约束。
