const Enmap = require("enmap");
const logger = require('./Logger');
const { readdir } = require('fs');
const { promisify } = require('util');
const readdirAsync = promisify(readdir);

class CommandLoader {
    constructor() {
        this.commands = new Enmap();
        this.aliases = new Enmap();
    }

    async loadFrom(path) {
        const cmdFiles = await readdirAsync(`./commands/${path}`);
        logger.log(`⮑ Loading a total of ${cmdFiles.length} sub-commands.`);
        cmdFiles.forEach(f => {
          if (!f.endsWith(".js")) return;
          const response = this.loadCommand(path, f);
          if (response) logger.log(response);
        });
    }

    loadCommand(path, commandName) {
        try {
            const props = require(`../commands/${path}${commandName}`);
            logger.log(`Loading Command: ${path}${props.help.name}. 👌`);
            if (props.init) {
                props.init();
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
