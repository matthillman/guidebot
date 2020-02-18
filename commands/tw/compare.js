const { snapReplyForGuilds, scrapeGuild } = require('../../util/snapshot');

exports.run = async (client, message, [scrape, guild1, guild2]) => {
    const doScrape = scrape == "--scrape" || scrape == "-s" || scrape == "—scrape" || scrape == "-scrape";

    if (!doScrape) {
        guild2 = guild1;
        guild1 = scrape;
    }

    if (guild1) {
        guild1 = guild1.replace(/\-/g, '');
    }

    if (guild2) {
        guild2 = guild2.replace(/\-/g, '');
    }

    if (!(/^[0-9]{1,9}$/.test(guild1))) {
        await message.react('🤔');
        return message.reply(`${guild1} does not appear to be a valid guild id or ally code`);
    }
    if (!(/^[0-9]{1,9}$/.test(guild2))) {
        await message.react('🤔');
        return message.reply(`${guild2} does not appear to be a valid guild id or ally code`);
    }

    await message.react('⏳');

    if (doScrape) {
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
                    await scrapeMessage.react('🍺');
                }
            });
        });
    } else {
        await snapReplyForGuilds(guild1, guild2, `compare`, message, client);
    }

    await message.react('🎉');
    return;
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
    description: "Compares two guilds",
    usage: "compare [guild id or ally code] [guild id or ally code]"
};
