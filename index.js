if (process.version.slice(1).split(".")[0] < 8) throw new Error("Node 8.0.0 or higher is required. Update Node on your system.");

process.chdir(__dirname);
global.__basedir = __dirname;

const Discord = require("discord.js");
const { promisify } = require("util");
const readdir = promisify(require("fs").readdir);
const Enmap = require("enmap");
const EnmapLevel = require("enmap-level");

const axios = require('axios');
const https = require('https');

const { Pool } = require('pg');

require('./util/extensions');

const client = new Discord.Client();

exports.client = client;

client.config = require("./config.js");

client.logger = require("./util/Logger");
require("./modules/functions.js")(client);

client.commands = new Enmap();
client.aliases = new Enmap();

client.settings = new Enmap({ provider: new EnmapLevel({ name: "settings" }) });

client.imageChannels = new Enmap({ provider: new EnmapLevel({ name: "image-generation" }) });
client.recruitingChannels = new Enmap({ provider: new EnmapLevel({ name: "recruiting-watcher" }) });

axios.defaults.baseURL = client.config.client.base_url;
axios.defaults.headers.common['Accept'] = 'application/json';
axios.defaults.headers.common['schwartz'] = 'bot';
const agent = new https.Agent({
    rejectUnauthorized: false
});

client.axios = axios;

const initDB = async (client) => {
    client.pool = new Pool(client.config.db);
};

const initAPI = async (client) => {
    try {
        const response = await axios.post('/oauth/token', {
            'grant_type': 'client_credentials',
            'client_id': client.config.client.id,
            'client_secret': client.config.client.secret,
            'scope': client.config.client.scope,
        }, { httpsAgent: agent });
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.access_token}`;
    } catch (error) {
        client.logger.error(`🔥${error}`);
    }
};

const RedisSubscriber = require('laravel-echo-server/dist/subscribers').RedisSubscriber;

const initBroadcast = async (client) => {
    const subscriber = new RedisSubscriber(require('../../laravel-echo-server.json'));
    client.guildQueue = [];
    client.userQueue = [];

    await subscriber.subscribe(async (channel, message) => {
        if (channel == 'private-guilds' && message.event == 'guild.fetched') {
            client.guildQueue.forEach((listener, index) => {
                if (listener.guild == message.data.guild.guild_id) {
                    client.guildQueue.splice(index, 1);
                    listener.callback();
                }
            });
        } else if (message.event == 'mods.fetched') {
            client.userQueue.forEach((listener, index) => {
                if (listener.code == message.data.mods) {
                    client.userQueue.splice(index, 1);
                    listener.callback();
                }
            });
        }
    });

};

const init = async (client) => {
    await initDB(client);
    client.logger.log("Done with DB init 👌");
    await initAPI(client);
    client.logger.log("Done with API init 👌");
    await initBroadcast(client);
    client.logger.log("Done with Broadcast Listener init 👌");

    // Init snapshot
    const { initSnapshot } = require('./util/snapshot');
    client.logger.log("Done with snapshot init 👌");

    await initSnapshot(client);

    // Here we load **commands** into memory, as a collection, so they're accessible
    // here and everywhere else.
    const cmdFiles = await readdir("./commands/");
    client.logger.log(`Loading a total of ${cmdFiles.length} commands.`);
    for (const f of cmdFiles) {
        if (!f.endsWith(".js")) continue;
        const response = await client.loadCommand(f);
        if (response) client.logger.log(response);
    }

    client.logger.log(`Done with commands.`);

    // Then we load events, which will include our message and ready event.
    const evtFiles = await readdir("./events/");
    client.logger.log(`Loading a total of ${evtFiles.length} events.`);
    evtFiles.forEach(file => {
        const eventName = file.split(".")[0];
        client.logger.log(`Loading Event: ${eventName}`);
        const event = require(`./events/${file}`);
        // This line is awesome by the way. Just sayin'.
        client.on(eventName, event.bind(null, client));
        const mod = require.cache[require.resolve(`./events/${file}`)];
        delete require.cache[require.resolve(`./events/${file}`)];
        for (let i = 0; i < mod.parent.children.length; i++) {
            if (mod.parent.children[i] === mod) {
                mod.parent.children.splice(i, 1);
                break;
            }
        }
        client.logger.log(`Done. 👌`);
    });

    // Generate a cache of client permissions for pretty perms
    client.levelCache = {};
    for (let i = 0; i < client.config.permLevels.length; i++) {
        const thisLevel = client.config.permLevels[i];
        client.levelCache[thisLevel.name] = thisLevel.level;
    }

    client.logger.log(`Logging into discord`);
    client.login(client.config.token);
    client.logger.log(`Init complete`);
};

init(client);
