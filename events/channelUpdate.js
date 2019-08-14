
module.exports = (client, oldChannel, newChannel, ) => {
  client.logger.cmd(`[CHANNEL UPDATE] ${oldChannel.name} (${oldChannel.id}) to ${newChannel.name} (${newChannel.id})`);
};
