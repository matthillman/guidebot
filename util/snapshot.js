
const puppeteer = require('puppeteer');

const snapshot = async (url) => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });
    await page.goto(url);
    const card = await page.$('.card');
    const image = await card.screenshot();
    await page.close();
    await browser.close();
    return image;
};

exports.snapshot = snapshot;
