---
description: 建世界：规则、地理、势力、地点、日常质感
argument-hint: "[可选：对世界的额外要求，如 \"要有一个禁止外出的旧城区\"]"
skills: novel-director
---

使用 `novel-director` 技能处理这个请求：

$ARGUMENTS

## 你的任务

只建世界，不建角色、不写章纲。

1. 读 `.story/state.json`；没有就提示先跑 `/novel-director:new`。
2. 读 `premise.md` 和选中的 `concept/<n>.md`。
3. 派 `novel-director:worldsmith`，产物：
   - `canon/world.md`
   - `canon/rules.md`
   - `canon/factions.md`
   - `canon/locations.md`
   - 初始 `fact_add`
4. 检查闸门：无自相矛盾；至少 3 组世界级张力；每条规则能制造约束。
5. `project_update({patch:{phase:"cast"}})`。

## 输出

```markdown
## 世界已建

**一句话**
<世界是什么>

**三条最强张力**
1. ...
2. ...
3. ...

**三条最容易被利用的规则**
1. ...
2. ...
3. ...

**产物**
- [world.md](<绝对路径>)
- [rules.md](<绝对路径>)
- [factions.md](<绝对路径>)
- [locations.md](<绝对路径>)

**需要你定**
<最多 2 条；没有就写「无」>
```

如果用户给了额外要求，先复述你理解的要求，再派发。
