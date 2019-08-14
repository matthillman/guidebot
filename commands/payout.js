const Enmap = require("enmap");
const EnmapLevel = require("enmap-level");
const fetch = require('node-fetch');

const { hslToRgb, rgbToHex } = require('../util/color-functions');

const payouts = new Enmap({provider: new EnmapLevel({name: "payouts"})});

const example = [
	{
		"name": "Frax",
        "flag": "flag_us",
        "ally_code": "552325555",
        "payout": "21:00",
	}
];

const sortByPayout = players => {
    const now = new Date();

    const sortedPlayers = players.map(player => {
        const payout = new Date();
        payout.setUTCHours(player.payout_hours);
        payout.setUTCMinutes(player.payout_minutes);
        if (payout <= now) { payout.setDate(payout.getDate() + 1); }
        player.timeUntilPayout = payout.getTime() - now.getTime();

        const diff = new Date(player.timeUntilPayout);
        const round = diff.getTime() % 60000;
        diff.setTime(diff.getTime()- round + (round < 30000 ? 0 : 60000));

        player.time = `${String(diff.getUTCHours()).padStart(2, '00')}:${String(diff.getUTCMinutes()).padStart(2, '00')}`;

        return player;
    });
    sortedPlayers.sort((a, b) => {
        const diff = a.timeUntilPayout - b.timeUntilPayout;
        return diff === 0 ? a.name.localeCompare(b.name) : diff;
    });

    const playersByTime = new Map;

    sortedPlayers.forEach(player => {
        if (!playersByTime.has(player.time)) playersByTime.set(player.time, []);
        playersByTime.get(player.time).push(player);
    });

    return playersByTime;
};

const parseData = data => {
    return data.map(member => {
        const keys = Object.keys(member);

        if (!keys.includes("name") || !keys.includes("payout") || !member.name.length || !member.payout.length) {
            throw new Error(`Each member in the JSON must have both a "name" and "payout" key`);
        }

        const payoutParts = member.payout.split(':');
        member.payout_hours = payoutParts[0];
        member.payout_minutes = payoutParts[1];

        member.flag = `:${(member.flag || 'flag_white').replace(/^:|:$/g, '')}:`;

        return member;
    });
};

const generateEmbed = players => {
    const sortedPlayers = sortByPayout(players);
    const now = new Date;
    const hue = Math.abs((now.getHours() % 2) - (now.getMinutes() / 60));
    const color = parseInt(rgbToHex.apply(null, hslToRgb(hue, 1, 0.5)).substr(1), 16);
    const desc = '**Time until next payout**:';
    const fields = [];

    const linkify = player => player.ally_code ? `[${player.name}](https://swgoh.gg/p/${player.ally_code}/)` : player.name;

    sortedPlayers.forEach((players, payout) => {
        const name = payout;
        let value = '';
        players.forEach(player => {
            value += `${player.flag} ${linkify(player)}\n`;
        });
        fields.push({name, value, inline: true});
    });

    return {
        description: desc,
        color: color,
        fields: fields,
        timestamp: now,
        footer: {
            text: 'May the Schwartz be with you',
            icon_url: 'https://schwartz.hillman.me/images/schwartz.jpg',
        },
    };
};

const doIt = async (client, key) => {
    const channelData = payouts.get(key);
    const data = parseData(channelData.data);
    if (channelData.running) {
        const channel = client.channels.get(key);
        let sent = false;
        const embed = generateEmbed(data);
        if (payouts.hasProp(key, 'message')) {
            const message = await channel.fetchMessage(channelData.message);
            message.edit({ embed });
            sent = true;
        }
        if (!sent) {
            const message = await channel.send({ embed });
            payouts.setProp(key, 'message', message.id);
        }

        setTimeout(() => doIt(client, key), 60000 - Date.now() % 60000);
    }
};
exports.init = async client => {
    await payouts.defer;
    client.on('ready', () => {
        payouts.keyArray().forEach((key) => {
            if (payouts.getProp(key, 'running')) {
                doIt(client, key);
            }
        });
    });
};

// eslint-disable-next-line no-unused-vars
exports.run = async (client, message, [command, ...args]) => {
    const channelPayouts = payouts.get(message.channel.id);
    const possibleCommand = (command || '').toLowerCase();

    if (possibleCommand === "register") {
        const newChannel = !payouts.has(message.channel.id);
        if (newChannel) payouts.set(message.channel.id, {});

        if (message.attachments.length === 0) {
            await message.send("🛑 You must include a payout.json when registering");
            return;
        }
        const url = message.attachments.first().url;
        const response = await fetch(url);

        try {
            const data = parseData(await response.json());
            payouts.setProp(message.channel.id, 'data', data);
            payouts.setProp(message.channel.id, 'running', true);

            client.logger.log('Payout register updated');

            if (newChannel) {
                client.logger.log('New payout, starting timer');
                doIt(client, message.channel.id);
            }

            await message.delete();
        } catch (error) {
            await message.channel.send(error.message);
            return;
        }
    } else if (["get", "current", "example"].includes(possibleCommand)) {
        const data = channelPayouts.data || example;
        await message.channel.send({
            files: [{
                attachment: Buffer.from(JSON.stringify(data)),
                name: 'current_payouts.json',
            }],
        });
        return;
    } else if (possibleCommand === "stop") {
        payouts.setProp(message.channel.id, 'running', false);
    }
};

exports.conf = {
    enabled: true,
    guildOnly: true,
    aliases: ['payouts'],
    permLevel: "Administrator",
};

exports.help = {
  name: "payout",
  category: "Miscellaneous",
  description: "Functions to show the payout data",
  usage: "payout [start|stop]"
};
