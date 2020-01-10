const { snapshot } = require('../util/snapshot');
const { Attachment } = require('discord.js');

exports.run = async (client, message) => {
    await message.react('⏳');

    const URL = `${client.config.client.base_url}/poster`;
    try {
        const buffer = await snapshot(URL);
        await message.channel.send(new Attachment(buffer, `TheSchwartzies.png`));

        await message.react('🎉');
    } catch (e) {
        await message.reply('🤔 Something really bad happened.');
    }
};

exports.conf = {
    enabled: true,
    guildOnly: false,
    aliases: [],
    permLevel: "User"
};

exports.help = {
    name: "poster",
    category: "SWGOH",
    description: "Shows the Schwartz recruiting poster",
    usage: "poster"
};
