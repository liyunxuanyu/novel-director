# 推演协议

这份协议定义「世界怎么跑」。它只产出事件，不产出正文。

---

## 1. Tick 是什么

一个 tick 是一次**决策循环**，不是一天。

- 同一时间、同一地点、同一批在场者
- 每个在场角色做一次决定
- 裁决一次，信息流一次，记账一次
- 一个场景通常 3–6 个 tick

**结束条件**（任一）：

- 场景目标达成或明确失败
- 出现必须换场景的新阻力
- 达到 `max_ticks`
- 导演叫停

---

## 2. Run Config

由 `director` 写，`sim_begin` 落盘。

```json
{
  "run_id": "run_20261025_221500_ch03",
  "chapter": "ch03",
  "scene": {
    "location": "市局旧档案室",
    "time": "凌晨两点",
    "participants": ["lin_jianwei", "zhou_yan"]
  },
  "goal": "林见微拿到姐姐的尸检报告副本",
  "pressure": "周砚开始怀疑她；档案室十一点后断网；明天报告会被移交",
  "constraints": {
    "must": ["林见微看到报告中的镇静剂一栏"],
    "must_not": ["不能当场揭穿周砚", "不能拿到完整报告"],
    "forbidden_info": ["周砚当晚去过现场"]
  },
  "max_ticks": 5,
  "off_screen": ["父亲在医院醒来"],
  "tone": "冷硬、克制、少对白"
}
```

**导演只设压力，不设结果。** 不要写「林见微会假装离开然后折返」——那是角色的决定。

---

## 3. 感知包

每个 `actor` 只拿自己那一份。放在 `sim/runs/<run-id>/perception/<character>.md`。

```markdown
# 林见微 · tick 3 感知包

## 你在哪
市局旧档案室，第三排铁柜前。灯管闪。

## 你看到谁
周砚在门口，背对你，正在接电话。

## 你记得什么（你亲眼见过/确认过的）
- 姐姐的案子编号是 0317
- 尸检报告原件在档案室，副本在周砚抽屉
- 周砚左手有旧伤

## 你相信什么（可能是错的）
- 周砚是清白的
- 父亲当年只是喝醉了

## 你不知道什么
- 周砚当晚去过现场
- 报告里有一页被抽走

## 你现在的目标
拿到报告副本，确认镇静剂来源。

## 你的秘密（不能主动说）
你保留了姐姐案发现场的一件物证。

## 最近发生的事（你亲眼所见/别人告诉你的）
- tick 1：你借口查旧案进了档案室
- tick 2：周砚跟了进来，说「这么晚还不走」
```

**必须明确写「你不知道什么」。** 不写，actor 会默认自己知道。

---

## 4. Actor 输出

`actor` 返回 JSON（不写文件）：

```json
{
  "character": "lin_jianwei",
  "tick": 3,
  "intent": "在周砚打完电话前拿到抽屉里的副本",
  "action": "蹲下假装系鞋带，用回形针撬抽屉锁",
  "dialogue_intent": "如果被发现，就说在找失踪人口档案",
  "hide": ["她真正想找的是姐姐的编号", "她手在抖"],
  "notice": ["周砚把钥匙串放进了外套内袋", "他电话里提到「老地方」"],
  "emotional_shift": "从克制到急躁",
  "goal_progress": "接近，但留下撬锁痕迹"
}
```

**规则**：

- 只能基于感知包行动；不知道就说不知道
- 可以撒谎、隐瞒、误会、做错
- 不要为了「让剧情顺利」而配合
- `dialogue_intent` 是意图，不是精修台词
- 不要写其他角色的动作
- 不要写环境和心理描写

---

## 5. Resolver 输出

`resolver` 拿所有 actor 输出 + 世界规则 + 相关事实，裁决：

```json
{
  "tick": 3,
  "outcomes": [
    {
      "actor": "lin_jianwei",
      "result": "partial_success",
      "detail": "撬开抽屉，拿到副本，但留下痕迹；周砚听见金属声"
    }
  ],
  "conflicts": [
    {
      "between": ["lin_jianwei", "zhou_yan"],
      "issue": "周砚是否发现她在撬锁",
      "resolution": "听见声音，但没看见动作；起疑，未确认"
    }
  ],
  "information_flow": [
    {
      "from": "document",
      "to": "lin_jianwei",
      "content": "尸检报告显示体内有镇静剂",
      "channel": "read"
    },
    {
      "from": "lin_jianwei",
      "to": "zhou_yan",
      "content": "她在档案室翻东西",
      "channel": "witness"
    }
  ],
  "state_changes": [
    { "entity": "lin_jianwei", "change": "获得 item: autopsy_copy" },
    { "entity": "zhou_yan", "change": "对 lin_jianwei 的 trust -1" },
    { "entity": "lin_jianwei", "change": "留下 trace: picked_lock" }
  ],
  "new_facts": [
    {
      "subject": "sister",
      "predicate": "had_substance",
      "object": "sedative",
      "visibility": ["lin_jianwei"]
    }
  ],
  "thread_updates": [
    { "id": "t_0003", "status": "planted", "notes": "镇静剂来源指向医院" }
  ],
  "scene_end": false,
  "reason": "目标部分达成，但出现新阻力（周砚起疑）"
}
```

