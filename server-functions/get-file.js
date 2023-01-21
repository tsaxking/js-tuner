const fs = require('fs');
const path = require('path');
const { minify } = require('html-minifier');

/**
 * 
 * @param {Sting} fileName /path/to/filename (no .json)
 * @returns {Object} Parsed JSON or if no .json, then false
 */
function getJSON(fileName) {
    const dir = path.resolve(__dirname, '../jsons', '.' + fileName + '.json');
    try {
        return JSON.parse(fs.readFileSync(dir).toString('utf-8'));
    } catch (err) { return false; }
}

let jsonWrites = [];

/**
 * 
 * @param {String} fileName /path/to/filename (no .json)
 * @param {Object} data Will be stringified (Can be a Class too)
 */
async function saveJSON(fileName, data) {
    const date = Date.now();
    jsonWrites.push({ fileName, data, date });

    let dataType = typeof data;
    let newData;

    // new Directory
    const dir = path.resolve(__dirname, '../jsons', '.' + fileName + '.json');

    if (Array.isArray(data)) {
        // Stringify data, add spaces and new lines to make it readable
        newData = data.map(d => {
            let x = JSON.stringify(d, null, 4);
            x += '\r\n';
            return x;
        });

        // Places data in new array (similar to .toString() but includes the [])
        newData = `[${newData}]`;
    } else newData = JSON.stringify(data, null, 4);

    // checks if file is in use
    let check = jsonWrites.filter(j => j.fileName == fileName);
    while (check.length > 1) console.log('file in use!');

    // Writes the file, creates directory if it doesn't exist
    try {
        writeFile(dir, newData);
    } catch (err) {
        createDir(dir);
        writeFile(dir, newData);
    }
    let json = jsonWrites.find(j => j.date == date);
    const i = jsonWrites.indexOf(json);
    jsonWrites.splice(i, 1);
}

function writeFile(fileNameAndDir, data) {
    fs.writeFileSync(fileNameAndDir, data);
}

function createDir(d) {
    fs.mkdirSync(d);
}

function getTemplate(fileName) {
    let dir = path.resolve(__dirname, '../templates', '.' + fileName + '.html');
    try {
        const html = fs.readFileSync(dir).toString('utf-8');
        return minify(html, {
            collapseWhitespace: true,
            removeComments: true,
            removeAttributeQuotes: true,
            removeEmptyAttributes: true,
            // removeEmptyElements: true,
            // removeOptionalTags: true,
            removeRedundantAttributes: true,
            // removeScriptTypeAttributes: true,
            // removeStyleLinkTypeAttributes: true,
            useShortDoctype: true
        });
    } catch (err) { return false }
}

let tempWrites = [];

async function saveTemplate(fileName, data) {
    const date = Date.now();
    tempWrites.push({ fileName, data, date });
    const dir = path.resolve(__dirname, '../templates', '.' + fileName + '.html');


    // checks if file is in use
    let check = jsonWrites.filter(j => j.fileName == fileName);
    while (check.length > 1) console.log('file in use!');

    try {
        writeFile(dir, data);
    } catch (err) {
        createDir(dir);
        writeFile(dir, data);
    }
    let json = tempWrites.find(j => j.date == date);
    const i = tempWrites.indexOf(json);
    tempWrites.splice(i, 1);
}

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return {
        int: parseFloat((bytes / Math.pow(k, i)).toFixed(dm)),
        type: sizes[i]
    };
}

/**
 * 
 * @param {String} data Binary Data
 * @param {String} filename Name of file
 * @returns {Promise}
 */
async function saveUpload(data, filename) {
    return new Promise((resolve, reject) => {
        data = Buffer.from(data, 'binary');

        fs.writeFile(path.resolve(__dirname, '../uploads', filename), data, err => {
            if (err) reject(err);
            else resolve();
        });
    });
}

/**
 * 
 * @param {Array} files Files to upload in the format of { data: binaryData, filename: filename, ext: fileExtension }
 * @returns {Promise}
 */
async function uploadMultipleFiles(files) {
    if (!Array.isArray(files)) return;
    return new Promise((resolve, reject) => {
        let promises = [];
        files.forEach(file => {
            promises.push(saveUpload(file.data, file.filename + file.ext));
        });

        Promise.all(promises).then(() => resolve()).catch(err => reject(err));
    });
}

function getUpload(filename) {
    return new Promise((resolve, reject) => {
        fs.readFile(path.resolve(__dirname, '../uploads', filename), (err, data) => {
            if (err) reject(err);
            else resolve(data);
        });
    });
}

module.exports = {
    getJSON,
    saveJSON,
    createDir,
    getTemplate,
    saveTemplate,
    formatBytes,
    saveUpload,
    getUpload,
    uploadMultipleFiles
}