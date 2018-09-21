let counters = [];

exports.run = async (client, message, args) => {
    const query = args.join(' ').toLowerCase();

    const matches = args[0] ? counters.filter((squad) => {
        return squad.name.toLowerCase() == query || squad.aliases.indexOf(query) > -1;
    }) : counters;

    if (!matches.length) {
        message.reply(`No counters found for ${query}`);
        return;
    }

    matches.sort((a, b) => a.name.localeCompare(b.name));

    let output = `= TW Counters =\n`;
    matches.forEach((match) => {
        output += `\u200b\n== Counters for ${match.name} ==\n`;
        match.counters.forEach((counter) => {
            output += `[${counter.first()}]`;
            if (counter.last() && counter.last().length) {
                output += `\n____\n${counter.last()}\n____\n`;
            }
            output += `\n`;
        });
        output += "\n";
    });

    message.channel.send(output, {
        code: "asciidoc",
        split: {
            char: "\u200b"
        }
    });

    return output;
};

exports.conf = {
    enabled: true,
    guildOnly: false,
    aliases: ['counters'],
    permLevel: "User",
    homeGuildOnly: true,
};

exports.help = {
    name: "counter",
    category: "SWGOH",
    description: "Lists counters to popular TW teams.",
    usage: "counter [team]"
};

exports.init = async (client) => {
    const db = await client.pool.connect();

    const teams = await db.query(`select id, name, aliases from "territory_war_teams" order by "name" asc`);

    client.logger.log(`Fetched ${teams.rowCount} TW teams`);

    counters = await Promise.all(teams.rows.map(async team => {
        const teamCounters = await db.query(`select name, description from "territory_war_team_counters" where "territory_war_team_counters"."territory_war_team_id" = $1`, [team.id]);
        return {
            name: team.name,
            aliases: team.aliases.split(',').map(Function.prototype.call, String.prototype.trim),
            counters: teamCounters.rows.map(counter => [counter.name, counter.description])
        }
    }));

    await db.end();
};
