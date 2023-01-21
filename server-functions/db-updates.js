const { DB } = require('./databases');
const path = require('path');
const fs = require('fs');
const { getJSON } = require('./get-file');
if (process.env.NODE_ENV !== 'dev') require('dotenv').config();


const updates = [{
    date: 1674230288032,
    description: 'Init Database',
    test: async() => false,
    execute: async() => {
        const query = `
            CREATE TABLE IF NOT EXISTS (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                instrument TEXT,
                setup TEXT,
                tuning TEXT,
                date INTEGER
            )
        `;
    }
}];

const daysTimeout = (cb, days) => {
    // 86400 seconds in a day
    let msInDay = 86400 * 1000;

    let dayCount = 0;
    let timer = setInterval(() => {
        dayCount++; // a day has passed

        if (dayCount === days) {
            clearInterval(timer);
            cb();
        }
    }, msInDay);
}

function showImportantMessage(message) {
    // red background
    // console.clear();
    console.log('\x1b[41mDO NOT STOP IN THE MIDDLE OF THESE UPDATES, YOU WILL CORRUPT FILES.\x1b[0m');
    // yellow text
    console.log('\x1b[33m%s\x1b[0m', message);
}

/**
 * 
 * @param {Boolean} runNow If true, the update (usually ran at 2am) will run immediately
 */
async function updateDB(options) {
    await DB.init();

    // pulls options from the options object
    const start = Date.now();
    let runNow = false,
        pullServerDB = false,
        url = 'https://sfzmusic.org',
        makeBackup = false;
    if (options) {
        runNow = options.runNow;
        pullServerDB = options.pullServerDB;
        url = options.url;
        makeBackup = options.makeBackup;
    }

    const now = new Date();
    [
        'history',
        'uploads',
        'archive',
        'csv'
    ].forEach(folder => {
        if (!fs.existsSync(path.resolve(__dirname, `../${folder}`))) {
            fs.mkdirSync(path.resolve(__dirname, `../${folder}`));
        }
    });

    // create manifest file if not already created
    if (!fs.existsSync(path.resolve(__dirname, "../history/manifest.txt"))) {
        console.log('Manifest file not found. Creating...');
        fs.writeFileSync(path.resolve(__dirname, "../history/manifest.txt"), JSON.stringify({
            lastUpdate: null,
            updates: []
        }, null, 4));
        console.log('Manifest file created.');
    }


    // get the next 2:00am for the next update
    const next2am = new Date();
    next2am.setHours(2, 0, 0, 0);
    if (next2am.getTime() < now) next2am.setDate(next2am.getDate() + 1);

    const manifest = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../history/manifest.txt"), 'utf8'));

    let updated = false;


    // find updates left to apply
    let numUpdates = updates.filter(u => {
        const { date } = u;
        return !manifest.updates.find(m => m.date == date);
    }).length + 1;

    let updatesRan = [];

    for (const update of updates) {
        if (!manifest.updates.find(u => u.date == update.date)) { // if the update is not in the manifest
            console.clear();
            // purple text
            console.log('\x1b[35mRunning tests for database updates, ignore any sqlite errors...\x1b[0m');
            if (await update.test()) { // if true, the update is already done
                manifest.updates.push(update);
                continue;
            } else { // update is necessary
                showImportantMessage('Updates left to apply: ' + numUpdates--);
                updated = true;
                // yellow text
                console.log('\x1b[33mApplying update: ', (new Date(update.date)).toDateString(), update.description, '\x1b[0m');
                try {
                    await update.execute();
                } catch (e) {
                    // red text error
                    console.log('\x1b[31mError applying update: ', (new Date(update.date)).toDateString(), update.description, '\n', e, '\x1b[0m');
                    throw '';
                }
                manifest.updates.push({
                    date: update.date,
                    description: update.description
                });
                updatesRan.push(update);
            }
        } // if it is in the manifest, it's assumed the database has been updated (DO NOT EDIT THE MANIFEST)
    }
    let prevDb;
    const makeBackupDB = async() => {
        const database = fs.readFileSync(path.resolve(__dirname, `../db/main.db`));
        if (prevDb != database.toString('utf-8')) fs.writeFileSync(destination, database);
        prevDb = database.toString('utf-8');
        // creates a backup of the database
        const now = Date.now();
        console.log('Backing up database: ', now);
        const destination = path.resolve(__dirname, `../history/${now}-db.txt`);
        fs.writeFileSync(destination, database);
    }

    // sets 'timeouts' to be deleted in 30 days
    // delete file backups after 1 month
    const dbFiles = fs.readdirSync(path.resolve(__dirname, '../history'));
    dbFiles.forEach(file => {
        if (file == 'manifest.txt') return;
        // test if is file
        const isFile = !fs.lstatSync(path.resolve(__dirname, `../history/${file}`)).isDirectory();
        if (isFile) {
            const [fileDate] = file.split('-');
            const month = 1000 * 60 * 60 * 24 * 30;
            const fileAge = now - fileDate;

            if (fileAge > month) {
                fs.unlinkSync(path.resolve(__dirname, `../history/${file}`));
            } else {
                // days until deletion
                const days = Math.floor((month - fileAge) / (1000 * 60 * 60 * 24));

                // console.log('Deleting file in ' + days + ' days: ' + file);

                daysTimeout(() => {
                    console.log('Removing backup: ', file);
                    fs.unlinkSync(path.resolve(__dirname, `../history/${file}`));
                }, days);
            }
        }
    });
    // get the time until 2am
    const timeUntil2am = next2am.getTime() - now;

    // wait until 2am
    setTimeout(makeBackupDB, timeUntil2am);



    // if there was no update
    if (updated) {
        console.clear();

        // green text
        console.log('\x1b[32mDatabase update complete\x1b[0m');

        updatesRan.forEach(ud => {
            // yellow text
            console.log('\x1b[33m', '- Applied update: ', new Date(ud.date).toLocaleDateString(), ud.description, '\x1b[0m');
        });
        const end = Date.now();

        console.log('\x1b[33m', 'Database update took ' + (end - start) / 1000 + ' seconds', '\x1b[0m');
        console.log('\x1b[33m', DB.numQueries, 'Queries ran', '\x1b[0m');
        console.log('\x1b[33m', 'Updates ran: ', updatesRan.length, '\x1b[0m');
    } else {
        // green text
        console.log('\x1b[32mDatabase is up to date\x1b[0m');
    }

    manifest.lastUpdate = Date.now();

    if (pullServerDB) {
        // TODO: run as static
        // showImportantMessage('Pulling data from server');
        // const { data } = await axios.post(`${url}/api/v1/db`, {
        //     key: process.env.DB_KEY
        // });

        // if (data.msg == 'Success') {
        //     const now = Date.now();
        //     const dir = path.resolve(__dirname, `../history/${now}-db-pulled.db`);
        //     // convert data.database (binary) to a buffer
        //     const buffer = Buffer.from(data.database, 'binary');
        //     // write the buffer to a file
        //     fs.writeFileSync(dir, buffer);

        //     manifest.serverPull = Array.isArray(manifest.serverPull) ? [...manifest.serverPull, Date.now()] : [Date.now()];

        //     // green text
        //     console.log('\x1b[32mSuccessfully pulled server database\x1b[0m');
        // } else {
        //     // red text
        //     console.log('\x1b[31mFailed to pull server database', data, '\x1b[0m');
        // }
    }

    fs.writeFileSync(path.resolve(__dirname, "../history/manifest.txt"), JSON.stringify(manifest, undefined, 4));

}

module.exports = { updateDB };