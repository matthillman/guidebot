const Enmap = require("enmap");
const logger = require('./Logger');
const { readdir } = require('fs');
const { promisify } = require('util');
const readdirAsync = promisify(readdir);

class CommandLoader {

    constructor(client) {
        this.commands = new Enmap();
        this.aliases = new Enmap();
        this.client = client;
    }

    async loadFrom(path) {
        const cmdFiles = await readdirAsync(`./commands/${path}`);
        logger.log(`⮑ Loading a total of ${cmdFiles.length} sub-commands.`);
        for (let f of cmdFiles) {
          if (!f.endsWith(".js")) continue;
          const response = await this.loadCommand(path, f);
          if (response) logger.log(response);
        };
    }

    async loadCommand(path, commandName) {
        try {
            const props = require(`../commands/${path}${commandName}`);
            logger.log(`Loading Command: ${path}${props.help.name}. 👌`);
            if (props.init) {
                await props.init(this.client);
            }
            this.commands.set(props.help.name, props);
            props.conf.aliases.forEach(alias => {
                this.aliases.set(alias, props.help.name);
            });
            return false;
        } catch (e) {
            return `Unable to load command ${commandName}: ${e}`;
        }
    }

    get(command) { return this.commands.get(command) || this.commands.get(this.aliases.get(command)); }
}

exports.CommandLoader = CommandLoader;
