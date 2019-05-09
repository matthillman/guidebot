const { createCanvas, loadImage } = require('canvas');
const { Attachment } = require('discord.js');

exports.run = async (client, message, [baseImage, ...args]) => { // eslint-disable-line no-unused-vars
    const channelConfig = client.imageChannels.get(message.guild.id);
    if (!channelConfig) message.reply(`You need to set up input/output channels before running generate`);
    const inputChannel = client.channels.get(channelConfig.input);
    const outputChannel = client.channels.get(channelConfig.output);

    if (!inputChannel) return message.reply(`Can't find input channel "${channelConfig.input}, please make sure you've set it up with *image register input*"`);
    if (!outputChannel) return message.reply(`Can't find output channel "${channelConfig.output}", please make sure you've set it up with *image register output*`);

    const inputMessages = await inputChannel.fetchMessages();
    const inputURLs = inputMessages.array().reduce((acc, m) => acc.concat(m.attachments.map(a => a.url)), []);
    const baseIMG = await loadImage(baseImage);

    await inputURLs.forEach(async flairURL => {
        const flairIMG = await loadImage(flairURL);
        const scaledWidth = flairIMG.width * baseIMG.height / flairIMG.height;

        const canvas = createCanvas(scaledWidth + baseIMG.width, baseIMG.height);
        const ctx = canvas.getContext('2d');

        ctx.drawImage(flairIMG, 0, 0, scaledWidth, baseIMG.height);
        ctx.drawImage(baseIMG, scaledWidth, 0, baseIMG.width, baseIMG.height);

        const attachment = new Attachment(canvas.toBuffer(), 'mcu-avengers.png');

        await outputChannel.send('', attachment);
    });

    message.reply(`${inputURLs.length} images generated`);
};

exports.conf = {
    enabled: true,
    guildOnly: false,
    aliases: [],
    permLevel: "User"
};

exports.help = {
    name: "generate",
    category: "util",
    description: "Appends a given image to a set of images in one channel and posts the output in another channel.",
    usage: `
    image generate [base image URL]
    `
};