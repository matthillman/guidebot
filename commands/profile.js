exports.run = async (client, message, [chanName, ...args]) => {

    const name = chanName.replace(/^#/g, '');
    let channel;
    if (name.indexOf('<#') === 0) {
        channel = message.guild.channels.get(name.replace(/^<#/, '').replace(/>$/, ''));
    } else {
        channel = message.guild.channels.find('name', name);
    }

    if (!channel) return message.reply(`Can't find a channel named "${name}"`);

    if (!client.recruitingChannels.has(message.guild.id)) client.recruitingChannels.set(message.guild.id, {});

    const recruitingProfileWatcher = {
        channel: channel.id,
        outputChannel: message.channel.id,
        command: args.join(' '),
    };

    client.recruitingChannels.setProp(message.guild.id, 'info', recruitingProfileWatcher);

    return message.reply(`Watcher set up.`);
};

exports.conf = {
    enabled: true,
    guildOnly: false,
    aliases: [],
    permLevel: "User"
};

exports.help = {
    name: "profile",
    category: "SWGOH",
    description: "Echos the command in *this* channel for any gg links found in the given channel. Use %ally for the ally code.",
    usage: "profile <channel to watch> <command with %ally>"
};
