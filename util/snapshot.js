
const puppeteer = require('puppeteer');
const { Attachment } = require('discord.js');

class PageError extends Error {
    constructor(message) {
        super(message);
        this.name = 'PageError';
    }
}

let authHeader = null;
const init = async client => {
    authHeader = client.axios.defaults.headers.common['Authorization'];
};
const snapshot = async (url) => {
    let start = (new Date).getTime();
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800, deviceScaleFactor: 2 });
    await page.setExtraHTTPHeaders({
        schwartz: 'bot',
        Authorization: authHeader,
    });
    const response = await page.goto(url);
    let cur = (new Date).getTime();
    console.log(`⏲  Response took ${(cur - start) / 1000} seconds`);
    let result;
    if (response.ok()) {
        try {
            await page.evaluateHandle('document.fonts.ready');
            start = cur;
            cur = (new Date).getTime();
            console.log(`⏲  document.fonts.ready took ${(cur - start) / 1000} seconds`);
            const card = await page.$('.card');
            start = cur;
            cur = (new Date).getTime();
            console.log(`⏲  finding .card took ${(cur - start) / 1000} seconds`);
            result = await card.screenshot();
            start = cur;
            cur = (new Date).getTime();
            console.log(`⏲  screenshot took ${(cur - start) / 1000} seconds`);
        } catch (e) {
            console.log(`💥 Something broke [${e}]`);
            throw new PageError(`${e}`);
        }
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

const scrapeGuild = async (client, guild, callback) => {
    try {
        client.guildQueue.push({
            guild,
            callback,
        });
        const response = await client.axios.get(`/api/guild/scrape/${guild}`, {
            httpsAgent: new https.Agent({
                rejectUnauthorized: false,
            })
        });

        return response;
    } catch (error) {
        return { error };
    }
};

const reallyDoSnap = async (URL, channel, name, embed, message = null) => {
    const buffer = await snapshot(URL);
    name = name || '🍺';

    if (embed) {
        await channel.send({
            files: [new Attachment(buffer, `${name}.png`)],
            embed: {
                title : `${name.replace(/_/g, ' ')}`,
                description: message,
                color: 0xfce34d,
                url: URL,
                thumbnail: {
                    url: 'https://schwartz.hillman.me/images/Logo@2x.png',
                },
                image: {
                    url: `attachment://${name}.png`,
                },
            },
        });
    } else {
        await channel.send(new Attachment(buffer, `${name}.png`));
        await channel.send(`URL: ${URL}`);
    }
};

const snapDM = async (code, urlSlug, channel, client, urlSuffix, asEmbed, message) => {
    const URL = `${client.config.client.base_url}/${urlSlug}/${code}${urlSuffix || ''}`;
    try {
        await reallyDoSnap(URL, channel, code, asEmbed, message);
    } catch (e) {
        if (e instanceof PageError) {
            setTimeout(() => snapDM(code, urlSlug, channel, client, urlSuffix, asEmbed, message), 500);
            return;
        }
        if (!((e.response && e.response.status == 422) || e.message == 422)) {
            client.logger.error(`Bad bad response ${e.message} from (${URL})`);
        } else {
            client.logger.error(`Fetching page to snapshot failed with status ${e.message} (${URL})`);
        }
        client.logger.error(`Error getting snapshot for ${urlSlug} -> ${code}`);
    }
};

const failed = [];
const snapReplyForAllyCodes = async (codes, urlSlug, message, client, urlSuffix, asEmbed) => {
    if (!Array.isArray(codes)) {
        codes = [codes];
    }

    for (const code of codes) {
        const failIndex = failed.indexOf(code);
        const URL = `${client.config.client.base_url}/${urlSlug}/${code}${urlSuffix || ''}`;
        try {
            await reallyDoSnap(URL, message.channel, code, asEmbed);

            if (failIndex > -1) {
                failed.slice(failIndex, 1);
            }
        } catch (e) {
            if (e instanceof PageError) {
                setTimeout(() => snapReplyForAllyCodes(codes, urlSlug, message, client, urlSuffix, asEmbed), 500);
                return;
            }
            if (!((e.response && e.response.status !== 422) && e.message != 422)) {
                client.logger.error(`Bad bad response ${e.message} from (${URL})`);
            }
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

const snapReplyForGuilds = async (guild1, guild2, urlSlug, message, client, asEmbed, urlSuffix) => {
    const combinedID = `${guild1}_vs_${guild2}`;
    const failIndex = failed.indexOf(combinedID);
    const URL = `${client.config.client.base_url}/${urlSlug}/${guild1}/${guild2}${urlSuffix || ''}`;
    try {
        await reallyDoSnap(URL, message.channel, combinedID, asEmbed);

        if (failIndex > -1) {
            failed.slice(failIndex, 1);
        }
    } catch (e) {
        if (e instanceof PageError) {
            setTimeout(() => snapReplyForGuilds(guild1, guild2, urlSlug, message, client, asEmbed, urlSuffix), 500);
            return;
        }
        if (!((e.response && e.response.status != 422) && e.message != 422)) {
            client.logger.error(`Bad bad response ${e.message} from (${URL})`);
        }
        client.logger.error(`Fetching page to snapshot failed with status ${e.message} (${URL})`);
        if (failIndex > -1) {
            failed.slice(failIndex, 1);
            await message.reply(`Querying guilds ${guild1} + ${guild2} has failed too many times. Please manually scrape this user and try again`);
            return;
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

                    await snapReplyForGuilds(guild1, guild2, `compare`, message, client, asEmbed, urlSuffix);
                } else {
                    await scrapeMessage.react('🍺');
                }
            });
        });
    }
};

