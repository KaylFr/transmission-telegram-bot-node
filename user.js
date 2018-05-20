'use strict'

const fs = require('fs');

var exports = module.exports = {};

exports.fileExists = () => {
    return fs.existsSync(__dirname + '/user.json');
}

exports.loadFile = () => {
    return fs.readFileSync(__dirname + '/user.json', 'utf8');
}

exports.saveFile = (obj) => {
    fs.writeFile(__dirname + '/user.json', JSON.stringify(obj), (err) => {
        if (err) throw err;
    });
}