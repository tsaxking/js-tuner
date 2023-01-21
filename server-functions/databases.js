const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const { hostname } = require('os');
// const { createQueryLog } = require('./server-logs');
const fs = require('fs');

let totalTime = 0;

// ensure all databases are created
[
    'main'
].forEach(db => {
    try {
        fs.readFileSync(path.resolve(__dirname, '../db', `./${db}.db`));
    } catch {
        fs.writeFileSync(path.resolve(__dirname, '../db', `./${db}.db`), '');
    };
});

// function createQueryLog(delta, query, type) {
//     if (testing) {
//         console.log(type);
//         console.log(query);
//         totalTime += delta;
//         console.log('Query time: ' + delta);
//         console.log('Total Query time: ' + totalTime);
//     }
// }

class APP_DB {
    constructor(filepath) {
        this.path = path.resolve(__dirname, '../db', filepath);
        this.queue = [];
        this.queueRunning = false;

        // this.init();
    }

    async init() {
        this.sqlite = await open({
            filename: this.path,
            driver: sqlite3.Database
        }).catch(err => console.error(err));
    }

    async runQueue(queueInfo) {
        this.queue.push(queueInfo);
        if (this.queueRunning) return;
        this.queueRunning = true;

        while (this.queue.length > 0) {
            const { query, params, type, resolve, reject } = this.queue[0];

            // console.log(this.queue.length);

            switch (type) {
                case 'run':
                    await this.sqlite.get(query, params)
                        .catch(e => {
                            reject(e);
                            throw new Error(e);
                        });
                    break;
                case 'exec':
                    await this.sqlite.exec(query, params)
                        .catch(e => {
                            reject(e);
                            throw new Error(e);
                        });;
                    break;
                case 'each':
                    await this.sqlite.each(query, params)
                        .catch(e => {
                            reject(e);
                            throw new Error(e);
                        });
            }
            resolve();
            this.queue.shift();
        }

        this.queueRunning = false;
    }

    async run(query, params) {
        return new Promise((res, rej) => {
            this.runQueue({
                query,
                params,
                type: 'run',
                resolve: res,
                reject: rej
            });
        });
    }

    async exec(query, params) {
        return new Promise((res, rej) => {
            this.runQueue({
                query,
                params,
                type: 'exec',
                resolve: res,
                reject: rej
            });
        });
    }

    async each(query, params) {
        return new Promise((res, rej) => {
            this.runQueue({
                query,
                params,
                type: 'each',
                resolve: res,
                reject: rej
            });
        });
    }

    async get(query, params) {
        return await this.sqlite.get(query, params)
            .catch(e => {
                reject(e);
                throw new Error(e);
            });
    }

    async all(query, params) {
        return await this.sqlite.all(query, params)
            .catch(e => {
                reject(e);
                throw new Error(e);
            });
    }
}

// const DB = new _DB(path.resolve(__dirname, '../db', './database.db'));
// const LOGS = new _DB(path.resolve(__dirname, '../db', './logs.db'));
// const AUDIO_DB = new _DB(path.resolve(__dirname, '../db', './audio-systems.db'));

const DB = new APP_DB('./database.db');

module.exports = { DB };