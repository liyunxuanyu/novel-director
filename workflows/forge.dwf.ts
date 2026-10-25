/**
 * 小说导演台 · 一键推演（ZCode 动态工作流）
 *
 * 由 /novel-director:flow 触发。通过 story MCP 的 run_request_get 读取请求：
 *   题材构思 → 建世界 → 建角色 → 定章纲 → 逐章推演/成稿/评审 → 定稿
 *
 * 动态工作流不能中途问人，所以只覆盖 final-gate / auto。
 * --gated 请走 /novel-director:forge（主 agent 流程）。
 */

interface RunRequest {
  /** 一句话题材。 */
  seed: string;
  /** 书名或暂定名。 */
  title: string;
  /** 题材。 */
  genre: string;
  /** 基调。 */
  tone: string;
  /** 视角。 */
  pov: string;
  /** 目标章数。 */
  chapters: number;
  /** 本次最多跑几章。 */
  limit: number;
  /** 只出题材/世界/角色/章纲，不写正文。 */
  dryRun: boolean;
  /** 插件根目录，相对工作区或绝对路径。 */
  pluginRoot: string;
}

interface ConceptPick {
  /** 选中的方案编号：1、2 或 3。 */
  pick: number;
  /** 一句话说明为什么选它。 */
  reason: string;
  /** 三个方案的一句话 logline，按 1/2/3 顺序。 */
  loglines: string[];
}

interface WorldDone {
  /** 世界一句话。 */
  summary: string;
  /** 三条最强张力。 */
  tensions: string[];
  /** 写入的初始事实条数。 */
  facts: number;
}

interface CastDone {
  /** 角色 id 列表。 */
  characters: string[];
  /** 主角 id。 */
  protagonist: string;
  /** 至少一组互相冲突的角色 id。 */
  conflict: string[];
}

interface PlanDone {
  /** 章号列表，如 ["ch01","ch02"]。 */
  chapters: string[];
  /** 每条伏笔一句话。 */
  threads: string[];
}

interface RunConfig {
  /** run id。 */
  runId: string;
  /** 本章最多几个 tick。 */
  maxTicks: number;
  /** 在场角色 id。 */
  participants: string[];
  /** 这一场的目标。 */
  goal: string;
}

interface ActorDecision {
  /** 角色 id。 */
  character: string;
  /** 意图。 */
  intent: string;
  /** 动作。 */
  action: string;
  /** 台词意图。 */
  dialogueIntent: string;
  /** 隐藏了什么。 */
  hide: string[];
  /** 注意到了什么。 */
  notice: string[];
}

interface Resolution {
  /** 是否结束本场。 */
  sceneEnd: boolean;
  /** 一句话结果。 */
  summary: string;
  /** 状态变化条数。 */
  stateChanges: number;
  /** 信息流条数。 */
  informationFlow: number;
}

interface DraftDone {
  /** 字数。 */
  wordCount: number;
  /** 标题。 */
  title: string;
}

interface ReviewDone {
  /** 阻断数。 */
  blocking: number;
  /** 重要数。 */
  important: number;
  /** 一句话结论。 */
  verdict: string;
}

interface ChapterOutcome {
  /** 章号。 */
  chapter: string;
  /** 状态。 */
  status: "done" | "needs-human";
  /** 字数。 */
  words: number;
  /** 阻断问题数。 */
  blocking: number;
  /** 一句话。 */
  note: string;
}

interface ExportDone {
  /** 章数。 */
  chapters: number;
  /** 总字数。 */
  words: number;
  /** 留白伏笔数。 */
  carried: number;
  /** .story 的绝对路径。 */
  storyRoot: string;
}

interface Finding {
  /** 位置：工作区相对路径。 */
  where: string;
  /** 一句话：发现了什么，或哪里需要人看。 */
  what: string;
  /** 证据：字数、阻断数、检查方式。 */
  evidence: string;
  /** verified 表示经过检查；unconfirmed 表示需要人看。 */
  status: "verified" | "unconfirmed";
  /** 严重度。 */
  severity: "low" | "medium" | "high";
}

interface WorkflowReport {
  /** 两三句话回答用户要的东西。 */
  conclusion: string;
  /** 逐条发现。 */
  findings: Finding[];
  /** 实际检查了什么。 */
  verified: string[];
  /** 没检查什么、为什么。 */
  notCovered: string[];
}

