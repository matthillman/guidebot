const https = require('https');
const { getUserFromMention } = require('../util/helpers');

exports.run = async (client, message, [mention]) => {
    const user = (!mention || mention === 'me') ? message.author : await getUserFromMention(client, mention);
    if (!user) {
        await message.react('🤔');
        return message.reply(`Somehow did not find a user from that message?`);
    }

    await message.react('⏳');
    const response = await client.axios.get(`/api/whois/${user.id}`, {
        httpsAgent: new https.Agent({
            rejectUnauthorized: false
        })
    });

    const hasThisServerExplicitly = message.guild && !!response.data.find(d => d.server_id == message.guild.id);

    await message.react('🎉');

    const fields = [];

    for (const code of response.data) {
        const decoration = ((message.guild && code.server_id == message.guild.id) || (code.server_id === null && !hasThisServerExplicitly)) ? `\n🏵 Used here` : '';

        fields.push({
            name: `Entry ${response.data.indexOf(code) + 1}`,
            value: `Ally Code ${code.ally_code}\nServer: ${code.server_id || 'Default'}${decoration}`
        });
    }

    await message.channel.send({embed: {
        title: `Known ally codes for @${user.username}#${user.discriminator}`,
        fields,
    }});

    return;
};

exports.conf = {
    enabled: true,
    guildOnly: false,
    aliases: ['whoami'],
    permLevel: "User"
};

exports.help = {
    name: "whois",
    category: "SWGOH",
    description: "See all of the registered ally codes",
    usage: "whois [discord mention]"
};
