// File: api/check-json.js (for use on Vercel)

const puppeteer = require('puppeteer-core');
const fetch = require('node-fetch');

const BROWSERLESS_API_KEY = 'S71NvUhplRs28S1e261183f18fba337f9588c4a765';
const ZAPIER_WEBHOOK_URL = 'https://hooks.zapier.com/hooks/catch/19276363/20f1knc/';
const TARGET_URL = 'https://competitioncorner.net/api2/v1/reports/organizer/642631/athletesdata/json?status=live&eventIds=16070';

// In-memory cache (will reset every time Vercel spins down)
let cachedJSON = null;

module.exports = async (req, res) => {
  const browser = await puppeteer.connect({
    browserWSEndpoint: `wss://chrome.browserless.io?token=${BROWSERLESS_API_KEY}`,
  });

  const page = await browser.newPage();

  try {
    await page.goto(TARGET_URL, { waitUntil: 'networkidle2' });

    const bodyText = await page.evaluate(() => document.body.innerText);
    const newJSON = JSON.parse(bodyText);

    const changed = JSON.stringify(newJSON) !== JSON.stringify(cachedJSON);

    if (changed) {
      cachedJSON = newJSON;

      // Notify Zapier
      if (ZAPIER_WEBHOOK_URL) {
        await fetch(ZAPIER_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newJSON),
        });
      }
    }

    res.status(200).json({ changed, data: changed ? newJSON : null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await browser.close();
  }
};
