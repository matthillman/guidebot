
const puppeteer = require('puppeteer');
const { Attachment } = require('discord.js');

const snapshot = async (url, authHeader = '') => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800, deviceScaleFactor: 2 });
    await page.setExtraHTTPHeaders({
        schwartz: 'bot',
        Authorization: authHeader,
    });
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

const reallyDoSnap = async (URL, message, name, authHeader, embed) => {
    const buffer = await snapshot(URL, authHeader);
    name = name || '🍺';

    if (embed) {
        await message.channel.send({
            files: [new Attachment(buffer, `${name}.png`)],
            embed: {
                title : `${name.replace(/_/g, ' ')}`,
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
        await message.channel.send(new Attachment(buffer, `${name}.png`));
        await message.channel.send(`URL: ${URL}`);
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
            await reallyDoSnap(URL, message, code, client.axios.defaults.headers.common['Authorization'], asEmbed);

            if (failIndex > -1) {
                failed.slice(failIndex, 1);
            }
        } catch (e) {
            if (!e.response || e.response.status != 422) {
                client.logger.error(`Bad bad response ${e.message} from (${URL})`);
                await message.reply(`Something bad happened 🧨💥`);
                continue;
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
        await reallyDoSnap(URL, message, combinedID, client.axios.defaults.headers.common['Authorization'], asEmbed);

        if (failIndex > -1) {
            failed.slice(failIndex, 1);
        }
    } catch (e) {
        if (!e.response || e.response.status != 422) {
            client.logger.error(`Bad bad response ${e.message} from (${URL})`);
            await message.reply(`Something bad happened 🧨💥`);
            return;
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

const snapReplyForCompare = async (codes, urlSlug, message, client, asEmbed, queryParameter, nameOverride) => {
    if (!Array.isArray(codes)) {
        codes = [codes];
    }

    const codeList = codes.join(',');
    const failIndex = failed.indexOf(codeList);
    const URL = `${client.config.client.base_url}/${urlSlug}?${queryParameter}=${codeList}`;
    try {
        await reallyDoSnap(URL, message, nameOverride || codes.join('_vs_'), client.axios.defaults.headers.common['Authorization'], asEmbed);

        if (failIndex > -1) {
            failed.slice(failIndex, 1);
        }
    } catch (e) {
        if (!e.response || e.response.status != 422) {
            client.logger.error(`Bad bad response ${e.message} from (${URL})`);
            await message.reply(`Something bad happened 🧨💥`);
            return;;
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

                    await snapReplyForCompare(codes, urlSlug, message, client, asEmbed, queryParameter, nameOverride);
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