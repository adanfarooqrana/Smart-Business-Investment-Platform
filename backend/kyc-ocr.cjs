const path = require("node:path");
const runtime = path.join(__dirname, ".kyc-runtime");
const { createWorker } = require(path.join(runtime, "node_modules/tesseract.js"));

async function main() {
  const [mode, ...files] = process.argv.slice(2);
  const worker = await createWorker(mode === "mixed" ? ["eng", "urd"] : "eng", 1, {
    langPath: path.join(runtime, "tessdata"),
    cacheMethod: "none",
    gzip: false,
  });
  try {
    const results = [];
    if (mode === "english") await worker.setParameters({ tessedit_pageseg_mode: "6" });
    if (mode === "number") {
      await worker.setParameters({ tessedit_pageseg_mode: "7", tessedit_char_whitelist: "0123456789-" });
    }
    for (const file of files) {
      const { data } = await worker.recognize(file);
      results.push(data.text);
    }
    process.stdout.write(JSON.stringify(results));
  } finally {
    await worker.terminate();
  }
}

main().catch(() => { process.exitCode = 1; });
