const { snapshot, snapReplyForAllyCodes } = require('../util/snapshot');
const { Attachment } = require('discord.js');
const { getUserFromMention, getAllyCodeForUser } = require('../util/helpers');

exports.run = async (client, message, [allyCode]) => {
    if (allyCode) {
        allyCode = allyCode.replace(/\-/g, '');
    }

    let realAllyCode = null;
    if (/^[0-9]{9}$/.test(allyCode)) {
        realAllyCode = allyCode;
    } else if (/^<@.+>$/.test(allyCode) || allyCode === 'me') {
        const user = (!allyCode || allyCode === 'me') ? message.author : await getUserFromMention(client, allyCode);
        if (user) {
            realAllyCode = await getAllyCodeForUser(client, user, message);
            if (!realAllyCode) {
                return;
            }
        }
    } else if (allyCode) {
        await message.react('🤔');
        return message.reply(`${allyCode} does not appear to be a valid ally code`);
    }

    await message.react('⏳');

    if (realAllyCode === null) {
        try {
            const URL = `${client.config.client.base_url}/relics`;
            const buffer = await snapshot(URL, client.axios.defaults.headers.common['Authorization']);
            await message.channel.send(new Attachment(buffer, `relics.png`));
        } catch (e) {
            await message.reply(`Something really bad happened 🍺`);
        }
    } else {
        await snapReplyForAllyCodes(realAllyCode, 'relics', message, client);
    }

    await message.react('🎉');
    return;
};

exports.conf = {
    enabled: true,
    guildOnly: false,
    aliases: ['r'],
    permLevel: "User"
};

exports.help = {
    name: "relic",
    category: "SWGOH",
    description: "Shows relic recommendations or compares a user's roster to the recommendations. If no ally code (or 'me') is given, the recommendation list is returned",
    usage: "relic [ally code?]"
};