// 请求通过 story MCP 读取，不依赖工作流的文件工作区。

// 章节进度看板：每章一张卡，状态随推演/成稿/评审推进。
artifact.board("chapters", {
  title: "章节进度",
  key: "chapter",
  status: "status",
  columns: ["待写", "推演中", "成稿中", "评审中", "已完成", "需人工"],
  cardTitle: "title",
  detail: [{ field: "words", label: "字数" }],
});

// ── 题材构思 ───────────────────────────────────────────────

phase("题材构思");

const init = agent("项目初始化");
const req = await init.ask<RunRequest>(
  `先调用 story MCP 的 run_request_get 读取本次请求；再用请求里的 seed/title/genre/tone/pov/chapters 调用 project_init（mode="director"，autonomy="final-gate"）。如果项目已存在，project_init 会返回 already_exists，不要覆盖任何已有文件。最后返回请求 JSON：{"seed":"...","title":"...","genre":"...","tone":"...","pov":"...","chapters":12,"limit":12,"dryRun":false,"pluginRoot":"..."}。`,
);

const seed = String(req.seed ?? "").trim();
if (!seed) throw new Error("run_request 里没有 seed");

const title = String(req.title ?? "").trim() || "未命名";
const genre = String(req.genre ?? "").trim();
const tone = String(req.tone ?? "").trim();
const pov = String(req.pov ?? "third_limited").trim() || "third_limited";
const chapterTarget = Math.min(Math.max(1, Number(req.chapters) || 12), 60);
const limit = Math.min(Math.max(1, Number(req.limit) || chapterTarget), chapterTarget);
const dryRun = Boolean(req.dryRun);
const pluginRoot = String(req.pluginRoot ?? "plugins/novel-director").replace(/\/+$/, "");
const rolePath = (name: string) => `${pluginRoot}/agents/${name}.md`;

const concept = agent("题材构思", {
  system: `你是小说导演台的题材构思。先读 ${rolePath("concept")} 并严格按它执行。`,
});
const pick = await concept.ask<ConceptPick>(
  `项目根是当前工作区，产物写到 .story/concept/。种子：${seed}。题材：${genre || "由你判断"}。基调：${tone || "由你判断"}。篇幅：${chapterTarget} 章。写三个方案 01.md / 02.md / 03.md，然后选总分最高的一个。只返回 JSON：{"pick":1,"reason":"...","loglines":["...","...","..."]}。`,
);
const pickNo = Math.min(Math.max(1, Number(pick.pick) || 1), 3);
log(`选中方案 ${pickNo}：${pick.loglines[pickNo - 1] ?? ""}`);

const conceptFile = `.story/concept/${String(pickNo).padStart(2, "0")}.md`;

// ── 建世界 ─────────────────────────────────────────────────

phase("建世界");

const world = agent("世界构建", {
  system: `你是小说导演台的世界构建。先读 ${rolePath("worldsmith")} 并严格按它执行。`,
});
const worldDone = await world.ask<WorldDone>(
  `读 .story/premise.md 和 ${conceptFile}。写 .story/canon/world.md、rules.md、factions.md、locations.md，并用 fact_add 写 8–15 条初始事实。返回 JSON：{"summary":"...","tensions":["...","...","..."],"facts":12}。`,
);

// ── 建角色 ─────────────────────────────────────────────────

phase("建角色");

const cast = agent("角色铸造", {
  system: `你是小说导演台的角色铸造。先读 ${rolePath("casting")} 并严格按它执行。`,
});
const castDone = await cast.ask<CastDone>(
  `读 .story/canon/world.md、rules.md、factions.md、${conceptFile}。写 3–6 张角色卡到 .story/canon/characters/，用 fact_add 写关系事实。返回 JSON：{"characters":["lin_jianwei","zhou_yan"],"protagonist":"lin_jianwei","conflict":["lin_jianwei","zhou_yan"]}。`,
);

// ── 定章纲 ─────────────────────────────────────────────────

phase("定章纲");

const planner = agent("章纲", {
  system: `你是小说导演台的弧线与章纲。先读 ${rolePath("planner")} 并严格按它执行。`,
});
const plan = await planner.ask<PlanDone>(
  `读 .story/premise.md、${conceptFile}、.story/canon/。写 .story/canon/arcs.md 和 .story/plan/chapters/ch01.md … ch${String(chapterTarget).padStart(2, "0")}.md，并用 thread_add 建伏笔账本。返回 JSON：{"chapters":["ch01","ch02"],"threads":["..."]}。`,
);

