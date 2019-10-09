const https = require('https');
const { initImageFunctions, generateImage } = require('../../util/image-functions');
const { Attachment } = require('discord.js');

const OPEN_EMPHASIS = '*';
const CLOSE_EMPHASIS = '*';

const formatGP = (gp) => {
    return `${(gp / 1000000).toFixed(1)}M`;
};

const docBlock = (lines, lang) => {
    let value = `\`\`\`${lang || 'asciidoc'}\n`;
    value += Array.isArray(lines) ? [].concat(...lines).join('\n') : lines;
    value +=`\`\`\``;

    return value;
};

const decorate = (key, value, padding, isWinner) => {
    return `${key}${' '.repeat(padding - key.length)} :: ${isWinner ? OPEN_EMPHASIS : '' }${value}${isWinner ? CLOSE_EMPHASIS : '' }`;
};

const queryGuilds = async (client, guild1, guild2) => {
    try {
        const response = await client.axios.get(`/api/tw/compare/${guild1}/${guild2}`, {
            httpsAgent: new https.Agent({
                rejectUnauthorized: false
            })
        });
        return response.data;
    } catch (error) {
        return {
            error: error
        };
    }
};

const scrapeGuild = async (client, id, callback) => {
    try {
        client.guildQueue.push({
            id,
            callback,
        });
        const response = await client.axios.get(`/api/guild/scrape/${id}`, {
            httpsAgent: new https.Agent({
                rejectUnauthorized: false,
            })
        });

        return response;
    } catch (error) {
        return { error };
    }
};

const failed = [];

