import { existsSync } from 'node:fs';
import { join } from 'node:path';

// Renders a page of this app to PNG or PDF in a headless copy of the Chrome
// already installed on this machine (Atlas Pulse needs Chrome for Gemini
// Nano), through puppeteer-core. The page sets <body data-ready="1"> when it
// has finished drawing, or data-ready="error" with data-error.

const programFiles = (env) => [env.PROGRAMFILES, env['PROGRAMFILES(X86)'], env.LOCALAPPDATA].filter(Boolean);

const CANDIDATES = {
  darwin: () => [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  ],
  linux: () => ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/microsoft-edge'],
  win32: (env) => programFiles(env).flatMap((dir) => [join(dir, 'Google/Chrome/Application/chrome.exe'), join(dir, 'Microsoft/Edge/Application/msedge.exe')]),
};

/** The Chrome (or Chromium/Edge) to use: CHROME_PATH if set, else a standard install; null if none. */
export function findChrome({ env = process.env, platform = process.platform, exists = existsSync } = {}) {
  const candidates = [env.CHROME_PATH, ...(CANDIDATES[platform]?.(env) ?? [])].filter(Boolean);
  return candidates.find((path) => exists(path)) ?? null;
}

export const PAGE_WIDTH = 1000;
const A4_WIDTH_PX = 793.7; // 210 mm at 96 px per inch
const TIMEOUT_MS = 30_000;

async function waitUntilDrawn(page) {
  await page.waitForFunction(() => ['1', 'error'].includes(document.body.dataset.ready), { timeout: TIMEOUT_MS });
  const failed = await page.evaluate(() => (document.body.dataset.ready === 'error' ? document.body.dataset.error || 'The page could not be drawn' : null));
  if (failed) throw new Error(failed);
}

// PNG: the page element at twice the pixels, for sharp sharing.
async function capturePng(page) {
  const pageElement = await page.$('[data-export-page]');
  return pageElement.screenshot({ type: 'png' });
}

// PDF: real text on A4 pages (size and margins from the page's @page rule),
// the 1000 px page scaled to the paper's width.
const capturePdf = (page) => page.pdf({ preferCSSPageSize: true, printBackground: true, scale: A4_WIDTH_PX / PAGE_WIDTH });

/**
 * The page at `url` as a PNG or PDF Buffer. launch: puppeteer's launch (or a
 * stand-in for tests); executablePath: from findChrome.
 */
export async function renderPage(url, format, { launch, executablePath }) {
  const browser = await launch({ executablePath, headless: true, args: ['--no-first-run', '--no-default-browser-check', '--disable-extensions'] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: PAGE_WIDTH, height: 1200, deviceScaleFactor: format === 'png' ? 2 : 1 });
    await page.goto(url, { waitUntil: 'networkidle0', timeout: TIMEOUT_MS });
    await waitUntilDrawn(page);
    return Buffer.from(format === 'png' ? await capturePng(page) : await capturePdf(page));
  } finally {
    await browser.close();
  }
}
