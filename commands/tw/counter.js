exports.run = async (message, args) => {
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
    permLevel: "User"
};

exports.help = {
    name: "counter",
    category: "SWGOH",
    description: "Lists counters to popular TW teams.",
    usage: "counter [team]"
};


const counters = [
    {
        name: "Phoenix",
        aliases: [],
        counters: [
            ["Ewoks", "AOE Daze, Buff and resurrect spam, TM Gain, etc"],
            ["Droids", ""],
            ["KRU FO", ""],
            ["EP L + high DPS Empire", ""],
            ["Tarkin + Vader", "Use zVader lead if you have it; stack up the debuffs and then pick them off with Vader"],
            ["Nute", "with Leia, NA, Zombie"],
        ]
    },
    {
        name: "Maul",
        aliases: ['zaul', 'zmaul'],
        counters: [
            ["R2", "in a CLS, RJT or Rex team"],
            ["Thrawn empire", "Most likely you want Thrawn, Tarkin, DT, Krennic, Shore"],
            ["zFinn", "Good luck with the exposes"],
            ["Rex, Vets, Rey, SF", ""],
            ["DN lead Sith", "no crits!"],
            ["Probe Droid", "💥💥💥"],
        ]
    },
    {
        name: "CLS/Chaze/Han",
        aliases: ['cls'],
        counters: [
            ["Thrawn empire", "Most likely you want Thrawn, Tarkin, DT, Krennic, Shore"],
            ["GK (L) + zBarris", "Play Hide a Nihilus™️ or add some damage dealers"],
            ["RJT, BB8, R2D2, Old Ben, +1", "Scavenger Rey, GK, RT, Han, Chopper, etc work for the +1"],
            ["Nute (if there is no Han)", "with Leia, NA, Zombie"],
            ["zFinn", "RNG Dependent"],
            ["MT/Asajj/Daka NS", ""],
            ["Rex (L), GK, DN, Thrawn, R2D2", ""],
            ["Probe Droid", "Blow someone up"],
        ]
    },
    {
        name: "Rey (Jedi Training)",
        aliases: ['rjt', 'rey', 'rey jedi training'],
        counters: [
            ["MT/Asajj/Daka NS", "Talia is better in this scenario than Acolyte"],
            ["RJT", "Just use your own RJT. If you need to out-speed your opponent add additional droids (Chopper, K2, etc)"],
            ["Rex (L), DN, Thrawn, GK/Shoretrooper, Old Ben", "Protect DN with tanks, aka Hide a Nihilus™️"],
            ["Rex (L), Thrawn, CLS, Han, GK", ""],
            ["Probe Droid", "If all else fails, blow someone up"],
        ]
    },
    {
        name: "Nightsisters",
        aliases: ['ns', 'talzin', 'asajj'],
        counters: [
            ["Troopers", "Veers, +4 of (Snowtrooper, Starck, Shoretrooper, Death Trooper, Stormtrooper)"],
            ["Wiggs, Lando, ROLO, SRP", "AoE Boom"],
            ["RJT, BB8, R2, zHan, Thrawn", "This team can beat the GK+Zombie variant"],
            ["Rex (L), DN, Thrawn, GK/Shoretrooper, Old Ben", "Protect DN with tanks, aka Hide a Nihilus™️"],
            ["Rex (L), Thrawn, CLS, Han, GK", ""],
            ["Chaze", "CLS or Rex lead"],
        ]
    },
    {
        name: "zSavage alone (it happens)",
        aliases: ['savage', 'zsavage', 'maul', 'zmaul', 'zaul'],
        counters: [
            ["IG-88 + ROLO", "ROLO’s 10 shot special + heal immunity and DOTs from IG-88"],
            ["FAT", "Special hits a lot of times at once"],
        ]
    },
    {
        name: "zEP",
        aliases: ['ep', 'palp', 'sith'],
        counters: [
            ["Rex, GK, Wampa + 2", "AOE Daze and counters from Wampa do the work"],
            ["zAsajj NS", "If there is no Vader"],
        ]
    },
    {
        name: "Traya",
        aliases: ['traya', 'tray tray', 'sith'],
        counters: [
            ["Rex, GK, Wampa + 2", "AOE Daze and counters from Wampa do the work"],
            ["zAsajj NS", "If there is no Vader"],
        ]
    },
    {
        name: "Rogue One",
        aliases: ['r1', 'jyn', 'zjyn'],
        counters: [
            ["CLS", ""],
            ["KRU FO", ""],
        ]
    },
    {
        name: "Thrawn",
        aliases: [],
        counters: [
            ["zJyn, Cassian, Leia, Chaze", ""],
            ["CLS", ""],
            ["Nute, NA, Zombie", "🧀\nOnly if there is no dispeller or AOE, so this is very specific"],
        ]
    },
    {
        name: "zKRU FO",
        aliases: ['kru', 'fo', 'zkru', 'unkylo'],
        counters: [
            ["zFinn", "Poe needs to go first"],
            ["Droids", "JE needs to be faster than FOO/Phasma"],
        ]
    },
    {
        name: "Droids",
        aliases: ['hk-47'],
        counters: [
            ["Droids", "Need a faster JE"],
            ["Clones", ""],
            ["Jawas", ""],
        ]
    },
];