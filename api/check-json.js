// File: api/check-json.js (for use on Vercel)

const puppeteer = require('puppeteer-core');
const fetch = require('node-fetch');

const BROWSERLESS_API_KEY = process.env.BROWSERLESS_API_KEY;
const ZAPIER_WEBHOOK_URL = process.env.ZAPIER_WEBHOOK_URL;
const TARGET_URL = process.env.TARGET_URL;

// In-memory cache (will reset every time Vercel spins down)
let cachedJSON = null;

module.exports = async (req, res) => {
  const browser = await puppeteer.connect({
    browserWSEndpoint: `wss://chrome.browserless.io?token=${BROWSERLESS_API_KEY}`,
  });

  const page = await browser.newPage();

  try {
    await page.authenticate({
        username: process.env.BASIC_AUTH_USERNAME,
        password: process.env.BASIC_AUTH_PASSWORD,
      });
      
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
