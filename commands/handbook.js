const { inspect } = require("util");
const Enmap = require("enmap");
const EnmapLevel = require("enmap-level");

const handbooks = new Enmap({provider: new EnmapLevel({name: "handbooks"})});

exports.run = async (client, message, [key, ...value]) => {

    const guildHandbooks = handbooks.get(message.guild.id);
    const adminLevel = client.levelCache["Administrator"];

    if (key === "set") {
        if (message.author.permLevel < adminLevel) return message.reply("You don't have permission to do this.");
        const realKey = value.shift().toLowerCase();
        if (!realKey) return message.reply("Please supply a key to set.");
        if (value.length < 1) return message.reply("Please specify a value.");

        if (!handbooks.has(message.guild.id)) handbooks.set(message.guild.id, {});

        handbooks.setProp(message.guild.id, realKey, value.join(' '));

        message.reply(`${realKey} successfully set to ${value.join(' ')}`);
    } else
    if (key === "clear") {
        if (message.author.permLevel < adminLevel) return message.reply("You don't have permission to do this.");
        const realKey = value.shift().toLowerCase();
        if (!realKey) return message.reply("Please supply a key to clear.");
        if (!guildHandbooks[realKey]) return message.reply(`There is no handbook to clear for ${realKey}`);

        const response = await client.awaitReply(message, `Are you sure you want to clear the handbook for ${key}?`);
        if (["y", "yes"].includes(response.toLowerCase())) {
            delete guildHandbooks[key];
            client.settings.set(message.guild.id, guildHandbooks);
            message.reply(`${key} was successfully cleared.`);
          } else if (["n","no","cancel"].includes(response)) {
            message.reply("Action cancelled.");
          }
    } else
    if (key === "all") {
        message.channel.send(inspect(guildHandbooks), {code: "json"});
    } else {
        if (!key) return message.reply("Please specify a handbook to view.");
        if (!guildHandbooks[key]) return message.reply(`There is no handbook for ${key}`);

        message.reply(`The handbook for ${key} is here: ${guildHandbooks[key]}`);
    }

};

exports.shutdown = () => {
    handbooks.db.close();
};

exports.conf = {
  enabled: true,
  guildOnly: true,
  aliases: ["guide"],
  permLevel: "User"
};

exports.help = {
  name: "handbook",
  category: "Guild",
  description: "Get the link to the handbook for a guild.",
  usage: "handbook <guild acronym>"
};
