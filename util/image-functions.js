const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');

const UNIT_DATA = {};
const IMAGE_MAP = {};
const colorMap = ['#663399', '#eadb39', ['#0071d6', '#f70019'], ['#bfd5ff', '#ffcfd0']];

const roundRect = (ctx, x, y, w, h, radius) => {
    var r = x + w;
    var b = y + h;
    ctx.beginPath();
    ctx.moveTo(x+radius, y);
    ctx.lineTo(r-radius, y);
    ctx.quadraticCurveTo(r, y, r, y+radius);
    ctx.lineTo(r, y+h-radius);
    ctx.quadraticCurveTo(r, b, r-radius, b);
    ctx.lineTo(x+radius, b);
    ctx.quadraticCurveTo(x, b, x, b-radius);
    ctx.lineTo(x, y+radius);
    ctx.quadraticCurveTo(x, y, x+radius, y);
    ctx.closePath();
    ctx.stroke();
};

const shadowText = (ctx, text, x, y, size) => {
    ctx.save();
    ctx.fillStyle = '#262626';
    ctx.font = `${size}px 'Avenir Light'`;
    ctx.fillText(text, x + 1, y + 2);
    ctx.restore();

    ctx.save();
    ctx.font = `${size}px 'Avenir Light'`;
    if (size > 25) {
        ctx.fillText(text, x, y);
    }
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.strokeText(text, x, y);
    if (size <= 25) {
        ctx.fillText(text, x, y);
    }
    ctx.restore();
};

const drawGear = (ctx, icon, amount, x, y, fx, fy) => {
    const gearIcon = IMAGE_MAP[icon];
    const isG13 = icon === `g13`;
    if (isG13) {
        x = x - 2;
        y = y - 2;
    }
    const fontX = fx || x;
    const fontY = fy || y + 31;
    const imageW = isG13 ? 48 : 40;
    const imageH = isG13 ? 134 : 40;
    ctx.drawImage(gearIcon, x, y, imageW, imageH);
    ctx.fillStyle = '#ffffff';
    shadowText(ctx, amount, fontX + imageW / 2, fontY, 34);
};

const drawGearSection = (ctx, chars, baseX, baseY) => {
    const unit = UNIT_DATA[chars[0].base_id.toUpperCase()];
    // const alignmentAdjustment = unit.alignment === 2 ? 0 : (unit.alignment === 3 ? 1 : 2);

    const dim = 40;
    const xStride = 48;
    const yStride = 44;

    const textLabels = ['', '', '', '3+', '5', '6', '7'];
    const colLabels = [`g11`, `g12`, `g13-${unit.alignment}`, `relic-${unit.alignment}`, `relic-${unit.alignment}`, `relic-${unit.alignment}`, `relic-${unit.alignment}`];
    colLabels.forEach((_, index) => {
        let x = baseX + xStride * index;
        let y = baseY;
        if (index > 0) {
            ctx.fillStyle = '#162c60';
            ctx.fillRect(x - 1, y, 2, yStride * (chars.length + 1));
        }
    });
    colLabels.forEach((image, index) => {
        // ctx.fillStyle = "#ff5500";
        // ctx.fillRect(baseX + xStride * index, baseY, 1, 1);
        let x = baseX + xStride * index + (xStride - dim) / 2;
        let y = baseY;
        const gearIcon = IMAGE_MAP[image];
        let wh = dim;
        if (image.startsWith('g13')) {
            const adjustment = (200 * dim / 160 - dim) / 2;
            x -= adjustment;
            y -= adjustment;
            wh = 50;
        }
        ctx.drawImage(gearIcon, x, y, wh, wh);
        if (textLabels[index].length) {
            ctx.textAlign = "center";
            ctx.fillStyle = '#ffffff';
            shadowText(ctx, textLabels[index], x + (dim / 2), y + 28, 22);
        }
    });


    chars.forEach((char, index) => {
        const y = baseY + ((index + 1) * yStride);
        ['gear_11', 'gear_12', 'gear_13', 'relic_total', 'relic_5', 'relic_6', 'relic_7'].forEach((stat, colIndex) => {
            const x = baseX + xStride * colIndex;
            ctx.textAlign = "center";
            ctx.fillStyle = '#ffffff';
            shadowText(ctx, char[stat], x + (xStride / 2), y + 31, 34);
        });
    });
};

const clipSquare = (ctx, x, y, size) => {
    ctx.moveTo(x, y);
    ctx.lineTo(x + size, y);
    ctx.lineTo(x + size, y + size);
    ctx.lineTo(x, y + size);
    ctx.clip();
};

