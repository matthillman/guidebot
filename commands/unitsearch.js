const https = require('https');

exports.run = async (client, message, charSearch) => {

    await message.react('⏳');

    const search = charSearch.join(' ');

    try {
        const response = await client.axios.get(`/unit-search?search=${encodeURIComponent(search)}`, {
            httpsAgent: new https.Agent({
                rejectUnauthorized: false
            })
        });

        let output = `= Units Search Results =\n`;

        for (const unit of response.data.data) {
            output += `\u200b
ID: ${unit.base_id}
NAME: ${unit.name}
DESCRIPTION: ${unit.description}\n`;
        }

        if (response.next_page_url) {
            output += `
            First ${response.per_page} of ${response.total} matching units; use a more specific search to narrow the results\n`;
        }

        await message.react('🎉');

        await message.channel.send(output, {
            code: 'asciidoc',
            split: {
                char: "\u200b"
            }
        });
    } catch (e) {
        client.logger.error(`Unit search failed with status ${e.message} (${search})`);
        await message.react('🥃');
        return await message.reply(`Error finding a unit with the search string**${search}**, please check that this is really a unit`);
    }
    return;
};

exports.conf = {
    enabled: true,
    guildOnly: false,
    aliases: ['us', 'units'],
    permLevel: "User"
};

exports.help = {
    name: "unitsearch",
    category: "SWGOH",
    description: "Shows all unit search results for a given query",
    usage: "unitsearch [search string]"
};
