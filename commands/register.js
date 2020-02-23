const https = require('https');
// const { getUserFromMention } = require('../util/helpers');

exports.run = async (client, message, [command, allyCode]) => {
    if (!allyCode) {
        allyCode = command;
        command = 'post';
    } else {
        command = command.toLowerCase();

        if (command === '-d' || command === '--delete') {
            command = 'delete';
        } else {
            await message.react('🤔');
            return await message.reply(`Invalid arguments`);
        }
    }

    if (allyCode) {
        allyCode = allyCode.replace(/\-/g, '');
    }

    let realAllyCode = null;
    if (/^[0-9]{9}$/.test(allyCode)) {
        realAllyCode = allyCode;
    }

    if (realAllyCode === null) {
        await message.react('🤔');
        return message.reply(`${allyCode} does not appear to be a valid ally code`);
    } else {
        await message.react('⏳');
        const user = message.author;
        await client.axios[command](`/api/registration/${realAllyCode}/${user.id}/${message.guild.id}`, {}, {
            httpsAgent: new https.Agent({
                rejectUnauthorized: false
            })
        });
        client.logger.log(`Registered ally code ${JSON.stringify(realAllyCode)} for user ${user.id}`);
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
    name: "register",
    category: "SWGOH",
    description: "Register an ally code to a discord ID for later convenience",
    usage: "register [alt?] [ally code]"
};
