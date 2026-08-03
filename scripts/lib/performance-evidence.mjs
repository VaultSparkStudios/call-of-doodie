function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function median(values) {
  const sorted = values.filter((value) => value != null).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function extractLighthouseMetrics(report) {
  return {
    requestedUrl: report?.requestedUrl || null,
    finalUrl: report?.finalDisplayedUrl || report?.finalUrl || null,
    performance: finite(report?.categories?.performance?.score),
    lcpMs: finite(report?.audits?.['largest-contentful-paint']?.numericValue),
    cls: finite(report?.audits?.['cumulative-layout-shift']?.numericValue),
    tbtMs: finite(report?.audits?.['total-blocking-time']?.numericValue),
  };
}

export function extractLighthouseDiagnostics(report) {
  const unused = report?.audits?.['unused-javascript']?.details;
  const resourceRows = report?.audits?.['resource-summary']?.details?.items || [];
  const renderRows = report?.audits?.['render-blocking-insight']?.details?.items || [];
  return {
    unusedJavascriptBytes: finite(unused?.overallSavingsBytes),
    estimatedLcpSavingsMs: finite(unused?.debugData?.metricSavings?.LCP),
    mainThreadWorkMs: finite(report?.audits?.['mainthread-work-breakdown']?.numericValue),
    totalTransferBytes: finite(resourceRows.find((row) => row.resourceType === 'total')?.transferSize),
    renderBlockingBytes: renderRows.reduce((sum, row) => sum + (finite(row.totalBytes) || 0), 0),
    highWasteAssets: (unused?.items || [])
      .filter((item) => finite(item.wastedBytes) > 0)
      .map((item) => ({
        url: item.url,
        transferBytes: finite(item.totalBytes),
        wastedBytes: finite(item.wastedBytes),
      }))
      .sort((a, b) => b.wastedBytes - a.wastedBytes),
  };
}

export function buildPerformanceEvidence({
  runs = [],
  sourceSha = null,
  hostedRevision = null,
  healthBodyHash = null,
  baseUrl = null,
  lighthouseVersion = null,
  chromeVersion = null,
  packageTrust = {},
  capturedAt = null,
  requiredSamples = 3,
} = {}) {
  const issues = [];
  const warnings = [...new Set(runs.map((run) => run.captureWarning).filter(Boolean))];
  const surfaces = {};
  for (const surface of ['default', 'legacy-v1']) {
    const samples = runs.filter((run) => run.surface === surface);
    if (samples.length === 0) issues.push(`No Lighthouse samples for ${surface}.`);
    if (samples.length < requiredSamples) {
      issues.push(`${surface} has ${samples.length} Lighthouse sample(s); ${requiredSamples} required.`);
    }
    const metrics = samples.map((sample) => extractLighthouseMetrics(sample.report));
    const diagnostics = samples.map((sample) => extractLighthouseDiagnostics(sample.report));
    if (metrics.some((metric) => metric.requestedUrl !== metric.finalUrl)) {
      issues.push(`${surface} redirected during capture.`);
    }
    if (metrics.some((metric) => [metric.performance, metric.lcpMs, metric.cls, metric.tbtMs].some((value) => value == null))) {
      issues.push(`${surface} contains incomplete Lighthouse metrics.`);
    }
    if (baseUrl) {
      const expected = new URL(baseUrl);
      if (surface === 'legacy-v1') expected.searchParams.set('home', 'v1');
      if (metrics.some((metric) => metric.requestedUrl !== expected.toString())) {
        issues.push(`${surface} was not captured from the declared production surface.`);
      }
    }
    const highWasteAssets = [...new Map(
      diagnostics.flatMap((diagnostic) => diagnostic.highWasteAssets).map((asset) => [asset.url, asset]),
    ).values()].sort((a, b) => b.wastedBytes - a.wastedBytes);
    surfaces[surface] = {
      sampleCount: samples.length,
      median: {
        performance: median(metrics.map((metric) => metric.performance)),
        lcpMs: median(metrics.map((metric) => metric.lcpMs)),
        cls: median(metrics.map((metric) => metric.cls)),
        tbtMs: median(metrics.map((metric) => metric.tbtMs)),
      },
      diagnostics: {
        medianUnusedJavascriptBytes: median(diagnostics.map((diagnostic) => diagnostic.unusedJavascriptBytes)),
        medianEstimatedLcpSavingsMs: median(diagnostics.map((diagnostic) => diagnostic.estimatedLcpSavingsMs)),
        medianMainThreadWorkMs: median(diagnostics.map((diagnostic) => diagnostic.mainThreadWorkMs)),
        medianTotalTransferBytes: median(diagnostics.map((diagnostic) => diagnostic.totalTransferBytes)),
        medianRenderBlockingBytes: median(diagnostics.map((diagnostic) => diagnostic.renderBlockingBytes)),
        highWasteAssets,
      },
      samples: samples.map((sample, index) => ({
        run: index + 1,
        requestedUrl: metrics[index].requestedUrl,
        finalUrl: metrics[index].finalUrl,
        rawSha256: sample.rawSha256,
        ...(sample.captureWarning ? { captureWarning: sample.captureWarning } : {}),
        ...metrics[index],
      })),
    };
  }

  if (!sourceSha) issues.push('Source SHA is missing.');
  if (!hostedRevision) issues.push('Hosted revision is missing.');
  if (sourceSha && hostedRevision && !sourceSha.startsWith(hostedRevision)) {
    issues.push('Hosted revision does not match the source SHA.');
  }
  if (packageTrust?.liveVerdict !== 'APPROVE') issues.push('Package trust live verdict is not APPROVE.');

  const defaultLcp = surfaces.default.median.lcpMs;
  const legacyLcp = surfaces['legacy-v1'].median.lcpMs;
  const lcpImprovementMs = defaultLcp != null && legacyLcp != null ? legacyLcp - defaultLcp : null;
  const lighthouseGatePassed = lcpImprovementMs != null && lcpImprovementMs >= 200;

  return {
    schemaVersion: 'production-performance-evidence-v1',
    ok: issues.length === 0,
    issues,
    warnings,
    capturedAt,
    baseUrl,
    sourceSha,
    hostedRevision,
    healthBodyHash,
    tool: { lighthouseVersion, chromeVersion },
    packageTrust,
    surfaces,
    comparison: {
      lcpImprovementMs,
      requiredImprovementMs: 200,
      lighthouseGatePassed,
    },
    retirement: {
      lighthouseGate: lighthouseGatePassed ? 'pass' : 'fail',
      funnelGate: 'not-collected',
      eligible: false,
      reason: 'Legacy retirement requires both measured Lighthouse improvement and independent production funnel evidence.',
    },
  };
}
