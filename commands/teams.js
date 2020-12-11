const https = require('https');
const { snapReplyForAllyCodes } = require('../util/snapshot');
const { getUserFromMention, getAllyCodeForUser } = require('../util/helpers');

const teamList = [
    {label: 'General Skywalker', value: 'gs'},
    {label: 'LS Geo TB', value: 'lsgeo'},
    {label: 'Geo TB', value: 'geo'},
    {label: 'TW', value: 'tw'},
    {label: 'Legendaries', value: 'legendary'},
    {label: 'Darth Malak', value: 'malak'},
    {label: 'Hoth TB', value: 'tb'},
    {label: 'STR', value: 'str'},
    {label: 'CT Pit', value: 'pit'},
];

exports.run = async (client, message, [allyCode, team]) => {
    const firstArgAppearsToBeAllyCode = /^[0-9]{9}$/.test(allyCode) || /^<@.+>$/.test(allyCode) || allyCode === 'me';

    if (team.length === 0 || !firstArgAppearsToBeAllyCode) {
        // assuming that if we only get 1 argument it's a character name
        team = allyCode;
        allyCode = null;
    }

    if (!team) {
        return message.reply(`\`\`\`asciidoc
The following teams are available:
${teamList.reduce((prev, team) => `${prev}${team.value}${' '.repeat(10 - team.value.length)} :: ${team.label}\n`, '')}
\`\`\``);
    }

    team = team.toLowerCase();

    if (!teamList.map(team => team.value).includes(team) && team !== 'mods') {
        return message.reply(`${team} is not a valid team key`);
    }

    if (team === 'mods') {
        team = 'tw_mods';
    }
    if (team === 'pit') {
        team = '28';
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
