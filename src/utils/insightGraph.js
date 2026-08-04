const CONFIDENCE_BY_LEVEL = Object.freeze({ observed: 0.96, likely_factor: 0.74, pattern: 0.68, hypothesis: 0.48, suggestion: 0.42, strength: 0.58 });

function clean(value, max = 280) {
  return String(value || "").replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim().slice(0, max);
}

function fingerprint(value) {
  let hash = 2166136261;
  for (const char of value) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).toUpperCase().padStart(8, "0");
}

function evidenceNode({ id, kind, topic, statement, evidenceLevel, reasonCode, polarity = "neutral", action = null }) {
  const safeStatement = clean(statement);
  if (!safeStatement) return null;
  const level = CONFIDENCE_BY_LEVEL[evidenceLevel] ? evidenceLevel : "hypothesis";
  return {
    id,
    kind,
    topic,
    statement: safeStatement,
    evidenceLevel: level,
    reasonCode: clean(reasonCode || id, 64),
    polarity,
    confidence: CONFIDENCE_BY_LEVEL[level],
    causalFingerprint: fingerprint(`${topic}|${clean(reasonCode || id, 64)}|${safeStatement.toLowerCase().replace(/[^a-z0-9]+/g, " ")}`),
    action,
  };
}

export function resolveInsightNodes(rawNodes = []) {
  const nodes = rawNodes.filter(Boolean);
  const byCause = new Map();
  for (const node of nodes) {
    const key = `${node.topic}:${node.reasonCode}`;
    const current = byCause.get(key);
    if (!current || node.confidence > current.confidence) byCause.set(key, node);
  }
  const deduplicated = [...byCause.values()];
  const contradictions = [];
  for (let i = 0; i < deduplicated.length; i += 1) {
    for (let j = i + 1; j < deduplicated.length; j += 1) {
      const left = deduplicated[i];
      const right = deduplicated[j];
      if (left.topic === right.topic && left.polarity !== "neutral" && right.polarity !== "neutral" && left.polarity !== right.polarity) {
        contradictions.push({ topic: left.topic, nodes: [left.id, right.id] });
        left.confidence = Math.max(0.1, left.confidence - 0.15);
        right.confidence = Math.max(0.1, right.confidence - 0.15);
      }
    }
  }
  return { nodes: deduplicated.sort((a, b) => b.confidence - a.confidence), contradictions };
}

export function buildInsightGraph({ runCoach = {}, collapseCoaching = {}, postRunIntel = {}, debrief = {}, runTheFix = {} } = {}) {
  const rawNodes = [
    evidenceNode({ id: "collapse-primary", kind: "diagnosis", topic: "collapse", statement: collapseCoaching.primary?.statement, evidenceLevel: collapseCoaching.primary?.evidenceLevel, reasonCode: collapseCoaching.primary?.reasonCode, polarity: "risk" }),
    evidenceNode({ id: "cross-run-killer", kind: "pattern", topic: "threat", statement: runCoach.crossRunTip || runCoach.killedBy, evidenceLevel: runCoach.crossRunTip ? "pattern" : "hypothesis", reasonCode: runCoach.enemyLab ? `enemy-${runCoach.enemyLab.enemyType}` : "death-summary", polarity: "risk" }),
    evidenceNode({ id: "choke-warning", kind: "pattern", topic: "pressure", statement: runCoach.brain?.chokeWarning?.tip, evidenceLevel: "pattern", reasonCode: runCoach.brain?.chokeWarning ? `wave-${runCoach.brain.chokeWarning.wave}` : "none", polarity: "risk" }),
    evidenceNode({ id: "post-run-drill", kind: "lesson", topic: "adaptation", statement: postRunIntel.drill, evidenceLevel: "suggestion", reasonCode: postRunIntel.cause || "post-run-drill", polarity: "improve" }),
    evidenceNode({ id: "run-fix-target", kind: "lesson", topic: "adaptation", statement: runTheFix.target, evidenceLevel: collapseCoaching.primary?.evidenceLevel || "suggestion", reasonCode: runTheFix.focus || "run-fix", polarity: "improve", action: runTheFix.action || null }),
    evidenceNode({ id: "working-strength", kind: "strength", topic: "build", statement: runCoach.working, evidenceLevel: "strength", reasonCode: debrief.identity || "run-strength", polarity: "improve" }),
    evidenceNode({ id: "next-experiment", kind: "lesson", topic: "experiment", statement: runCoach.brain?.nextExperiment, evidenceLevel: "suggestion", reasonCode: "next-experiment", polarity: "improve" }),
  ];
  const resolved = resolveInsightNodes(rawNodes);
  const verdict = resolved.nodes.find((node) => node.kind === "diagnosis" || node.kind === "pattern") || resolved.nodes[0];
  const lesson = resolved.nodes.find((node) => node.kind === "lesson") || resolved.nodes.find((node) => node.kind === "strength") || verdict;
  const action = resolved.nodes.find((node) => node.action)?.action || runTheFix.action || null;
  const confidence = verdict?.confidence || 0.35;
  const graph = {
    schemaVersion: "run-insight-graph-v1",
    claim: "evidence-ranked-coaching-not-causality",
    verdict: verdict ? { statement: verdict.statement, evidenceLevel: verdict.evidenceLevel, confidence, reasonCode: verdict.reasonCode } : { statement: "No stable run pattern was established.", evidenceLevel: "hypothesis", confidence: 0.35, reasonCode: "insufficient-evidence" },
    lesson: lesson?.statement || "Change one variable and compare the next run.",
    action,
    nodes: resolved.nodes,
    contradictions: resolved.contradictions,
  };
  graph.fingerprint = fingerprint(JSON.stringify({ nodes: graph.nodes.map(({ id, causalFingerprint, confidence: nodeConfidence }) => ({ id, causalFingerprint, confidence: nodeConfidence })), contradictions: graph.contradictions }));
  graph.telemetry = { schemaVersion: graph.schemaVersion, fingerprint: graph.fingerprint, nodeCount: graph.nodes.length, contradictionCount: graph.contradictions.length, verdictReasonCode: graph.verdict.reasonCode, verdictConfidence: Number(graph.verdict.confidence.toFixed(2)) };
  graph.agentProjection = { schemaVersion: graph.schemaVersion, claim: graph.claim, fingerprint: graph.fingerprint, verdict: graph.verdict, lesson: graph.lesson, action: graph.action, evidence: graph.nodes.map(({ id, kind, topic, evidenceLevel, reasonCode, confidence: nodeConfidence }) => ({ id, kind, topic, evidenceLevel, reasonCode, confidence: Number(nodeConfidence.toFixed(2)) })) };
  return graph;
}
