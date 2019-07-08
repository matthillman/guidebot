const https = require('https');
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
    let msg = `= ${[g1Key, g2Key].join(' vs ')} =\n`;
    const winner = {};
    const charKeys = response.char_keys;
    const charNames = response.char_names;
	const longest = ['GP', 'Zetas', 'Gear 13', 'Gear 12', 'Gear 11', 'G 11+', ...Object.values(charNames)].reduce((long, str) => Math.max(long, str.length), 0);
	client.logger.log(`Longest is ${longest}`);
    ['gp', 'zetas', 'gear_13', 'gear_12', 'gear_11', ...charKeys].forEach((key) => {
        winner[key] = +response[g1Key][key] > +response[g2Key][key] ? g1Key : g2Key;
    });
    winner['gear_11_12'] = (+response[g1Key]['gear_13'] + +response[g1Key]['gear_12'] + +response[g1Key]['gear_11']) > (+response[g2Key]['gear_13'] + +response[g2Key]['gear_12'] + +response[g2Key]['gear_11']) ? g1Key : g2Key;

    [g1Key, g2Key].forEach((key) => {
        msg += `\n== ${key} ==\n`;
        let decorator = winner.gp == key ? '**' : '';
        msg += `GP${" ".repeat(longest - "GP".length)} :: ${decorator}${response[key].gp}${decorator}\n`;
        decorator = winner.zetas == key ? '**' : '';
        msg += `Zetas${" ".repeat(longest - "Zetas".length)} :: ${decorator}${response[key].zetas}${decorator}\n`;
        decorator = winner.gear_13 == key ? '**' : '';
        msg += `Gear 13${" ".repeat(longest - "Gear 13".length)} :: ${decorator}${response[key].gear_13}${decorator}\n`;
        decorator = winner.gear_12 == key ? '**' : '';
        msg += `Gear 12${" ".repeat(longest - "Gear 12".length)} :: ${decorator}${response[key].gear_12}${decorator}\n`;
        decorator = winner.gear_11 == key ? '**' : '';
        msg += `Gear 11${" ".repeat(longest - "Gear 11".length)} :: ${decorator}${response[key].gear_11}${decorator}\n`;
        decorator = winner.gear_11_12 == key ? '**' : '';
        msg += `G 11+${" ".repeat(longest - "G 11+".length)} :: ${decorator}${response[key].gear_12 + response[key].gear_11}${decorator}\n`;

        charKeys.forEach(char => {
            decorator = winner[key] == key ? '**' : '';
            msg += `${charNames[char]}${" ".repeat(longest - charNames[char].length)} :: ${decorator}${response[key][char]} (${response[key][`${char}_13`]} G13, ${response[key][`${char}_12`]} G12)${decorator}\n`;
        });
    });

    message.channel.send(msg, {
        code: 'asciidoc'
    });
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