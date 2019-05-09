exports.run = async (client, message, [command, ...args]) => { // eslint-disable-line no-unused-vars
    const possibleCommand = (command || '').toLowerCase();

    const setChannel = (label, chanArg) => {
        if (!client.imageChannels.has(message.guild.id)) client.imageChannels.set(message.guild.id, {});

        const name = chanArg.replace(/^#/g, '');
        let channel;
        if (name.indexOf('<#') === 0) {
            channel = message.guild.channels.get(name.replace(/^<#/, '').replace(/>$/, ''));
        } else {
            channel = message.guild.channels.find('name', name);
        }

        if (!channel) return message.reply(`Can't find a channel named "${name}"`);

        client.imageChannels.setProp(message.guild.id, label, channel.id);
    };

    if (possibleCommand === "input" || possibleCommand === "output") {
        const chan = args.shift();
        setChannel(possibleCommand, chan);
        message.reply(`**${chan}** registered for image **${possibleCommand}**`);
    } else {
        message.reply(`Please specify either "input" or "output" and a channel`);
    }
};

exports.conf = {
    enabled: true,
    guildOnly: false,
    aliases: [],
    permLevel: "User"
};

exports.help = {
    name: "register",
    category: "util",
    description: "Set up the channels that will be used by image generate.",
    usage: `
    image register [input | output] [channel]
    `
};