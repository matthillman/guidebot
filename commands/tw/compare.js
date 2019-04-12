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
        await waitingMessage.delete();
    }


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

    let msg = `= ${Object.keys(response).join(' vs ')} =\n`;
    const g1Key = Object.keys(response).first();
    const g2Key = Object.keys(response).last();
    const winner = {};
    const charKeys = response.char_keys;
    const charNames = response.char_names;
    ['gp', 'zetas', 'gear_12', 'gear_11', ...charKeys].forEach((key) => {
        winner[key] = +response[g1Key][key] > +response[g2Key][key] ? g1Key : g2Key;
    });
    winner['gear_11_12'] = (+response[g1Key]['gear_12'] + +response[g1Key]['gear_11']) > (+response[g2Key]['gear_12'] + +response[g2Key]['gear_11']) ? g1Key : g2Key;

    Object.keys(response).forEach((key) => {
        msg += `\n== ${key} ==\n`;
        let decorator = winner.gp == key ? '**' : '';
        msg += `GP          :: ${decorator}${response[key].gp}${decorator}\n`;
        decorator = winner.zetas == key ? '**' : '';
        msg += `Zetas       :: ${decorator}${response[key].zetas}${decorator}\n`;
        decorator = winner.gear_12 == key ? '**' : '';
        msg += `Gear 12     :: ${decorator}${response[key].gear_12}${decorator}\n`;
        decorator = winner.gear_11 == key ? '**' : '';
        msg += `Gear 11     :: ${decorator}${response[key].gear_11}${decorator}\n`;
        decorator = winner.gear_11_12 == key ? '**' : '';
        msg += `G 11+12     :: ${decorator}${response[key].gear_12 + response[key].gear_11}${decorator}\n`;

        charKeys.forEach(key => {
            decorator = winner[key] == key ? '**' : '';
            msg += `${charNames[key]}       :: ${decorator}${response[key].traya} (${response[key][`${key}_12`]} G12)${decorator}\n`;
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