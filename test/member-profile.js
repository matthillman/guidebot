const __basedir = global.__basedir = `${__dirname}/..`;
const puppeteer = require('puppeteer');

async function run() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });
    const response = await page.goto(`https://schwartz.test/member/552325555`);
    if (response.ok()) {
        const card = await page.$('.card');
        await card.screenshot({ path: `${__basedir}/test/test.png` });
    } else {
        await page.close();
        await browser.close();
        throw new Error(response.status());
    }
    await page.close();
    await browser.close();
}

async function runSafe() {
    try {
        await run();
    } catch (e) {
        console.log(e.message);
    }
}

runSafe();