const snapReplyForCompare = async (codes, urlSlug, message, client, queryParameter, nameOverride, asEmbed) => {
    if (!Array.isArray(codes)) {
        codes = [codes];
    }

    const codeList = codes.join(',');
    const failIndex = failed.indexOf(codeList);
    const URL = `${client.config.client.base_url}/${urlSlug}?${queryParameter}=${codeList}`;
    try {
        await reallyDoSnap(URL, message.channel, nameOverride || codes.join('_vs_'), asEmbed);

        if (failIndex > -1) {
            failed.slice(failIndex, 1);
        }
    } catch (e) {
        if (e instanceof PageError) {
            setTimeout(() => snapReplyForCompare(codes, urlSlug, message, client, queryParameter, nameOverride, asEmbed), 500);
            return;
        }
        if (!((e.response && e.response.status != 422) && e.message != 422)) {
            client.logger.error(`Bad bad response ${e.message} from (${URL})`);
        }
        client.logger.error(`Fetching page to snapshot failed with status "${e.message}" (${URL})`);
        if (failIndex > -1) {
            failed.slice(failIndex, 1);
            await message.reply(`Querying has failed too many times. Please manually scrape these users and try again`);
            return;
        }
        failed.push(codeList);
        client.logger.error(`Error getting snapshot for ${urlSlug} -> ${codeList}, trying to query`);
        const scrapeMessage = await message.channel.send(`At least one of the ally codes needs to be scraped first…`);
        await scrapeMessage.react('⏳');
        let completeCount = 0;

        codes.forEach(async code => {
            await scrapeUser(client, code, async () => {
                completeCount += 1;

                if (codes.length == completeCount) {
                    await scrapeMessage.react('🎉');
                    await scrapeMessage.delete();

                    await snapReplyForCompare(codes, urlSlug, message, client, queryParameter, nameOverride, asEmbed);
                } else {
                    await scrapeMessage.react('🍺');
                }
            });
        });
    }
};

exports.snapshot = snapshot;
exports.snapReplyForAllyCodes = snapReplyForAllyCodes;
exports.snapReplyForCompare = snapReplyForCompare;
exports.snapReplyForGuilds = snapReplyForGuilds;
exports.scrapeGuild = scrapeGuild;
exports.scrapeUser = scrapeUser;
exports.snapDM = snapDM;
exports.initSnapshot = init;