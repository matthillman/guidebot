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

    allyCode = allyCode.replace('-', '');

    if (!/^[0-9]{9}$/.test(allyCode)) {
        return message.reply(`${allyCode} does not appear to be a valid ally code`);
    }

    const URL = `${client.config.client.base_url}/member/${allyCode}/${team}`;

    const buffer = await snapshot(URL);

    return message.channel.send(new Attachment(buffer, `${allyCode}.png`));
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
