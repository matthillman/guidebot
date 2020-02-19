const https = require('https');
const { snapReplyForAllyCodes } = require('../util/snapshot');
const { getUserFromMention } = require('../util/helpers');

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
            const response = await client.axios.get(`/api/registration/${user.id}`, {
                httpsAgent: new https.Agent({
                    rejectUnauthorized: false
                })
            });
            realAllyCode = response.data.get.filter(obj => obj.discordId === user.id).map(obj => obj.allyCode);
            client.logger.log(`Got ally code ${JSON.stringify(realAllyCode)} from user ${user.id}`);

            if (!realAllyCode.length) {
                await message.react('🤔');
                return await message.reply(`**${user.username}** does not have an associated ally code. Please register one 😁`);
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
            await snapReplyForAllyCodes(character.id, 'member/mods', message, client);
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
    aliases: [],
    permLevel: "User"
};

exports.help = {
    name: "mods",
    category: "SWGOH",
    description: "Shows mods for a user's character",
    usage: "mods [ally code/mention/nothing] [unit]"
};
