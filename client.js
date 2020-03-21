if (process.version.slice(1).split(".")[0] < 8) throw new Error("Node 8.0.0 or higher is required. Update Node on your system.");

process.chdir(__dirname);
global.__basedir = __dirname;

const Discord = require("discord.js");
const { promisify } = require("util");
// const readdir = promisify(require("fs").readdir);
const Enmap = require("enmap");
const EnmapLevel = require("enmap-level");

const axios = require('axios');
const https = require('https');

require('./util/extensions');

const client = new Discord.Client();

exports.client = client;

client.config = require("./config.js");
client.logger = require("./util/Logger");

require("./modules/functions.js")(client);

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

// const { Pool } = require('pg');
// const initDB = async (client) => {
//     client.pool = new Pool(client.config.db);
// };

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

const { snapDM } = require('./util/snapshot');

const initBroadcast = async (client) => {
    const subscriber = new RedisSubscriber(require('../../laravel-echo-server.json'));

    await subscriber.subscribe(async (channel, message) => {
        if (message.event == 'bot.command') {
            switch (message.data.command) {
                case 'guild-query': {
                    client.logger.log(`Parsing guild-query ${JSON.stringify(message)}`);
                    let query = message.data.guilds;

                    if (!Array.isArray(query)) {
                        query = [query];
                    }

                    const response = [];
                    let role = null;
                    for (const data of query) {
                        const guild = client.guilds.get(data.guild);

                        if (data.role) {
                            const roleExp = new RegExp(data.role, 'i');
                            role = await guild.roles.find(role => roleExp.test(role.name));

                        }

                        let members = await guild.fetchMembers();
                        if (data.member) {
                            members = data.member;
                            if (!Array.isArray(members)) {
                                members = [members];
                            }
                            members = members.map(m => guild.members.get(m));
                        } else {
                            members = [...members.members.values()];
                        }
                        for (const member of members) {
                            if (!role || role && member.roles.has(role.id)) {
                                response.push({
                                    id: member.id,
                                    guild: guild.id,
                                    username: member.user.username,
                                    discriminator: member.user.discriminator,
                                    email: member.user.email,
                                    avatar: member.user.avatar,
                                    roles: [...member.roles.map(r => ({ id: r.id, name: r.name }))],
                                });
                            }
                        }
                    }

                    try {
                        const status = await axios.post('/api/guild-query-response', { response, role }, {
                            httpsAgent: new https.Agent({
                                rejectUnauthorized: false
                            })
                        });
                        client.logger.log(`Posted guild query response: ${status}`);
                    } catch (e) {
                        client.logger.error(e);
                    }
                    break;
                }
                case 'send-dms': {
                    client.logger.log(`Parsing send-dms ${JSON.stringify(message)}`);
                    const start = (new Date).getTime();
                    const URL = message.data.url;
                    for (const member of message.data.members) {
                        let success = false;
                        try {
                            await snapDM(member.ally_code, URL, client.users.get(member.id), client, '', true, message.data.message);
                            success = true;
                            client.logger.log(`DM sent to ${member.ally_code} (${member.id}) for URL [${URL}] (${((new Date).getTime() - start) / 1000} seconds)`);
                        } catch (error) {
                            client.logger.error(`DM failed to sent to ${member.ally_code} (${member.id}) for URL [${URL}] [${error}]`);
                        }

                        const status = await axios.post('/api/send-dm-response', { member: member.id, success, context: message.data.context }, {
                            httpsAgent: new https.Agent({
                                rejectUnauthorized: false
                            })
                        });
                        client.logger.log(`Posted dm query response: ${status}`);
                    }
                    client.logger.log(`⏲  Sending ${message.data.members.length} DMs took ${((new Date).getTime() - start) / 1000} seconds`);

                    break;
                }
                default:
                    client.logger.error(`Unknown command ${message.data.command}`);
            }
        }
    });

};

const init = async (client) => {
    // await initDB(client);
    // client.logger.log("Done with DB init 👌");
    await initAPI(client);
    client.logger.log("Done with API init 👌");
    await initBroadcast(client);
    client.logger.log("Done with Broadcast Listener init 👌");

    // Init snapshot
    const { initSnapshot } = require('./util/snapshot');
    await initSnapshot(client);
    client.logger.log("Done with snapshot init 👌");

    client.logger.log(`Logging into discord`);
    client.login(client.config.token);
    client.logger.log(`Init complete`);
};

init(client);