**裁决规则**：

- 尊重角色能力、位置、资源、时间
- 冲突按「谁更有利」判，不按「谁更主角」判
- 失败要有代价；成功要有代价或后患
- 信息只能通过合理渠道流动：`witness` / `told` / `read` / `inferred` / `overheard` / `document` / `rumor`
- 不要天降巧合；要巧合就提前埋
- 不确定的地方标 `uncertain: true`，不要编圆

---

## 6. Chronicler 记账

`chronicler` 把裁决结果写成三类记录：

1. `timeline_append`：中性事件
2. `fact_add`：结构化事实（带 `visibility`）
3. `thread_add` / `thread_update`：伏笔

**事件写法**：

> 林见微撬开周砚抽屉，取得尸检报告副本。周砚听见金属声，进入档案室，未看见撬锁动作。林见微称在找失踪人口档案。周砚未追问，但记下抽屉位置被动过。

不要写「气氛紧张」「她心跳加速」——那是正文的事。

**事实写法**：

```json
{
  "subject": "lin_jianwei",
  "predicate": "has_item",
  "object": "autopsy_copy",
  "source": "run_20261025_221500_ch03/tick3",
  "visibility": ["lin_jianwei"],
  "confidence": 1.0
}
```

**visibility 规则**：

- `["public"]`：所有人都知道
- `["lin_jianwei"]`：只有她知道
- `["lin_jianwei", "zhou_yan"]`：两人知道
- 不要写「读者知道」——读者不是角色

---

## 7. Run Report

`sim_end` 写 `report.md`：

```markdown
# 推演报告 · ch03 · run_...

## 一句话
林见微拿到了报告副本，但周砚开始怀疑她。

## 场景
市局旧档案室，凌晨两点。在场：林见微、周砚。

## 发生了什么
- tick 1：林见微借口查旧案进入档案室。
- tick 2：周砚跟进来，试探她。
- tick 3：林见微撬抽屉，拿到副本，留下痕迹。
- tick 4：周砚听见声音，进来；林见微用「找失踪人口档案」搪塞。
- tick 5：周砚离开，但把钥匙串带走；林见微确认报告中有镇静剂。

## 谁变了
- 林见微：获得报告副本；对周砚的信任 -1；留下撬锁痕迹。
- 周砚：起疑；把钥匙串带走；对林见微的信任 -1。

## 谁知道什么了
- 林见微知道：姐姐体内有镇静剂。
- 周砚知道：林见微深夜翻档案；不知道她拿了什么。
- 两人都不知道：报告有一页被抽走。

## 埋了/收了什么
- 埋：镇静剂来源（t_0003）。
- 收：无。

## 导演没预设的事
- 林见微选择撬锁，而不是等周砚离开。
- 周砚没有当场揭穿，而是拿走钥匙串。

## 可用素材
1. 撬锁的声音与周砚的脚步。
2. 「找失踪人口档案」的搪塞。
3. 周砚把钥匙串放进内袋的动作。
4. 报告里镇静剂那一栏。

## 没用的素材
- tick 4 的寒暄（不改变状态，砍）。

## 下一章的压力
- 周砚会查抽屉。
- 林见微需要解释撬锁痕迹。
- 镇静剂来源指向医院。
```

---

## 8. 反趋同规则

推演最容易失败的方式：所有人都理性、都配合、都说真话。必须在 run config 和角色卡层面预防：

1. **目标冲突**：至少一个角色的目标与主角直接冲突。
2. **秘密**：至少一个角色有秘密，且这一场有可能被触碰。
3. **误会**：至少一个角色相信了错误的事实。
4. **代价**：每个选择都有代价，没有免费的成功。
5. **第三方压力**：导演每场至少加一个角色控制不了的外部压力（截止时间、第三方介入、资源耗尽）。
6. **不许全知**：任何角色都不得知道「剧情需要他知道」但感知包里没有的信息。

如果一场推演下来没人反对、没人隐瞒、没人犯错，判定为失败，加压重演。

---

## 9. 接管角色

人可以随时接管一个角色：

- 在 tick 开始前说「这一 tick 我演周砚」
- 主流程把感知包给用户，用户写 `action` / `dialogue_intent`
- 该输入视为 canon，`actor` 不再派该角色
- 记账时标 `source: human_takeover`

接管不是作弊：它和角色行动一样受世界规则约束，也要经过 `resolver` 裁决。

---

## 10. 分支重演

从某个 tick 分叉：

1. `branch_create` 复制 canon/ledger/plan
2. 在分支里改一个变量：角色动机、一条事实、一个关系值、一条世界规则
3. 从分叉 tick 重跑
4. 对比两份 report：哪些事件变了、哪些没变、为什么

分支只读主线，不写主线。
