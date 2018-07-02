
const https = require('https');
const queryGuilds = async (client, guild1, guild2) => {
    try {
      const response = await client.axios.get(`/api/tw/compare/${guild1}/${guild2}`, {httpsAgent: new https.Agent({
          rejectUnauthorized: false
        })});
      return response.data;
    } catch (error) {
      return {
          error: error
      };
    }
  };

exports.run = async (client, message, args) => {
    console.warn(args);
    const response = await queryGuilds(client, args[0], args[1]);
    if (response.error) {
        message.reply(response.error);
        return;
    }
    let msg = `= ${Object.keys(response).join(' vs ')} =\n`;

    Object.keys(response).forEach((key) => {
        msg += `\n== ${key} ==\n`;
        msg += `Zetas   :: ${response[key].zetas}\n`;
        msg += `Gear 12 :: ${response[key].gear_12}\n`;
        msg += `Gear 11 :: ${response[key].gear_11}\n`;
        msg += `G 11+12 :: ${response[key].gear_12 + response[key].gear_11}\n`;
        msg += `\n`;
    });

    message.channel.send(msg, {code: 'asciidoc'});
};

exports.conf = {
    enabled: true,
    guildOnly: true,
    aliases: ['vs'],
    permLevel: "User"
};

exports.help = {
    name: "compare",
    category: "SWGOH",
    description: "Compares the high level stats of two guilds. Note guild_id is the id from the URL in their swogh profile.",
    usage: "compare [guild_id 1] [guild_id 2]"
};
