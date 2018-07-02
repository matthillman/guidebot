const { CommandLoader } = require('../util/command-loader');

const CMD = new CommandLoader;

exports.run = async (client, message, [command, ...args]) => {
  const cmd = CMD.get(command);

  if (!cmd) {
    message.channel.send(`Unknown TW command “${command}”`);
    CMD.get("help").run(CMD.commands, message, []);
  }

  if (command == "help") {
    cmd.run(CMD.commands, message, args);
  } else {
    cmd.run(client, message, args);
  }
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

CMD.loadFrom('tw/');