const uniqueChapters = [...new Set(plan.chapters)];

if (dryRun) {
  const planned: Finding[] = uniqueChapters.map((chapter) => ({
    where: `.story/plan/chapters/${chapter}.md`,
    what: `章纲 ${chapter} 已生成`,
    evidence: "由章纲角色写入，尚未推演",
    status: "unconfirmed",
    severity: "low",
  }));
  return {
    conclusion: `题材、世界、角色、章纲已生成，共 ${uniqueChapters.length} 章；按 --dry-run 没有写正文。`,
    findings: planned,
    verified: [
      `题材三选一：方案 ${pickNo}`,
      `世界：${worldDone.summary}`,
      `角色 ${castDone.characters.length} 人，主角 ${castDone.protagonist}`,
      `章纲 ${uniqueChapters.length} 章，伏笔 ${plan.threads.length} 条`,
    ],
    notCovered: ["推演", "正文", "连贯性检查", "戏剧评审", "定稿"],
  };
}

// ── 逐章推演与成稿 ─────────────────────────────────────────

const chaptersToRun = uniqueChapters.slice(0, limit);
const outcomes: ChapterOutcome[] = [];

phase("逐章推演与成稿");

for (let i = 0; i < chaptersToRun.length; i++) {
  const chapter = chaptersToRun[i];
  log(`第 ${i + 1}/${chaptersToRun.length} 章：${chapter}`);
  report({ chapter, title: chapter, status: "推演中", words: 0 }, "chapters");

  const director = agent(`导演·${chapter}`, {
    system: `你是小说导演台的导演。先读 ${rolePath("director")} 并严格按它执行。`,
  });
  const config = await director.ask<RunConfig>(
    `读 .story/plan/chapters/${chapter}.md、.story/canon/、.story/ledger/timeline.jsonl、.story/ledger/facts.jsonl、.story/ledger/threads.jsonl。调用 sim_begin 写 config，给每个在场角色写 perception 包。返回 JSON：{"runId":"run_...","maxTicks":5,"participants":["..."],"goal":"..."}。`,
  );

  const participants = [...new Set(config.participants)];
  const maxTicks = Math.min(Math.max(1, config.maxTicks), 8);
  let sceneEnd = false;

  for (let tick = 1; tick <= maxTicks && !sceneEnd; tick++) {
    log(`${chapter} · tick ${tick}/${maxTicks}`);

    const decisions = await Promise.all(
      participants.map((id) =>
        agent(`演员·${chapter}·t${tick}·${id}`, {
          system: `你是角色 ${id}。先读 ${rolePath("actor")} 并严格按它执行。`,
        }).ask<ActorDecision>(
          `只读这三份：.story/canon/characters/${id}.md、.story/sim/runs/${config.runId}/perception/${id}.md、.story/sim/runs/${config.runId}/config.json。你只知道感知包里的事。返回 JSON：{"character":"${id}","intent":"...","action":"...","dialogueIntent":"...","hide":["..."],"notice":["..."]}。`,
        ),
      ),
    );

    const resolver = agent(`裁决·${chapter}·t${tick}`, {
      system: `你是小说导演台的裁决者。先读 ${rolePath("resolver")} 并严格按它执行。`,
    });
    const resolution = await resolver.ask<Resolution>(
      `读 .story/sim/runs/${config.runId}/config.json、.story/canon/rules.md、.story/canon/world.md。本 tick 的角色行动：${JSON.stringify(decisions)}。按裁决规则返回 JSON：{"sceneEnd":false,"summary":"...","stateChanges":2,"informationFlow":2}。同时调用 sim_tick，把完整裁决写入 .story/sim/runs/${config.runId}/ticks/${String(tick).padStart(3, "0")}.json。`,
    );

    const chronicler = agent(`史官·${chapter}·t${tick}`, {
      system: `你是小说导演台的史官。先读 ${rolePath("chronicler")} 并严格按它执行。`,
    });
    await chronicler.ask(
      `读 .story/sim/runs/${config.runId}/ticks/${String(tick).padStart(3, "0")}.json 里的完整裁决。用 timeline_append 写事件、fact_add 写事实、thread_add/thread_update 更新伏笔。返回一句话记账摘要。`,
    );

    sceneEnd = resolution.sceneEnd;
  }

  const ender = agent(`收尾·${chapter}`, {
    system: `你是小说导演台的史官。先读 ${rolePath("chronicler")} 并严格按它执行。`,
  });
  await ender.ask(
    `读 .story/sim/runs/${config.runId}/ticks/ 和 .story/ledger/。按 simulation-protocol 的 Run Report 格式生成报告，调用 sim_end 写 report.md。返回一句话。`,
  );

  const dramatist = agent(`编剧·${chapter}`, {
    system: `你是小说导演台的编剧。先读 ${rolePath("dramatist")} 并严格按它执行。`,
  });
  const scenePath = `.story/plan/scenes/${chapter}-sc01.md`;
  await dramatist.ask(
    `读 .story/sim/runs/${config.runId}/report.md、.story/plan/chapters/${chapter}.md、.story/canon/characters/、.story/canon/voice.md。写 ${scenePath}，选 3–5 个事件，排成场景节拍。返回一句话：POV、目标、转折。`,
  );

  const prose = agent(`执笔·${chapter}`, {
    system: `你是小说导演台的执笔。先读 ${rolePath("prose")} 并严格按它执行。`,
  });
  const draft = await prose.ask<DraftDone>(
    `读 ${scenePath}、.story/canon/voice.md、.story/canon/characters/、上一章结尾。写正文，调用 draft_put 保存到 .story/drafts/${chapter}.md。返回 JSON：{"wordCount":2500,"title":"..."}。`,
  );
  const draftWords = Number(draft.wordCount) || 0;
  report({ chapter, title: draft.title, status: "评审中", words: draftWords }, "chapters");

  const continuity = agent(`连贯性审校·${chapter}`, {
    system: `你是小说导演台的连贯性审校。先读 ${rolePath("continuity")} 并严格按它执行。`,
  });
  const critic = agent(`戏剧评审·${chapter}`, {
    system: `你是小说导演台的戏剧评审。先读 ${rolePath("critic")} 并严格按它执行。`,
  });

  let continuityReview = await continuity.ask<ReviewDone>(
    `读 .story/drafts/${chapter}.md、.story/ledger/facts.jsonl、threads.jsonl、timeline.jsonl、.story/canon/characters/、.story/canon/voice.md。检查后调用 review_put({chapter:"${chapter}",section:"continuity",...})。返回 JSON：{"blocking":0,"important":2,"verdict":"通过"}。`,
  );
  let criticReview = await critic.ask<ReviewDone>(
    `读 .story/drafts/${chapter}.md、${scenePath}、.story/plan/chapters/${chapter}.md、.story/canon/characters/、.story/canon/voice.md。评审后调用 review_put({chapter:"${chapter}",section:"critic",...})。返回 JSON：{"blocking":0,"important":2,"verdict":"通过"}。`,
  );

  for (
    let round = 1;
    round <= 2 && (continuityReview.blocking > 0 || criticReview.blocking > 0);
    round++
  ) {
    log(`${chapter} · 改写第 ${round} 轮`);
    await prose.ask<DraftDone>(
      `读 .story/reviews/${chapter}.md 的阻断问题，按修法改写 .story/drafts/${chapter}.md，调用 draft_put 覆盖。不要新增事实。返回 JSON：{"wordCount":2500,"title":"..."}。`,
    );
    continuityReview = await continuity.ask<ReviewDone>(
      `重新检查改写后的 .story/drafts/${chapter}.md，调用 review_put 更新 continuity 段。返回 JSON：{"blocking":0,"important":0,"verdict":"..."}。`,
    );
    criticReview = await critic.ask<ReviewDone>(
      `重新评审改写后的 .story/drafts/${chapter}.md，调用 review_put 更新 critic 段。返回 JSON：{"blocking":0,"important":0,"verdict":"..."}。`,
    );
  }

  const blocking = (Number(continuityReview.blocking) || 0) + (Number(criticReview.blocking) || 0);
  const outcome: ChapterOutcome = {
    chapter,
    status: blocking > 0 ? "needs-human" : "done",
    words: draftWords,
    blocking,
    note: blocking > 0 ? `仍有 ${blocking} 个阻断问题，需人工处理` : "连贯性与戏剧评审通过",
  };
  outcomes.push(outcome);
  report(
    {
      chapter,
      title: draft.title,
      status: outcome.status === "done" ? "已完成" : "需人工",
      words: outcome.words,
    },
    "chapters",
  );

  const recorder = agent(`记录·${chapter}`);
  await recorder.ask(
    `本章阻断数：${blocking}。如果为 0，调用 project_update({patch:{add_chapter:"${chapter}"}})；否则不要加。返回一句话。`,
  );
}

