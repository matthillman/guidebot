const https = require('https');
const { snapshot } = require('../util/snapshot');
const { Attachment } = require('discord.js');

const teamList = [
    {label: 'General Skywalker', value: 'gs'},
    {label: 'Geo TB', value: 'geo'},
    {label: 'TW', value: 'tw'},
    {label: 'Legendaries', value: 'legendary'},
    {label: 'Darth Malak', value: 'malak'},
    {label: 'Hoth TB', value: 'tb'},
    {label: 'STR', value: 'str'},
];

const getUserFromMention = async (client, mention) => {
	if (!mention) return;

	if (mention.startsWith('<@') && mention.endsWith('>')) {
		mention = mention.slice(2, -1);

		if (mention.startsWith('!')) {
			mention = mention.slice(1);
		}

		return await client.fetchUser(mention);
	}
};

exports.run = async (client, message, [team, allyCode]) => {
    if (!team) {
        return message.reply(`\`\`\`asciidoc
The following teams are available:
${teamList.reduce((prev, team) => `${prev}${team.value}${' '.repeat(10 - team.value.length)} :: ${team.label}\n`, '')}
\`\`\``);
    }

    if (!teamList.map(team => team.value).includes(team)) {
        return message.reply(`${team} is not a valid team key`);
    }

    allyCode = allyCode.replace(/\-/g, '');

    let realAllyCode = null;
    if (/^[0-9]{9}$/.test(allyCode)) {
        realAllyCode = allyCode;
    } else if (/^<@\d+>$/.test(allyCode) || allyCode === 'me') {
        const user = allyCode === 'me' ? message.author : await getUserFromMention(client, allyCode);
        if (user) {
            const response = await client.axios.get(`/api/registration/${user.id}`, {
                httpsAgent: new https.Agent({
                    rejectUnauthorized: false
                })
            });
            realAllyCode = response.data.get.filter(obj => obj.discordId === user.id).map(obj => obj.allyCode);
        }
    }

    if (realAllyCode === null) {
        return message.reply(`${allyCode} does not appear to be a valid ally code`);
    }
    await message.react('⏳');

    if (!Array.isArray(realAllyCode)) {
        realAllyCode = [realAllyCode];
    }

    for (const code of realAllyCode) {
        const URL = `${client.config.client.base_url}/member/${code}/${team}`;
        const buffer = await snapshot(URL);
        await message.channel.send(new Attachment(buffer, `${code}.png`));
    }

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
