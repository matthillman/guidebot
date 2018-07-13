
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

    const waitingMessage = await message.channel.send("Querying " + args.join(' vs '));

    await waitingMessage.react('⏳');

    const response = await queryGuilds(client, args.first(), args.last());

    await waitingMessage.react('🎉');
    await waitingMessage.delete();
    console.warn(response);
    if (response.error) {
        message.reply(response.error);
        return;
    }
    let msg = `= ${Object.keys(response).join(' vs ')} =\n`;

    const g1Key = Object.keys(response).first();
    const g2Key = Object.keys(response).last();
    const winner = {};
    ['zetas', 'gear_12', 'gear_11'].forEach((key) => {
        winner[key] = +response[g1Key][key] > +response[g2Key][key] ? g1Key : g2Key;
    });
    winner['gear_11_12'] = (+response[g1Key]['gear_12'] + +response[g1Key]['gear_11']) > (+response[g2Key]['gear_12'] + +response[g2Key]['gear_11']) ? g1Key : g2Key;

    Object.keys(response).forEach((key) => {
        msg += `\n== ${key} ==\n`;
        let decorator = winner.zetas == key ? '**' : '';
        msg += `Zetas   :: ${decorator}${response[key].zetas}${decorator}\n`;
        decorator = winner.gear_12 == key ? '**' : '';
        msg += `Gear 12 :: ${decorator}${response[key].gear_12}${decorator}\n`;
        decorator = winner.gear_11 == key ? '**' : '';
        msg += `Gear 11 :: ${decorator}${response[key].gear_11}${decorator}\n`;
        decorator = winner.gear_11_12 == key ? '**' : '';
        msg += `G 11+12 :: ${decorator}${response[key].gear_12 + response[key].gear_11}${decorator}\n`;
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
