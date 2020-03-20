
module.exports = (client, oldChannel, newChannel, ) => {
  client.logger.cmd(`[CHANNEL UPDATE] ${oldChannel.name} (${oldChannel.id} -> ${oldChannel.position}) to ${newChannel.name} (${newChannel.id} -> ${newChannel.position})`);
};
