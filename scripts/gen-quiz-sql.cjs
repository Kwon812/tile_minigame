// Convert quizs_rows.json (legacy table) -> seed SQL for the current `quizzes`
// schema. Run: node scripts/gen-quiz-sql.cjs
const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "..", "quizs_rows.json");
const OUT = path.join(__dirname, "..", "supabase", "seed_quizzes.sql");

// English `type` -> Korean theme.
const THEME = {
  filial: "효",
  media1: "미디어1",
  media2: "미디어2",
  media3: "미디어3",
  media4: "미디어4",
  "ai literacy": "인공지능 리터러시",
  "deep fake": "딥페이크",
  // 온라인 그루밍 문항도 딥페이크 테마로 통합.
  "미디어 역기능 예방교육(딥페이크, 온라인 그루밍)": "딥페이크",
};

// Strip control characters (e.g.  vertical tab) and trim.
const clean = (s) =>
  String(s)
    .split("")
    .filter((ch) => ch.charCodeAt(0) >= 0x20)
    .join("")
    .trim();
const esc = (s) => s.replace(/'/g, "''");

const rows = JSON.parse(fs.readFileSync(SRC, "utf8"));
const seen = new Set();
const out = [];
const records = []; // for REST/JSON insert
const skipped = [];

for (const row of rows) {
  let parsed;
  try {
    parsed = JSON.parse(row.problems);
  } catch {
    skipped.push([row.id, "problems 파싱 실패"]);
    continue;
  }

  const origIdx = parseInt(row.answer, 10) - 1;
  let correct = origIdx;
  const opts = [];
  parsed.forEach((o, i) => {
    const c = clean(o);
    if (c === "") {
      if (i < origIdx) correct -= 1; // 앞쪽 빈 보기 제거 시 정답 인덱스 보정
      return;
    }
    opts.push(c);
  });

  const question = clean(row.title);
  if (!question) {
    skipped.push([row.id, "빈 문제"]);
    continue;
  }
  if (opts.length < 2) {
    skipped.push([row.id, "보기 2개 미만"]);
    continue;
  }
  if (correct < 0 || correct >= opts.length) {
    skipped.push([row.id, `정답 인덱스 범위 밖(${correct})`]);
    continue;
  }

  const theme = THEME[row.type] || row.type;
  const sig = `${question}|${opts.join("|")}|${correct}`;
  if (seen.has(sig)) {
    skipped.push([row.id, "중복"]);
    continue;
  }
  seen.add(sig);

  records.push({
    question,
    options: opts,
    correct_answer: correct,
    theme,
    difficulty: "normal",
    is_active: true,
    created_at: row.created_at,
  });
  out.push(
    `  ('${esc(question)}', '${esc(JSON.stringify(opts))}'::jsonb, ${correct}, '${esc(
      theme
    )}', 'normal', true, '${row.created_at}'::timestamptz)`
  );
}

const sql = `-- Seed generated from quizs_rows.json (legacy table) for the current
-- public.quizzes schema. Run once in the Supabase SQL editor.
-- ${out.length} rows inserted, ${skipped.length} skipped.

insert into public.quizzes
  (question, options, correct_answer, theme, difficulty, is_active, created_at)
values
${out.join(",\n")};
`;

fs.writeFileSync(OUT, sql);
fs.writeFileSync(
  path.join(__dirname, "..", "supabase", "seed_quizzes.json"),
  JSON.stringify(records, null, 2)
);

console.log(`OK ${out.length} rows -> ${path.relative(process.cwd(), OUT)}`);
const themeCounts = {};
for (const r of out) {
  const m = r.match(/::jsonb, \d+, '([^']*(?:''[^']*)*)'/);
  const t = m ? m[1].replace(/''/g, "'") : "?";
  themeCounts[t] = (themeCounts[t] || 0) + 1;
}
console.log("테마별 개수:");
for (const [t, c] of Object.entries(themeCounts)) console.log(`  ${t}: ${c}`);
console.log("제외된 행:");
for (const [id, why] of skipped) console.log(`  id ${id}: ${why}`);
