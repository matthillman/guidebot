
const puppeteer = require('puppeteer');
const { Attachment } = require('discord.js');

const snapshot = async (url) => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });
    await page.setExtraHTTPHeaders({ schwartz: 'bot' });
    const response = await page.goto(url);
    let result;
    if (response.ok()) {
        await page.evaluateHandle('document.fonts.ready');
        const card = await page.$('.card');
        result = await card.screenshot();
    } else {
        result = false;
    }
    await page.close();
    await browser.close();
    if (result === false) {
        throw new Error(response.status());
    }
    return result;
};

const https = require('https');

const scrapeUser = async (client, code, callback) => {
    try {
        client.userQueue.push({
            code,
            callback,
        });
        const response = await client.axios.get(`/api/member/scrape/${code}`, {
            httpsAgent: new https.Agent({
                rejectUnauthorized: false,
            })
        });

        return response;
    } catch (error) {
        return { error };
    }
};

const scrapeGuild = async (client, code, callback) => {
    try {
        client.userQueue.push({
            code,
            callback,
        });
        const response = await client.axios.get(`/api/guild/scrape/${code}`, {
            httpsAgent: new https.Agent({
                rejectUnauthorized: false,
            })
        });

        return response;
    } catch (error) {
        return { error };
    }
};

const reallyDoSnap = async (URL, message, name) => {
    const buffer = await snapshot(URL);
    await message.channel.send(new Attachment(buffer, `${name}.png`));
};

const failed = [];
const snapReplyForAllyCodes = async (codes, urlSlug, message, client, urlSuffix) => {
    if (!Array.isArray(codes)) {
        codes = [codes];
    }

    for (const code of codes) {
        const failIndex = failed.indexOf(code);
        const URL = `${client.config.client.base_url}/${urlSlug}/${code}${urlSuffix || ''}`;
        try {
            await reallyDoSnap(URL, message, code);

            if (failIndex > -1) {
                failed.slice(failIndex, 1);
            }
        } catch (e) {
            client.logger.error(`Fetching page to snapshot failed with status ${e.message} (${URL})`);
            if (failIndex > -1) {
                failed.slice(failIndex, 1);
                await message.reply(`Querying ally code ${code} has failed too many times. Please manually scrape this user and try again`);
                continue;
            }
            failed.push(code);
            client.logger.error(`Error getting snapshot for ${urlSlug} -> ${code}, trying to query`);
            const scrapeMessage = await message.channel.send(`Ally code ${code} needs to be scraped first…`);
            await scrapeMessage.react('⏳');
            await scrapeUser(client, code, async () => {
                await scrapeMessage.react('🎉');
                await scrapeMessage.delete();

                await snapReplyForAllyCodes(codes, urlSlug, message, client);
            });
        }
    }
};

const snapReplyForGuilds = async (guild1, guild2, urlSlug, message, client, urlSuffix) => {
    const originalArgs = [].slice.call(arguments);
    const combinedID = `${guild1}vs${guild2}`;
    const failIndex = failed.indexOf(combinedID);
    const URL = `${client.config.client.base_url}/${urlSlug}/${guild1}/${guild2}${urlSuffix || ''}`;
    try {
        await reallyDoSnap(URL, message, combinedID);

        if (failIndex > -1) {
            failed.slice(failIndex, 1);
        }
    } catch (e) {
        client.logger.error(`Fetching page to snapshot failed with status ${e.message} (${URL})`);
        if (failIndex > -1) {
            failed.slice(failIndex, 1);
            await message.reply(`Querying guilds ${guild1} + ${guild2} has failed too many times. Please manually scrape this user and try again`);
        }
        failed.push(combinedID);
        client.logger.error(`Error getting snapshot for ${urlSlug} -> ${combinedID}, trying to query`);
        const scrapeMessage = await message.channel.send(`Trying to scrape guilds ${guild1} and ${guild2}…`);
        await scrapeMessage.react('⏳');
        let completeCount = 0;

        [guild1, guild2].forEach(async code => {
            await scrapeGuild(client, code, async () => {
                completeCount += 1;

                if (completeCount == 2) {
                    await scrapeMessage.react('🎉');
                    await scrapeMessage.delete();

                    await snapReplyForGuilds(guild1, guild2, `compare`, message, client);
                } else {
                    await scrapeMessage.react('⌛️');
                }
            })
        });
    }

};

exports.snapshot = snapshot;
exports.snapReplyForAllyCodes = snapReplyForAllyCodes;
exports.snapReplyForGuilds = snapReplyForGuilds;
exports.scrapeGuild = scrapeGuild;
exports.scrapeUser = scrapeUser;