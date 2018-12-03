const Enmap = require("enmap");
const EnmapLevel = require("enmap-level");

const schedules = new Enmap({provider: new EnmapLevel({name: "schedules"})});

exports.run = async (client, message, [raid, ...args]) => { // eslint-disable-line no-unused-vars
    const channelSchedules = schedules.get(message.channel.id);
    const adminLevel = client.levelCache["Moderator"];
    const possibleCommand = (raid || '').toLowerCase();

    if (possibleCommand === "add" || possibleCommand === "replace") {
        if (message.author.permLevel < adminLevel) return message.reply("You don't have permission to do this.");
        const realRaid = args.shift().toLowerCase();
        if (!realRaid) return message.reply("Please supply an event key to set.");
        if (args.length < 2) return message.reply("Please specify a channel and a command.");

        if (!schedules.has(message.channel.id)) schedules.set(message.channel.id, {});

        const name = args.shift().replace(/^#/g, '');
        let channel;
        if (name.indexOf('<#') === 0) {
            channel = message.guild.channels.get(name.replace(/^<#/, '').replace(/>$/, ''));
        } else {
            channel = message.guild.channels.find('name', name);
        }

        if (!channel) return message.reply(`Can't find a channel named "${name}"`);

        schedules.setProp(message.channel.id, realRaid, {
            channel: channel.id,
            command: args.join(' ')
        });
        return message.reply(`Event ${realRaid} added. You can only schedule this event from this channel`);
    } else
    if (possibleCommand === "list" || possibleCommand === "help" || !raid) {
        if (!channelSchedules) return message.replay(`There are no events configured in this channel`);
        const configuredEvents = Object.keys(channelSchedules).sort();
        let output = `= Events that can be called in ${message.channel.name} =\n`;
        configuredEvents.forEach(event => {
            output += `\u200b\n  * ${event}`;
        });
        message.channel.send(output, {code: "asciidoc", split: { char: "\u200b" }});
    } else
    if (possibleCommand === "remove" || possibleCommand === "delete") {
        if (message.author.permLevel < adminLevel) return message.reply("You don't have permission to do this.");
        const realRaid = args.shift().toLowerCase();
        if (!realRaid) return message.reply("Please supply a key to clear.");
        if (!channelSchedules[realRaid]) return message.reply(`There is no event in this channel for ${realRaid}`);

        const response = await client.awaitReply(message, `Are you sure you want to remove the event "${realRaid}"?`);
        if (["y", "yes"].includes(response.toLowerCase())) {
            delete channelSchedules[realRaid];
            client.settings.set(message.channel.id, channelSchedules);
            message.reply(`${realRaid} was successfully deleted.`);
          } else if (["n","no","cancel"].includes(response)) {
            message.reply("I did nothing.");
          }
    } else {
        if (!channelSchedules[raid]) return message.replay(`There is no event named "${raid} configured in this channel`);

        const event = channelSchedules[raid];
        const channel = client.channels.get(event.channel);

        if (!channel) return message.reply(`Can't find a channel named "${name}"`);
        const date = args.join(' ');
        channel.send(`${event.command} ${date}`);
        message.reply(`${raid} scheduled for ${date}`);
    }
};

exports.conf = {
    enabled: true,
    guildOnly: false,
    aliases: [],
    permLevel: "User"
};

exports.help = {
    name: "schedule",
    category: "Scheduling",
    description: "Echoes a pre-defined schedule creation message.",
    usage: `
    schedule [event] [date (eg. today or tomorrow)]
    schedule add [event] [channel] [command]
    schedule remove [event]
    `
};