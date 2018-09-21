const { CommandLoader } = require('../util/command-loader');

let CMD;

exports.run = async (client, message, [command, ...args]) => {
  const cmd = CMD.get(command);

  if (!cmd) {
    message.channel.send(`Unknown TW command “${command}”`);
    CMD.get("help").run(CMD.commands, message, []);
  }

  const settings = message.settings = client.getGuildSettings(message.guild);
  const level = client.permlevel(message);
  if (cmd && !message.guild && cmd.conf.guildOnly)
    return message.channel.send("This command is unavailable via private message. Please run this command in a guild.");

  if (level < client.levelCache[cmd.conf.permLevel]) {
    if (settings.systemNotice === "true") {
      return message.channel.send(`You do not have permission to use this command.
  Your permission level is ${level} (${client.config.permLevels.find(l => l.level === level).name})
  This command requires level ${client.levelCache[cmd.conf.permLevel]} (${cmd.conf.permLevel})`);
    } else {
      return;
    }
  }

  if (cmd.conf.homeGuildOnly && !client.config.homeGuilds.includes(message.guild.id)) { return; }

  if (command == "help") {
    cmd.run(CMD.commands, message, args);
  } else {
    cmd.run(client, message, args);
  }
};

exports.init = async (client) => {
  CMD = new CommandLoader(client);
  CMD.loadFrom('tw/');
};


exports.conf = {
  enabled: true,
  guildOnly: false,
  aliases: [],
  permLevel: "User"
};

exports.help = {
  name: "tw",
  category: "SWGOH",
  description: "TW information.",
  usage: "tw [command] [options]"
};
