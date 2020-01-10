const https = require('https');
const { snapReplyForAllyCodes } = require('../util/snapshot');
const { getUserFromMention } = require('../util/helpers');

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
            const response = await client.axios.get(`/api/registration/${user.id}`, {
                httpsAgent: new https.Agent({
                    rejectUnauthorized: false
                })
            });
            realAllyCode = response.data.get.filter(obj => obj.discordId === user.id).map(obj => obj.allyCode);
            client.logger.log(`Got ally code ${JSON.stringify(realAllyCode)} from user ${user.id}`);

            if (!realAllyCode.length) {
                await message.react('🤔');
                return message.reply(`"${user.username}" does not have an associated ally code. Register one with
\`\`\`
${message.settings.prefix}register {ally code}
\`\`\``);
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
