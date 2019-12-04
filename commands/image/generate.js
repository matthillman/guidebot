const { createCanvas, loadImage } = require('canvas');
const { Attachment } = require('discord.js');

exports.run = async (client, message, [baseImage, rightImage]) => { // eslint-disable-line no-unused-vars
    const channelConfig = client.imageChannels.get(message.guild.id);
    if (!channelConfig) message.reply(`You need to set up input/output channels before running generate`);

    const inputChannel = client.channels.get(channelConfig.input);
    const outputChannel = client.channels.get(channelConfig.output);

    if (!rightImage && !inputChannel) return message.reply(`Can't find input channel "${channelConfig.input}, please make sure you've set it up with *image register input*"`);
    if (!outputChannel) return message.reply(`Can't find output channel "${channelConfig.output}", please make sure you've set it up with *image register output*`);

    let inputURLs = [];
    if (rightImage && validURL(baseImage)) {
        inputURLs = [baseImage];
    } else {
        const inputMessages = await inputChannel.fetchMessages({ limit: (validURL(baseImage) ? 50 : +baseImage) });
        inputURLs = inputMessages.array().reduce((acc, m) => acc.concat(m.attachments.map(a => a.url)), []);
    }
    const baseIMG = await loadImage(rightImage || baseImage);

    await inputURLs.forEach(async flairURL => {
        const flairIMG = await loadImage(flairURL);
        let scaledWidth = 0;
        let scaledHeight = 0;
        let x = 0;
        let y = 0;
        if (flairIMG.height > flairIMG.width) {
            scaledWidth = flairIMG.width * baseIMG.height / flairIMG.height;
            scaledHeight = baseIMG.height;
            x = scaledWidth;
            y = 0;
        } else {
            scaledHeight = flairIMG.height * baseIMG.width / flairIMG.width;
            scaledWidth = baseIMG.width;
            x = 0;
            y = scaledHeight;
        }

        const canvas = createCanvas(x + baseIMG.width, y + baseIMG.height);
        const ctx = canvas.getContext('2d');

        ctx.drawImage(flairIMG, 0, 0, scaledWidth, scaledHeight);
        ctx.drawImage(baseIMG, x, y, baseIMG.width, baseIMG.height);

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

function validURL(str) {
    var pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
      '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
      '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
      '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
      '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
      '(\\#[-a-z\\d_]*)?$','i'); // fragment locator
    return !!pattern.test(str);
  }