const doQuery = async (client, message, args) => {
    const waitingMessage = await message.channel.send("Querying " + args.join(' vs '));
    await waitingMessage.react('⏳');

    let response;
    let parsedArgs;

    if (args.first() == "--scrape") {
        parsedArgs = [args[1], args[2]];
        response = {
            error: true,
            both: true,
        };
    } else {
        response = await queryGuilds(client, args.first(), args.last());
        parsedArgs = args;

        await waitingMessage.react('🎉');
    }

    await waitingMessage.delete();

    if (response.error) {
        if (response[parsedArgs.first()] || response[parsedArgs.last()] || response.both) {
            const needsScrape = response.both ? parsedArgs : response[parsedArgs.first()] ? [parsedArgs.first()] : [parsedArgs.last()];

            await needsScrape.forEach(async (scrape, index) => {

                if (failed.indexOf(scrape) != -1) {
                    return await message.reply(`Querying guild ${scrape} has failed too many times. Please manually scrape this guild and try again`);
                }

                failed.push(scrape);
                const scrapeMessage = await message.channel.send(`Guild ${scrape} needs to be scraped first…`);
                await scrapeMessage.react('⏳');
                await scrapeGuild(client, scrape, async () => {
                    await scrapeMessage.react('🎉');
                    await scrapeMessage.delete();

                    if (index == needsScrape.length - 1) {
                        return doQuery(client, message, parsedArgs);
                    }
                });
            });

            return;
        } else {
            client.logger.log(Object.values(response));
            message.reply(response.error);
            return;
        }
    }

    failed.remove(args.first());
    failed.remove(args.last());

    const g1Key = Object.keys(response).first();
    const g2Key = Object.keys(response)[1];
    const msg = `= ${[g1Key, g2Key].join(' vs ')} =`;

    const charKeys = response.char_keys;
    // const charNames = response.char_names;
    const modKeys = response.mod_keys;

    const winner = {};

    ['gp', 'zetas', 'gear_13', 'gear_12', 'gear_11', 'relic_7', 'relic_6', 'relic_5'].forEach(key => {
        winner[key] = +response[g1Key][key] > +response[g2Key][key] ? g1Key : g2Key;
    });
    Object.keys(modKeys).forEach(key => {
        winner[key] = +response[g1Key].mods[key] > +response[g2Key].mods[key] ? g1Key : g2Key;
    });
    winner['gear_11_12'] = (+response[g1Key]['gear_13'] + +response[g1Key]['gear_12'] + +response[g1Key]['gear_11']) > (+response[g2Key]['gear_13'] + +response[g2Key]['gear_12'] + +response[g2Key]['gear_11']) ? g1Key : g2Key;

    const longest = ['Members', 'GP', 'Zetas'].reduce((long, str) => Math.max(long, str.length), 0);
    const gpFields = [g1Key, g2Key].map((key) => {
        const name = `${key}`;
        const value = docBlock([
            decorate('Members', response[key].member_count, longest),
            decorate('GP', formatGP(response[key].gp), longest, winner.gp == key),
            decorate('Zetas', response[key].zetas, longest, winner.zetas == key),
        ]);

        return { name, value, inline: true };
    });

    const longestGear = ['Gear 13', 'Gear 12', 'Gear 11', 'G 11+', 'Relic 7', 'Relic 6', 'Relic 5'].reduce((long, str) => Math.max(long, str.length), 0);
    const gearFields = [g1Key, g2Key].map(key => {
        const name =`${key}`;
        const value = docBlock([
            decorate('Gear 13', response[key].gear_13, longestGear, winner.gear_13 == key),
            decorate('Gear 12', response[key].gear_12, longestGear, winner.gear_12 == key),
            decorate('Gear 11', response[key].gear_11, longestGear, winner.gear_11 == key),
            decorate('G 11+', response[key].gear_13 + response[key].gear_12 + response[key].gear_11, longestGear, winner.gear_11_12 == key),
            decorate('Relic 7', response[key].relic_7, longestGear, winner.relic_7 == key),
            decorate('Relic 6', response[key].relic_6, longestGear, winner.relic_6 == key),
            decorate('Relic 5', response[key].relic_5, longestGear, winner.relic_5 == key),
        ]);

        return { name, value, inline: true };
    });

	const longestMod = Object.values(modKeys).reduce((long, str) => Math.max(long, str.length), 0);
    const modFields = [g1Key, g2Key].map((key) => {
        const name = `${key}`;
        const guildMods = response[key].mods;
        const value = docBlock(
            Object.keys(modKeys).map(mod => decorate(modKeys[mod], guildMods[mod], longestMod, winner[mod] == key))
        );

        return { name, value, inline: true };
    });

    const guilds = [g1Key, g2Key].map(key => {
        const r = {};
        charKeys.forEach(char => {
            r[char] = {
                base_id: `${char}`,
                gear_11: response[key][`${char}_11`],
                gear_12: response[key][`${char}_12`],
                gear_13: response[key][`${char}_13`],
                relic_total: response[key][`${char}_r_total`],
                relic_5: response[key][`${char}_r5`],
                relic_6: response[key][`${char}_r6`],
                relic_7: response[key][`${char}_r7`],
            };
        });
        return r;
    });

    const charImageCanvas = await generateImage(guilds, g1Key, g2Key);
    const charImage = new Attachment(charImageCanvas.toBuffer(), `compare.png`);

    await message.channel.send({embed: {
        author: { name: msg },
        color: 0xfce34d,
        url: 'https://schwartz.hillman.me/home',
        thumbnail: {
            url: 'https://schwartz.hillman.me/images/Logo@2x.png',
        },
        description: `Fuckin' kill 'em`,
        fields: [].concat.apply([], [
            gpFields,
            { value: docBlock('= Gear ='), name: '\u200b' },
            gearFields,
            { value: docBlock('= Mods ='), name: '\u200b' },
            modFields,
        ]),
        timestamp: new Date(),
        footer: {
            text: 'May the Schwartz be with you',
            icon_url: 'https://schwartz.hillman.me/images/schwartz.jpg',
        },
    }});
    await message.channel.send(charImage);
};

exports.run = doQuery;

exports.init = async (client) => {
    await initImageFunctions(client);
};

exports.conf = {
    enabled: true,
    guildOnly: false,
    aliases: ['vs'],
    permLevel: "User"
};

exports.help = {
    name: "compare",
    category: "SWGOH",
    description: "Compares the high level stats of two guilds. Note guild\_id is the id from the URL in their swogh profile.",
    usage: "compare [guild_id 1] [guild_id 2]"
};