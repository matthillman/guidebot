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