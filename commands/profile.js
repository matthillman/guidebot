const https = require('https');
const { snapReplyForAllyCodes } = require('../util/snapshot');
const { getUserFromMention, getAllyCodeForUser } = require('../util/helpers');

exports.run = async (client, message, [allyCode]) => {
    if (allyCode) {
        allyCode = allyCode.replace(/\-/g, '');
    }

    let realAllyCode = null;
    if (/^[0-9]{9}$/.test(allyCode)) {
        realAllyCode = allyCode;
    } else if (/^<@.+>$/.test(allyCode) || allyCode === 'me' || !allyCode) {
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

    await snapReplyForAllyCodes(realAllyCode, 'member', message, client);

    await message.react('🎉');
    return;
};

exports.conf = {
    enabled: true,
    guildOnly: false,
    aliases: ['pr'],
    permLevel: "User"
};

exports.help = {
    name: "profile",
    category: "SWGOH",
    description: "Shows a profile for the user. Pass ally code, 'me' or a mention",
    usage: "profile [ally code?]"
};
