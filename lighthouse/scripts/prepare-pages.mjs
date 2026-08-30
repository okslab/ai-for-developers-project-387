import { mkdir, readFile, readdir, copyFile, writeFile } from "node:fs/promises";
import { join, basename, resolve } from "node:path";

const reportsDir = resolve(process.env.REPORTS_DIR ?? join(process.cwd(), "reports"));
const outDir = resolve(process.env.PAGES_DIR ?? join(process.cwd(), "_site"));
const latestDir = join(outDir, "lighthouse", "latest");

await mkdir(latestDir, { recursive: true });

const manifestPath = join(reportsDir, "manifest.json");
let reports;
try {
  reports = JSON.parse(await readFile(manifestPath, "utf8"));
} catch {
  const htmlFiles = (await readdir(reportsDir)).filter((f) => f.endsWith(".html"));
  reports = htmlFiles.map((f) => ({
    url: `https://${f.replace(/-[^-]*\.report\.html$/, "")}`,
    htmlPath: join(reportsDir, f),
  }));
}

if (reports.length === 0) {
  throw new Error(`No reports found in ${reportsDir}`);
}

const entries = [];
for (const report of reports) {
  const htmlPath = resolve(report.htmlPath);
  const fileName = basename(htmlPath);
  await copyFile(htmlPath, join(latestDir, fileName));
  entries.push({ url: report.url, fileName, summary: report.summary ?? {} });
}

const rows = entries
  .map(
    (e) => `    <li>
      <a href="lighthouse/latest/${e.fileName}">${e.url}</a>
      ${Object.entries(e.summary)
        .map(([k, v]) => `<span class="score">${k}: ${Math.round((v ?? 0) * 100)}</span>`)
        .join("")}
    </li>`
  )
  .join("\n");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Lighthouse reports</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 720px; margin: 2rem auto; padding: 0 1rem; }
    li { margin: .5rem 0; }
    .score { color: #555; font-size: .85rem; margin-left: .5rem; }
  </style>
</head>
<body>
  <h1>Lighthouse reports</h1>
  <p>Latest run from <code>lighthouse</code> workflow.</p>
  <ul>
${rows}
  </ul>
</body>
</html>
`;

await writeFile(join(outDir, "index.html"), html);
console.log(`Prepared ${entries.length} report(s) in ${latestDir} and index.html`);