// ── 定稿与交付 ─────────────────────────────────────────────

phase("定稿与交付");

const exporter = agent("定稿");
const exported = await exporter.ask<ExportDone>(
  `读 .story/state.json、.story/drafts/、.story/reviews/、.story/ledger/threads.jsonl。按小说导演台的定稿步骤：调用 thread_list 清算伏笔（planted 的改成 paid 或 carried），调用 export_manuscript，调用 project_update({patch:{phase:"done"}})。调用 project_status 拿 story_root。返回 JSON：{"chapters":2,"words":5000,"carried":0,"storyRoot":"D:/.../.story"}。`,
);

const storyRoot = String(exported.storyRoot || "").replace(/\\/g, "/");
if (!storyRoot) throw new Error("定稿没有返回 storyRoot");
const exportedChapters = Number(exported.chapters) || 0;
const exportedWords = Number(exported.words) || 0;
const exportedCarried = Number(exported.carried) || 0;

try {
  await artifact.file("manuscript", `${storyRoot}/final/manuscript.md`, {
    title: "定稿",
    description: `${title} · ${exportedChapters} 章 · ${exportedWords} 字`,
    primary: true,
  });
} catch {
  const repair = agent("补交定稿");
  await repair.ask(
    `.story/final/manuscript.md 不存在或无法发布。读 .story/drafts/ 并调用 export_manuscript 重新生成，然后确认 .story/final/manuscript.md 存在。返回一句话。`,
  );
  await artifact.file("manuscript", `${storyRoot}/final/manuscript.md`, {
    title: "定稿",
    description: `${title} · ${exportedChapters} 章 · ${exportedWords} 字`,
    primary: true,
  });
}

