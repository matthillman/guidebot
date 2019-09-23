const https = require('https');
const OPEN_EMPHASIS = '*';
const CLOSE_EMPHASIS = '*';
const formatGP = (gp) => {
    return `${(gp / 1000000).toFixed(1)}M`;
};

const docBlock = (lines) => {
    let value = `\`\`\`asciidoc\n`;
    value += lines.join('\n');
    value +=`\`\`\``;

    return value;
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
    const charNames = response.char_names;
    const modKeys = response.mod_keys;

    const winner = {};
	const longest = ['Members', 'GP', 'Zetas', 'Gear 13', 'Gear 12', 'Gear 11', 'G 11+'].reduce((long, str) => Math.max(long, str.length), 0);
	client.logger.log(`Longest is ${longest}`);
    ['gp', 'zetas', 'gear_13', 'gear_12', 'gear_11'].forEach(key => {
        winner[key] = +response[g1Key][key] > +response[g2Key][key] ? g1Key : g2Key;
    });
    Object.keys(modKeys).forEach(key => {
        winner[key] = +response[g1Key].mods[key] > +response[g2Key].mods[key] ? g1Key : g2Key;
    });
    winner['gear_11_12'] = (+response[g1Key]['gear_13'] + +response[g1Key]['gear_12'] + +response[g1Key]['gear_11']) > (+response[g2Key]['gear_13'] + +response[g2Key]['gear_12'] + +response[g2Key]['gear_11']) ? g1Key : g2Key;

    const gpFields = [g1Key, g2Key].map((key) => {
        const name = `${key}`;
        const value = docBlock([
            `Members${" ".repeat(longest - "Members".length)} :: ${response[key].member_count}`,
            `GP${" ".repeat(longest - "GP".length)} :: ${winner.gp == key ? OPEN_EMPHASIS : ''}${formatGP(response[key].gp)}${winner.gp == key ? CLOSE_EMPHASIS : ''}`,
            `Zetas${" ".repeat(longest - "Zetas".length)} :: ${winner.zetas == key ? OPEN_EMPHASIS : ''}${response[key].zetas}${winner.zetas == key ? CLOSE_EMPHASIS : ''}`,
            `Gear 13${" ".repeat(longest - "Gear 13".length)} :: ${winner.gear_13 == key ? OPEN_EMPHASIS : ''}${response[key].gear_13}${winner.gear_13 == key ? CLOSE_EMPHASIS : ''}`,
            `Gear 12${" ".repeat(longest - "Gear 12".length)} :: ${winner.gear_12 == key ? OPEN_EMPHASIS : ''}${response[key].gear_12}${winner.gear_12 == key ? CLOSE_EMPHASIS : ''}`,
            `Gear 11${" ".repeat(longest - "Gear 11".length)} :: ${winner.gear_11 == key ? OPEN_EMPHASIS : ''}${response[key].gear_11}${winner.gear_11 == key ? CLOSE_EMPHASIS : ''}`,
            `G 11+${" ".repeat(longest - "G 11+".length)} :: ${winner.gear_11_12 == key ? OPEN_EMPHASIS : ''}${response[key].gear_13 + response[key].gear_12 + response[key].gear_11}${winner.gear_11_12 == key ? CLOSE_EMPHASIS : ''}`,
        ]);

        return { name, value, inline: true };
    });
	const longestMod = Object.values(modKeys).reduce((long, str) => Math.max(long, str.length), 0);
    const modFields = [g1Key, g2Key].map((key) => {
        const name = `${key}`;
        const guildMods = response[key].mods;
        const value = docBlock(
            Object.keys(modKeys).map(mod => {
                return `${modKeys[mod]}${" ".repeat(longestMod - modKeys[mod].length)} :: ${winner[mod] == key ? OPEN_EMPHASIS : ''}${guildMods[mod]}${winner[mod] == key ? CLOSE_EMPHASIS : ''}`;
            })
        );

        return { name, value, inline: true };
    });

	const longestChar = Object.values(charNames).reduce((long, str) => Math.max(long, str.length), 0);
    const charFields = [g1Key, g2Key].map((key) => {
        const name = `${key}`;
        const value = docBlock(
            charKeys.map(char => {
                return `${charNames[char]}${" ".repeat(longestChar - charNames[char].length)} :: ${response[key][char]} (${response[key][`${char}_13`]} G13, ${response[key][`${char}_12`]} G12)`;
            })
        );

        return { name, value, inline: true };
    });

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
            { value: docBlock('= Mods ='), name: '\u200b' },
            modFields,
            { value:  docBlock('= Characters ='), name: '\u200b' },
            charFields
        ]),
        timestamp: new Date(),
        footer: {
            text: 'May the Schwartz be with you',
            icon_url: 'https://schwartz.hillman.me/images/schwartz.jpg',
        },
    }});
};

exports.run = doQuery;

exports.conf = {
    enabled: true,
    guildOnly: true,
    aliases: ['vs'],
    permLevel: "User"
};

exports.help = {
    name: "compare",
    category: "SWGOH",
    description: "Compares the high level stats of two guilds. Note guild\_id is the id from the URL in their swogh profile.",
    usage: "compare [guild_id 1] [guild_id 2]"
};