const { Pool } = require('pg');
const config = require('../config');
global.__basedir = `${__dirname}/..`;

const { initImageFunctions, generateImage, writePNG } = require('../util/image-functions');

const client = {
    pool: new Pool(config.db),
    logger: console,
};

const run = async () => {
    await initImageFunctions(client);

    const data = require(`${__basedir}/test/compare.json`);

    const c = await generateImage(data, "Attack of the Schwartz", "StarForge Jeddah");

    await writePNG(c, `${__basedir}/test/test.png`);
};

run();