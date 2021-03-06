const https = require('https');
const { snapReplyForAllyCodes } = require('../util/snapshot');
const { getUserFromMention, getAllyCodeForUser } = require('../util/helpers');

exports.run = async (client, message, [allyCode, ...charSearch]) => {
    const firstArgAppearsToBeAllyCode = /^[0-9]{9}$/.test(allyCode) || /^<@.+>$/.test(allyCode) || allyCode === 'me';

    if (charSearch.length === 0) {
        // assuming that if we only get 1 argument it's a character name
        charSearch = [allyCode];
        allyCode = null;
    } else if (!firstArgAppearsToBeAllyCode) {
        // Arg doesn't appear to be an ally code, we will assume they mean "me" below
        charSearch.unshift(allyCode);
        allyCode = null;
    }

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
    }

    if (realAllyCode === null) {
        await message.react('🤔');
        return message.reply(`${allyCode} does not appear to be a valid ally code`);
    }
    await message.react('⏳');

    const search = charSearch.join(' ');

    if (!Array.isArray(realAllyCode)) {
        realAllyCode = [realAllyCode];
    }

    for (const code of realAllyCode) {
        try {
            const charResponse = await client.axios.get(`/member-unit-search/${code}?search=${encodeURIComponent(search)}`, {
                httpsAgent: new https.Agent({
                    rejectUnauthorized: false
                })
            });
            const character = charResponse.data;
            await snapReplyForAllyCodes(code, `member`, message, client, `/character/${character.unit_name}`);
        } catch (e) {
            client.logger.error(`Character search failed with status ${e.message} [${code}] (${search})`);
            await message.react('🥃');
            return await message.reply(`Error finding **${search}** for **${code}**, please check that this search returns a valid, unlocked unit`);
        }

    }
    await message.react('🎉');
    return;
};

exports.conf = {
    enabled: true,
    guildOnly: false,
    aliases: ['u'],
    permLevel: "User"
};

exports.help = {
    name: "unit",
    category: "SWGOH",
    description: "Shows a user's character",
    usage: "unit [ally code/mention/nothing] [unit]"
};