try {
  await artifact.file("report", `${storyRoot}/final/report.md`, {
    title: "交付报告",
    description: "伏笔清算、AI 自己做的决定、留白清单。",
  });
} catch {
  const repairReport = agent("补交报告");
  await repairReport.ask(
    `.story/final/report.md 不存在或无法发布。调用 export_manuscript 重新生成，然后确认 .story/final/report.md 存在。返回一句话。`,
  );
  await artifact.file("report", `${storyRoot}/final/report.md`, {
    title: "交付报告",
    description: "伏笔清算、AI 自己做的决定、留白清单。",
  });
}

const needsHuman = outcomes.filter((o) => o.status === "needs-human");
const findings: Finding[] = outcomes.map((o) => ({
  where: `.story/drafts/${o.chapter}.md`,
  what: o.note,
  evidence: `字数 ${o.words}；阻断 ${o.blocking}`,
  status: o.blocking === 0 ? "verified" : "unconfirmed",
  severity: o.blocking > 0 ? "high" : "low",
}));

return {
  conclusion:
    `《${title}》已推演并定稿 ${exportedChapters} 章，共 ${exportedWords} 字。` +
    (needsHuman.length
      ? `其中 ${needsHuman.length} 章仍有阻断问题（${needsHuman.map((o) => o.chapter).join("、")}），需要你人工处理。`
      : "所有章节的连贯性与戏剧评审均通过。"),
  findings,
  verified: [
    `题材三选一：方案 ${pickNo}`,
    `世界：${worldDone.summary}`,
    `角色 ${castDone.characters.length} 人，主角 ${castDone.protagonist}`,
    `章纲 ${uniqueChapters.length} 章，伏笔 ${plan.threads.length} 条`,
    `每章都跑了推演并写入 .story/sim/runs/`,
    `每章正文都经过连贯性检查与戏剧评审`,
    `伏笔账本已清算，留白 ${exportedCarried} 条`,
  ],
  notCovered: [
    "没有做人工终审；定稿需要你验收",
    "没有做出版级校对、封面、有声",
    ...(needsHuman.length ? [`${needsHuman.length} 章仍有阻断问题，未自动修复`] : []),
  ],
};
