---
description: 建角色：3–6 个能互相施压的人，含欲望、秘密、语气、知识边界
argument-hint: "[可选：角色数量或额外要求，如 \"要有一个警察内部的内鬼\"]"
skills: novel-director
---

使用 `novel-director` 技能处理这个请求：

$ARGUMENTS

## 你的任务

只建角色，不写章纲、不写正文。

1. 读 `premise.md`、选中的 concept、`canon/world.md`、`rules.md`、`factions.md`。
2. 派 `novel-director:casting`，产物 `canon/characters/*.md`。
3. 检查闸门：
   - 3–6 人
   - 至少两个角色目标冲突
   - 至少一个主动反对主角
   - 每人有欲望/秘密/语气/知识边界
   - 没有纯好人/纯坏人
4. 反趋同自检：有人撒谎吗？有人误会吗？把主角拿走，其他人还会动吗？
5. `project_update({patch:{phase:"plan"}})`。

## 输出

```markdown
## 角色已建

| id | 名字 | 角色 | 欲望 | 秘密 | 与谁冲突 |
|---|---|---|---|---|---|

**关系图**
<谁欠谁、谁怀疑谁、谁不知道什么>

**反趋同自检**
- 有人反对主角吗：
- 有人撒谎/隐瞒吗：
- 有人误会吗：

**产物**
- [角色卡目录](<绝对路径>)

**需要你定**
<最多 2 条；没有就写「无」>
```
