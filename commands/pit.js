const { set } = require("lodash");


const getSettings = (client, channel) => {
    const def = {
        phase: 0,
        holding: [],
        bossRole: "Pit Boss",
        postThreshold: 105
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

    const settings = message.settings = getSettings(client, message.channel);
    const roleSearch = (settings.bossRole || "Pit Boss").toLowerCase();
    const pitBossRole = message.guild.roles.find(r => r.name.toLowerCase() === roleSearch);

    if (command !== 'setrole' && !pitBossRole) {
        await message.reply(`Looked for boss role "${settings.bossRole || "Pit Boss"}", but I didn't find a role with that name. You must define a boss role before you can use this feature.`);
    }
    const pitBossMention = pitBossRole ?`<@&${pitBossRole.id}>: ` : '';
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
    }
    */

    if (command === 'open' || command === 'o' || command === 'next' || command === 'n') {
        if (!isBoss) {
            return await message.reply(`🐗🚨 You don't have permission to do this, you need ${pitBossMention}`);
        }

        if ((command === 'next' || command === 'n') && currentPhase === 0) {
            return await message.reply(`🐗🛑 Pit is not currently running. Please use "open" to start a run`)
        }

        if (settings.holding.length) {
            return await message.reply(`🐗💥 Members are still holding damage. Please signal everyone with "post" before changing phases.`);
        }

        let nextPhase = parseInt(args[0] || (currentPhase + 1));
        if (nextPhase > 4) {
            nextPhase = 0;

            await message.channel.send(`🐗 ${pitBossMention} 🍾🍻 Phase 4 complete! Raid done! Wooooo!`);
        }

        client.settings.setProp(message.channel.id, 'phase', nextPhase);
        let response = '';
        if (currentPhase > 0) {
            response += `🐗 ${pitBossMention} Phase ${currentPhase} complete!\n\n`;
        }
        if (nextPhase > 0) {
            response += `🐗 ${pitBossMention} Phase ${nextPhase} now open and ready for damage`;
        }
        if (response.length) {
            await message.channel.send(response);
        }
    } else if (command === 'post' || command === 'p') {
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
    } else if (command === 'hold' || command === 'holding' || command === 'h') {
        if (currentPhase === 0) {
            return await message.reply(`🐗🛑 Pit is not currently running. Please use "open" to start a run`)
        }
        const amount = parseFloat(args[0]);

        if (amount > 0) {
            const memberIndex = settings.holding.findIndex(m => m.id === message.author.id);

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

        await message.react('🐗');

        const total = settings.holding.reduce((tot, cur) => tot + cur.amount, 0);

        if (total >= settings.postThreshold) {
            await message.channel.send(`${pitBossMention}${currentPhase} is loaded with ${total}% damage! Time to post!`);
        }
    } else if (command === 'setrole') {
        if (message.author.permLevel < 3) {
            return await message.reply(`🐗🚨 You don't have permission to do this, you need an Admin`);
        }
        const newRoleSearch = (args[0] || "Pit Boss").toLowerCase();
        const newPitBossRole = message.guild.roles.find(r => r.name.toLowerCase() === newRoleSearch);

        if (!newPitBossRole) {
            await message.reply(`Looked for boss role "${newRoleSearch}", but I didn't find a role with that name. You must define a boss role before you can use this feature.`);
        } else {
            client.setting.setProp(message.channel.id, 'bossRole', newPitBossRole.name);
            await message.reply(`🐗 bossRole updated to <@&${newPitBossRole.id}">`);
        }

    } else if (command === 'setpostthreshold') {
        if (!isBoss) {
            return await message.reply(`🐗🚨 You don't have permission to do this, you need ${pitBossMention}`);
        }
        const amount = parseFloat(args[0]);

        if (amount > 0) {
            client.setting.setProp(message.channel.id, 'postThreshold', amount);
            await message.reply(`🐗 Post threshold notification updated to ${amount}%`);
        } else {
            return await message.reply(`🐗🛑 "${args[0]}" doesn't parse as a number. Please try again`);
        }

        const total = settings.holding.reduce((tot, cur) => tot + cur.amount, 0);

        if (total >= amount) {
            await message.channel.send(`${pitBossMention}${currentPhase} is loaded with ${total}% damage! Time to post!`);
        }
    } else if (command === 'status' || command === 's') {
        if (currentPhase === 0) {
            return await message.reply(`🐗🛑 Pit is not currently running. Please use "open" to start a run`)
        }

        const total = settings.holding.reduce((tot, cur) => tot + cur.amount, 0);
        const memberCount = settings.holding.length;

        await message.channel.send({
            embed: {
                title : `Challenge Rancor: Phase ${currentPhase} Summary`,
                description: `${memberCount} members holding ${total}% damage
\`\`\`
${settings.holding.reduce((c, m) => `${c}${`${m.amount}`.padStart(3)}%: ${m.name}\n`, '')}
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
For everyone:
hold <amount> (holding|h)
    Indicate that you are holding amount% damage and are awaiting orders
    Run again to update your amount
    Run with 0 to indicate you are no longer holding and need to cancel
status
    Get a pretty status of who is patiently holding damage

For @${pitBossRole.name}:
open <phase> (o)
    Mark a phase as open for damage
next (n)
    Move to the next phase
close
    Mark the raid as over
post (p)
    Signal all members who are holding to post damage

Admin:
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
