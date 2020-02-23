const https = require('https');

exports.getUserFromMention = async (client, mention) => {
	if (!mention) return;

	if (mention.startsWith('<@') && mention.endsWith('>')) {
		mention = mention.slice(2, -1);

		if (mention.startsWith('!')) {
			mention = mention.slice(1);
		}

        client.logger.log(`Fetching user ${mention} from mention`);
		return await client.fetchUser(mention);
	}
};

exports.getAllyCodeForUser = async (client, user, message) => {
	console.warn('getting ally code for', user.id, message.guild ? message.guild.id : 'no server');
	const response = await client.axios.get(`/api/registration/${user.id}/${message.guild ? message.guild.id : ''}`, {
		httpsAgent: new https.Agent({
			rejectUnauthorized: false
		})
	});
	const realAllyCode = response.data.get.filter(obj => obj.discordId === user.id).map(obj => obj.allyCode);
	client.logger.log(`Got ally code ${JSON.stringify(realAllyCode)} from user ${user.id}`);

	if (!realAllyCode.length) {
		await message.react('🤔');
		await message.reply(`**${user.username}** does not have an associated ally code. Please register one 😁`);
		return null;
	}

	return realAllyCode;
};