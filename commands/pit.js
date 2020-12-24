const parseIntDefault = (numberish, def) => {
    const parsed = parseInt(numberish);
    return Number.isNaN(parsed) ? (def || 0) : parsed;
}

const getSettings = (client, channel) => {
    const def = {
        phase: 0,
        holding: [],
        bossRole: "Pit Boss",
        postThreshold: 105,
        starting: 100
    };
    if (!channel) return def;
    const returns = {};

    if (!client.settings.has(channel.id)) {
        client.settings.set(channel.id, def);
    }

    const overrides = client.settings.get(channel.id) || {};
    for (const key in def) {
        returns[key] = overrides[key] || def[key];
    }
    return returns;
};

exports.run = async (client, message, [command, ...args]) => {
    command = command.toLowerCase();
    if (!message.member) {
        await message.guild.fetchMembers();
    }

    const adminRole = message.guild.roles.find(r => r.name.toLowerCase() === message.settings.adminRole.toLowerCase());

    const settings = message.settings = getSettings(client, message.channel);
    const roleSearch = (settings.bossRole || "Pit Boss").toLowerCase();
    const pitBossRole = message.guild.roles.find(r => r.name.toLowerCase() === roleSearch);

    if (command !== 'setrole' && !pitBossRole) {
        await message.reply(`Looked for boss role "${settings.bossRole || "Pit Boss"}", but I didn't find a role with that name. You must define a boss role before you can use this feature.`);
    }

    const pitBossMention = pitBossRole ?`<@&${pitBossRole.id}>: ` : '';
    const adminMention = adminRole ? `<@&${adminRole.id}>` : "Admin";
    const isBoss = pitBossRole && message.member.roles.has(pitBossRole.id);
    const currentPhase = settings.phase || 0;

    /*
    open <phase>
    next/close
    status
    holding (h)
    <- notify
    post

    {
        phase: 0,1,2,3,4
        holding: [
            {
                id: #
                name: string
                amount: #
            }
        ]
        bossRole: string
        postThreshold: 105
        starting: 100
    }
    */

    if (['open', 'o', 'next', 'n'].includes(command)) {
        if (!isBoss) {
            return await message.reply(`🐗🚨 You don't have permission to do this, you need ${pitBossMention}`);
        }

        const commandIsNext = command === 'next' || command === 'n';

        if (commandIsNext && currentPhase === 0) {
            return await message.reply(`🐗🛑 Pit is not currently running. Please use "open" to start a run`)
        }

        if (settings.holding.length) {
            return await message.reply(`🐗💥 Members are still holding damage. Please signal everyone with "post" before changing phases.`);
        }

        const nextPhaseArg = commandIsNext ? null : parseInt(args[0]);
        const startingPercentArg = parseIntDefault(commandIsNext ? args[0] : args[1], 100);

        let nextPhase = parseIntDefault(nextPhaseArg, currentPhase + 1);
        if (nextPhase > 4) {
            nextPhase = 0;

            await message.channel.send(`🐗 ${pitBossMention} 🍾🍻 Phase 4 complete! Raid done! Wooooo!`);
        }

        client.settings.setProp(message.channel.id, 'phase', nextPhase);
        client.settings.setProp(message.channel.id, 'starting', startingPercentArg);
        let response = '';
        if (currentPhase > 0) {
            response += `🐗 ${pitBossMention} Phase ${currentPhase} complete!\n\n`;
        }
        if (nextPhase > 0) {
            response += `🐗 ${pitBossMention} Phase ${nextPhase} now open and ready for damage (starting at ${startingPercentArg}%)`;
        }
        if (response.length) {
            await message.channel.send(response);
        }
    } else if (['starting', 'start', 'st'].includes(command)) {
        if (!isBoss) {
            return await message.reply(`🐗🚨 You don't have permission to do this, you need ${pitBossMention}`);
        }
        if (currentPhase === 0) {
            return await message.reply(`🐗🛑 Pit is not currently running. Please use "open" to start a run`)
        }
        const amount = parseFloat(args[0]);

        if (!Number.isNaN(amount)) {
            client.settings.setProp(message.channel.id, 'starting', amount);
            await message.reply(`🐗 Start percent for phase ${currentPhase} updated to ${amount}%`);
        } else {
            return await message.reply(`🐗🛑 "${args[0]}" doesn't parse as a number. Please try again`);
        }

        const total = settings.holding.reduce((tot, cur) => tot + cur.amount, 0);
        const gap = 100 - amount;

        if (total >= (settings.postThreshold - gap)) {
            await message.channel.send(`${pitBossMention}${currentPhase} is loaded with ${total}% damage! Post threshold reached!`);
        }
    } else if (['post', 'p'].includes(command)) {
        if (!isBoss) {
            return await message.reply(`🐗🚨 You don't have permission to do this, you need ${pitBossMention}`);
        }
        if (currentPhase === 0) {
            return await message.reply(`🐗🛑 Pit is not currently running. Please use "open" to start a run`)
        }

        if (!settings.holding.length) {
            return await message.reply(`🐗 Hey… no one is holding any damage…`);
        }

        const mentions = settings.holding.reduce((msg, cur) => `${msg} <@${cur.id}>`, '');

        await message.channel.send(`🐗 Post your damage for phase ${currentPhase}!\n\n${mentions}`);

        client.settings.setProp(message.channel.id, 'holding', []);

        return await message.channel.send(`🐗 ${pitBossMention} Post message sent for phase ${currentPhase}. You can now open the next phase.`);
    } else if (['hold', 'holding', 'h'].includes(command)) {
        if (currentPhase === 0) {
            return await message.reply(`🐗🛑 Pit is not currently running. Please use "open" to start a run`)
        }

        const amount = parseFloat(args[0]);
        const memberIndex = settings.holding.findIndex(m => m.id === message.author.id);

        if (amount > 0) {
            if (memberIndex >= 0) {
                settings.holding[memberIndex].amount = amount;
            } else {
                settings.holding.push({
                    id: message.author.id,
                    name: message.author.username,
                    amount: amount
                });
            }
        } else if (amount === 0) {
            if (memberIndex >= 0) {
                settings.holding.splice(memberIndex, 1);
            }
        } else {
            return await message.reply(`🐗🛑 "${args[0]}" doesn't parse as a number. Please try again`);
        }

        client.settings.setProp(message.channel.id, 'holding', settings.holding);

        await message.react('🐗');

        const total = settings.holding.reduce((tot, cur) => tot + cur.amount, 0);
        const gap = 100 - settings.starting;

        client.logger.log(`${pitBossMention}${currentPhase} : ${total} >= (${settings.postThreshold} - (100 - ${settings.starting})) [${settings.postThreshold - gap}]`);

        if (total >= (settings.postThreshold - gap)) {
            await message.channel.send(`${pitBossMention}${currentPhase} is loaded with ${total.toFixed(2)}% damage! Post threshold reached!`);
        }
    } else if (command === 'setrole') {
        if (message.author.permLevel < 3) {
            return await message.reply(`🐗🚨 You don't have permission to do this, you need ${adminMention}`);
        }
        const newRoleSearch = (args.join(' ') || "Pit Boss").toLowerCase();
        const newPitBossRole = message.guild.roles.find(r => r.name.toLowerCase() === newRoleSearch);

        if (!newPitBossRole) {
            await message.reply(`Looked for boss role "${newRoleSearch}", but I didn't find a role with that name. You must define a boss role before you can use this feature.`);
        } else {
            client.settings.setProp(message.channel.id, 'bossRole', newPitBossRole.name);
            await message.reply(`🐗 bossRole updated to <@&${newPitBossRole.id}>`);
        }

    } else if (command === 'setpostthreshold') {
        if (!isBoss) {
            return await message.reply(`🐗🚨 You don't have permission to do this, you need ${pitBossMention}`);
        }
        const amount = parseFloat(args[0]);

        if (amount > 0) {
            client.settings.setProp(message.channel.id, 'postThreshold', amount);
            await message.reply(`🐗 Post threshold notification updated to ${amount}%`);
        } else {
            return await message.reply(`🐗🛑 "${args[0]}" doesn't parse as a number. Please try again`);
        }

        const total = settings.holding.reduce((tot, cur) => tot + cur.amount, 0);
        const gap = 100 - settings.starting;

        if (total >= (amount - gap)) {
            await message.channel.send(`${pitBossMention}${currentPhase} is loaded with ${total.toFixed(2)}% damage! Post threshold reached!`);
        }
    } else if (['status', 's'].includes(command)) {
        if (currentPhase === 0) {
            return await message.reply(`🐗🛑 Pit is not currently running. Please use "open" to start a run`)
        }

        const total = settings.holding.reduce((tot, cur) => tot + cur.amount, 0);
        const memberCount = settings.holding.length;

        await message.channel.send({
            embed: {
                title : `Challenge Rancor: Phase ${currentPhase} Summary`,
                description: `${memberCount} members holding **${total.toFixed(2)}%** damage
Boss health level at **${settings.starting}%**
Posting damage at **${(settings.postThreshold - (100 - settings.starting)).toFixed(2)}%**
\`\`\`
${settings.holding.reduce((c, m) => `${c}${`${m.amount.toFixed(2)}`.padStart(5)}%: ${m.name}\n`, '')}
\`\`\``,
                color: 0xfce34d,
                footer: {
                  icon_url: "https://schwartz.hillman.me/images/Logo@2x.png",
                  text: "The Schwartzies"
                },
                thumbnail: {
                  url: "https://schwartz.hillman.me/images/rancor.png"
                },
            },
        })
    } else if (command === 'close') {
        if (!isBoss) {
            return await message.reply(`🐗🚨 You don't have permission to do this, you need ${pitBossMention}`);
        }

        if (settings.holding.length && args[0] !== 'force') {
            return await message.reply(`🐗 Hey… ${settings.holding.length} members claim to be holding damage. If you _really_ want to abort, run "close force". Else run "post" to call for damage.`);
        }

        client.settings.setProp(message.channel.id, 'phase', 0);
        client.settings.setProp(message.channel.id, 'holding', []);

        await message.channel.send(`🐗 ${pitBossMention} Pit is closed!`);
    } else {
        await message.channel.send(`Commands:
\`\`\`
For everyone [command <argument> (alias)]:
hold <amount> (holding|h)
    Indicate that you are holding amount% damage and are awaiting orders
    Run again to update your amount
    Run with 0 to indicate you are no longer holding and need to cancel
status (s)
    Get a pretty status of who is patiently holding damage

For @${pitBossRole.name}:
open <phase> <starting> (o)
    Mark a phase as open for damage
    Set the current % to <starting>
next <starting> (n)
    Move to the next phase
    Set the current % to <starting>
starting <amount> (start|st)
    Set the current % to <starting> for the current phase
close
    Mark the raid as over
post (p)
    Signal all members who are holding to post damage

@${adminRole.name || adminRole || "Admin"}:
setRole
    Set the pit boss role
    currently: "${pitBossRole.name}"
setPostThreshold
    Set the damage threshold that triggers a notification to the boss role
    currently: "${settings.postThreshold}%"
\`\`\``)
    }
};

exports.conf = {
  enabled: true,
  guildOnly: false,
  aliases: [],
  permLevel: "User"
};

exports.help = {
  name: "pit",
  category: "SWGOH",
  description: "Challenge Tier Pit Helper.",
  usage: "pit [command] [options]"
};