const applyText = (canvas, text) => {
	const ctx = canvas.getContext('2d');

	// Declare a base size of the font
	let fontSize = 70;

	do {
		// Assign the font to the context and decrement it so it can be measured again
		ctx.font = `${fontSize -= 5}px 'Avenir Light'`;
		// Compare pixel width of the text to the canvas minus the approximate avatar size
	} while (ctx.measureText(text).width > canvas.width);

	// Return the result to use in the actual canvas
	return fontSize;
};

const generateImage = async (guilds, guildName1, guildName2) => {
    const testCanvas = createCanvas(480, 100);
    const line1 = `${guildName1} vs`;
    const line2 = `${guildName2}`;
    const headerSize1 = applyText(testCanvas, line1);
    const headerSize2 = applyText(testCanvas, line2);
    const headerSize = Math.min(headerSize1, headerSize2);
    delete testCanvas;

    const charCount = Object.keys(guilds[0]).length;
    const canvas = createCanvas(480, 3 * 8 + 2 * headerSize + 146 * charCount);
    const ctx = canvas.getContext('2d');

    ctx.drawImage(IMAGE_MAP.bg, 0, 0, IMAGE_MAP.bg.width * canvas.height / IMAGE_MAP.bg.height, canvas.height);
    // ctx.fillStyle = '#13213b';
    // ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = "start";
    ctx.fillStyle = '#ffffff';

    shadowText(ctx, line1, 16, 8 + headerSize - 6, headerSize);
    shadowText(ctx, line2, 16, 2 * (8 + headerSize) - 6, headerSize);

    for (const charID of Object.keys(guilds[0])) {
        const charIndex = Object.keys(guilds[0]).indexOf(charID);
        const y = (3 * 8 + 2 * headerSize) + charIndex * 146;
        const unit = UNIT_DATA[charID.toUpperCase()];

        ctx.save();
        ctx.lineWidth = 8;
        ctx.strokeStyle = colorMap[2][unit.alignment - 2];
        roundRect(ctx, 4, y + 4, 136, 136, 8);
        ctx.lineWidth = 6;
        ctx.strokeStyle = colorMap[3][unit.alignment - 2];
        roundRect(ctx, 4, y + 4, 136, 136, 8);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ffffff';
        roundRect(ctx, 4, y + 4, 136, 136, 8);
        ctx.clip();

        ctx.fillStyle = '#000000';
        ctx.fillRect(8, y + 8, 128, 128);
        if (!IMAGE_MAP[unit.base_id]) {
            IMAGE_MAP[unit.base_id] = await loadImage(`${__basedir}/../../public/images/units/${unit.base_id}.png`);
        }
        ctx.drawImage(IMAGE_MAP[unit.base_id], 8, y + 8, 128, 128);
        ctx.restore();

        drawGearSection(ctx, [guilds[0][charID], guilds[1][charID]], 148, y + 8);

        ctx.fillStyle = '#162c60';
        ctx.fillRect(0, y + 144, canvas.width, 2);
    }

    return canvas;
};

const writePNG = async (canvas, path) => {
    return new Promise((resolve, reject) => {
        const out = fs.createWriteStream(path);
        const stream = canvas.createPNGStream();
        stream.pipe(out);
        out.on('finish', () =>  resolve());
    });
};

const init = async (client) => {
    const db = await client.pool.connect();

    const units = await db.query(`select base_id, name, alignment from "units";`);

    client.logger.log(`Fetched ${units.rowCount} Units`);

    units.rows.forEach(unit => {
        UNIT_DATA[unit.base_id] = unit;
    });

    await db.end();

    IMAGE_MAP.bg = await loadImage(`${__basedir}/util/bg2.jpg`);
    IMAGE_MAP['g11'] = await loadImage(`${__basedir}/../../public/images/units/gear/gear-icon-g11.png`);
    IMAGE_MAP['g12'] = await loadImage(`${__basedir}/../../public/images/units/gear/gear-icon-g12.png`);
    IMAGE_MAP['g13-2'] = await loadImage(`${__basedir}/../../public/images/units/gear/gear-icon-g13-2.png`);
    IMAGE_MAP['g13-3'] = await loadImage(`${__basedir}/../../public/images/units/gear/gear-icon-g13-3.png`);
    IMAGE_MAP['relic-2'] = await loadImage(`${__basedir}/../../public/images/units/abilities/relic2.png`);
    IMAGE_MAP['relic-3'] = await loadImage(`${__basedir}/../../public/images/units/abilities/relic3.png`);
    IMAGE_MAP['zeta'] = await loadImage(`${__basedir}/../../public/images/units/abilities/zeta.png`);
}

exports.roundRect = roundRect;
exports.shadowText = shadowText;
exports.drawGear = drawGear;
exports.drawGearSection = drawGearSection;
exports.clipSquare = clipSquare;
exports.applyText = applyText;
exports.generateImage = generateImage;
exports.writePNG = writePNG;
exports.initImageFunctions = init;