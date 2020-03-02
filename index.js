// This will check if the node version you are running is the required
// Node version, if it isn't it will throw the following error to inform
// you.
if (process.version.slice(1).split(".")[0] < 8) throw new Error("Node 8.0.0 or higher is required. Update Node on your system.");

// This will make sure all of our relative paths actually work, even if we call the script
// from another directory.
process.chdir(__dirname);
global.__basedir = __dirname;

// Load up the discord.js library
const Discord = require("discord.js");
// We also load the rest of the things we need in this file:
const { promisify } = require("util");
const readdir = promisify(require("fs").readdir);
const Enmap = require("enmap");
const EnmapLevel = require("enmap-level");

const axios = require('axios');
const https = require('https');

const { Pool } = require('pg');

require('./util/extensions');

// This is your client. Some people call it `bot`, some people call it `self`,
// some might call it `cootchie`. Either way, when you see `client.something`,
// or `bot.something`, this is what we're refering to. Your client.
const client = new Discord.Client();

// Here we load the config file that contains our token and our prefix values.
client.config = require("./config.js");
// client.config.token contains the bot's token
// client.config.prefix contains the message prefix

// Require our logger
client.logger = require("./util/Logger");

// Let's start by getting some useful functions that we'll use throughout
// the bot, like logs and elevation features.
require("./modules/functions.js")(client);

// Aliases and commands are put in collections where they can be read from,
// catalogued, listed, etc.
client.commands = new Enmap();
client.aliases = new Enmap();

// Now we integrate the use of Evie's awesome Enhanced Map module, which
// essentially saves a collection to disk. This is great for per-server configs,
// and makes things extremely easy for this purpose.
client.settings = new Enmap({ provider: new EnmapLevel({ name: "settings" }) });

client.imageChannels = new Enmap({ provider: new EnmapLevel({ name: "image-generation" }) });
client.recruitingChannels = new Enmap({ provider: new EnmapLevel({ name: "recruiting-watcher" }) });

// We're doing real fancy node 8 async/await stuff here, and to do that
// we need to wrap stuff in an anonymous function. It's annoying but it works.

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
        } else if (message.event == 'bot.command') {
            switch (message.data.command) {
                case 'guild-query':
                    client.logger.log(`Parsing guild-query ${JSON.stringify(message)}`);
                    let query = message.data.guilds;

                    if (!Array.isArray(query)) {
                        query = [query];
                    }
                    let response = [];
                    for (const data of query) {
                        const guild = client.guilds.get(data.guild);

                        let members = await guild.fetchMembers();
                        if (data.member) {
                            members = data.member;
                            if (!Array.isArray(members)) {
                                members = [members];
                            }
                        }
                        for (const memberID of members) {
                            const member = guild.members.get(memberID);
                            response.push({
                                id: member.id,
                                guild: guild.id,
                                username: member.username,
                                roles: [...member.roles.map(r => ({ id: r.id, name: r.name }))],
                            });
                        }

                    }

                    try {
                        const status = await axios.post('/api/guild-query-response', { response }, {
                            httpsAgent: new https.Agent({
                                rejectUnauthorized: false
                            })
                        });
                        client.logger.log(`Posted guild query response: ${status}`);
                    } catch (e) {
                        console.error(e);
                    }
            }
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
    // Here we login the client.
    client.login(client.config.token);
    client.logger.log(`Init complete`);

    // End top-level async/await function.
};

init(client);
