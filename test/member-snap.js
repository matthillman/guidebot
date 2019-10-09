const fs = require('fs');
const __basedir = global.__basedir = `${__dirname}/..`;

// const snapshot = async (url, path) => {
//     return new Promise((resolve, reject) => {
//         // var renderStream = webshot(url, {
//         //     errorIfStatusIsNot200: true,
//         //     errorIfJSException: true,
//         // });
//         // const out = fs.createWriteStream(path, { encoding: 'binary' });
//         // renderStream.on('data', function(data) {
//         //     out.write(data.toString('binary'), 'binary');
//         // });
//         // renderStream.on('end', () =>  resolve());
//         // renderStream.on('error', () =>  reject());

//         webshot(url, path, (err) => {
//             if (err) {
//                 reject(err);
//             } else {
//                 resolve();
//             }
//         });
//     });
// };


// const run = async () => {
//     try {
//         await snapshot('https://schwartz.hillman.me/member/552325555/gs', `${__basedir}/test/test.png`);
//     } catch (error) {
//         console.error('Error', error);
//     }
// };

// const puppeteer = require('puppeteer');

// async function run() {
//     const browser = await puppeteer.launch({ headless: true });
//     const page = await browser.newPage();
//     await page.setViewport({ width: 1200, height: 800 });
//     await page.goto(`https://schwartz.hillman.me/member/552325555/gs`);
//     const card = await page.$('.card');
//     await card.screenshot({ path: `${__basedir}/test/test.png` });
//     await page.close();
//     await browser.close();
// }

const { snapshot } = require('../util/snapshot');
const run = async () => {
    const buffer = await snapshot(`https://schwartz.hillman.me/member/552325555/gs`);
    fs.writeFileSync(`${__basedir}/test/test.png`, buffer);
};

run();
