const https = require('https');
const { snapReplyForAllyCodes } = require('../util/snapshot');
const { getUserFromMention } = require('../util/helpers');

const teamList = [
    {label: 'General Skywalker', value: 'gs'},
    {label: 'LS Geo TB', value: 'lsgeo'},
    {label: 'Geo TB', value: 'geo'},
    {label: 'TW', value: 'tw'},
    {label: 'Legendaries', value: 'legendary'},
    {label: 'Darth Malak', value: 'malak'},
    {label: 'Hoth TB', value: 'tb'},
    {label: 'STR', value: 'str'},
];

exports.run = async (client, message, [team, allyCode]) => {
    if (!team) {
        return message.reply(`\`\`\`asciidoc
The following teams are available:
${teamList.reduce((prev, team) => `${prev}${team.value}${' '.repeat(10 - team.value.length)} :: ${team.label}\n`, '')}
\`\`\``);
    }

    team = team.toLowerCase();

    if (!teamList.map(team => team.value).includes(team) || team !== 'mods') {
        return message.reply(`${team} is not a valid team key`);
    }

    if (team === 'mods') {
        team = 'tw_mods';
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
                return message.reply(`"${user.username}" does not have an associated ally code. Register one with
\`\`\`
${message.settings.prefix}register {ally code}
\`\`\``);
            }
        }
    }

    if (realAllyCode === null) {
        await message.react('🤔');
        return message.reply(`${allyCode} does not appear to be a valid ally code`);
    }
    await message.react('⏳');

    await snapReplyForAllyCodes(realAllyCode, 'member', message, client, `/${team}`);
    await message.react('🎉');
    return;
};

exports.conf = {
    enabled: true,
    guildOnly: false,
    aliases: ['t'],
    permLevel: "User"
};

exports.help = {
    name: "team",
    category: "SWGOH",
    description: "Shows teams for a user",
    usage: "team [team key] [ally code]"
};
