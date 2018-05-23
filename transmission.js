'use strict'

const DateTime = require('date-and-time');
const Transmission = require('transmission');
const config = require('./config.json')
const formatter = require('./template_message.js');


console.log(DateTime.format(new Date(Date.now()), 'DD/MM HH:mm:ss - ') + 'Configuration de la connection a transmission');
const transmission = new Transmission({
    port: config.transmission.port,
    host: config.transmission.address,
    url: config.transmission.path,
    username: config.transmission.credentials.username,
    password: config.transmission.credentials.password
});

console.log(DateTime.format(new Date(Date.now()), 'DD/MM HH:mm:ss - ') + `-------- Connection configurer --------
IP et port --> ${config.transmission.address}:${config.transmission.port}
Login: ${config.transmission.credentials.username || 'none'}
Password: ${config.transmission.credentials.password || 'none'}
`);

var exports = module.exports = {};
var oldList = exports.torrents = [];

exports.updateTorrentList = () => {
    transmission.get(function (err, arg) {
        if (err)
            console.error(err);
        else {
            oldList = exports.torrents;
            exports.torrents = arg.torrents;
            console.log(DateTime.format(new Date(Date.now()), 'DD/MM HH:mm:ss - ') +'La nouvelle liste de torrents a été téléchargé');

            exports.checkCompletedTorrents();
        }
    });
}

exports.checkCompletedTorrents = () => {
    oldList.forEach(torrent => {
        // Search the torrent in the new list
        for (var i = 0; i < exports.torrents.length; i++) {
            if (torrent.name === exports.torrents[i].name && torrent.status != exports.torrents[i].status && exports.torrents[i].status === 6)
                exports.torrentCompleted(formatter.formatComplete(torrent));
        }
    });
}
// Fin de configuration


// Liste des torrent
exports.getTorrentsList = (limit = 10, success, error) => {
    transmission.get(function (err, arg) {
        if (err)
            error(formatter.errorMessage(err));
        else {
            exports.torrents = arg.torrents;

            var messageExport = []
            for (let torrent in arg.torrents) {
                if (arg.torrents[torrent].status == 4) messageExport.push(arg.torrents[torrent])
                if (messageExport.length == limit) break
            }
            success(formatter.torrentsList(messageExport));
        }
    });
}

exports.startTorrent = (id, success, error) => {
    transmission.start(parseInt(id), function (err, result) {
        if (err)
            error(formatter.errorMessage(err));
        else {
            // Update torrent list
            exports.updateTorrentList();
            success(result);
        }
    });
}

exports.pauseTorrent = (id, success, error) => {
    transmission.stop(parseInt(id), function (err, result) {
        if (err)
            error(formatter.errorMessage(err));
        else {
            // Update torrent list
            exports.updateTorrentList();
            success(result);
        }
    });
}

exports.removeTorrent = (id, trashData = false, success, error) => {
    transmission.remove(parseInt(id), trashData, function (err, result) {
        if (err)
            error(formatter.errorMessage(err));
        else {
            // Update torrent list
            exports.updateTorrentList();
            success(result);
        }
    });
}

exports.getTorrentDetails = (id, success, error) => {
    transmission.get(parseInt(id), function (err, result) {
        if (err) {
            error(formatter.errorMessage(err));
            return;
        }
        if (result.torrents.length > 0)
            success(formatter.torrentDetails(result.torrents[0]));
    });
}

// Ajout d'un torrent depuis url
exports.addTorrent = (url, success, error) => {
    transmission.addUrl(url, function (err, result) {
        if (err) {
            error(formatter.errorMessage(err));
            return;
        }

        // Update torrent list
        exports.updateTorrentList();
        success(formatter.newTorrent(result));
    });
}


// Clavier de base
exports.listOfCommandsKeyboard = {
    reply_markup: JSON.stringify({
        keyboard: [
            ['📋 Liste des torrents', '📋 List Limit'],
            ['📈 Status', '➕ Add torrent'],
            ['▶️ Start', '⏸ Pause', '❌ Remove'],
            ['⚙ Settings', '❔ Help']
        ]
    }),
    parse_mode: 'html',
    disable_web_page_preview: true
}

// Créer un clavier avec les torrent en pause
exports.getKeyboardPaused = () => {
    var keyboard = [['Annuler']];
    exports.torrents.forEach(torrent => {
        if (torrent.status == 0)
            keyboard.push([`⏸ ${torrent.id}) ${torrent.name}`]);
    });
    return keyboard;
}

// Create a keyboard with all torrent
exports.getKeyboard = (type = 'all') => {
    var keyboard = [['Annuler']];

    exports.torrents.forEach(torrent => {
        if (torrent.status == 0) keyboard.push([`⏸ ${torrent.id}) ${torrent.name}`]);
        else if (torrent.status > 3 ) keyboard.push([`▶️ ${torrent.id}) ${torrent.name}`]);
        else keyboard.push([`${torrent.id}) ${torrent.name}`]);
    });
    return keyboard;
}

// Clavier Torrent Actif
exports.getKeyboardActive = () => {
    var keyboard = [['Annuler']];
    exports.torrents.forEach(torrent => {
        if (torrent.status > 3)
            keyboard.push([`▶️ ${torrent.id}) ${torrent.name}`]);
    });
    return keyboard;
}

// Settings
exports.settingsKeyboard = {
    reply_markup: JSON.stringify({
        keyboard: [['🔙 menu'], ['🐢 Speed Limit', 'List Limit'], ['🖥 Transmission info'], ['🔔 Notification']]
    }),
    parse_mode: 'html'
}

exports.hideKeyboard = {
    reply_markup: JSON.stringify({
        keyboard: [['Annuler']]
    })
}

exports.setSettings = (command, success, error) => {
    transmission.session(command, function (err, arg) {
        if (err)
            error(formatter.errorMessage(err));
        else
            success();
    });
}


exports.getSessionDetails = (callback) => {
    transmission.session(function (err, arg) {
        if (err)
            callback(formatter.errorMessage(err));
        else {
            callback(formatter.sessionDetails(arg));
        }
    });
}

exports.getSpeedLimit = (callback) => {
    transmission.session(function (err, arg) {
        if (err)
            callback(formatter.errorMessage(err));
        else {
            callback(arg);
        }
    });
}

exports.setSettings = (command, success, error) => {
    transmission.session(command, function (err, arg) {
        if (err)
            error(formatter.errorMessage(err));
        else
            success();
    });
}

// Message
// Pas de torrent
exports.noTorrentsText = 'Mmh 😕 Il semble qu\'il n\'y ait pas de torrent dans la liste ...\nAjoutez-en un en utilisant la commande /addtorrent ou en glissant un fichier .torrent directement dans la conversation 😉';


// Je verifie la liste des torrent toute les 60 seconde
exports.updateTorrentList();
setInterval(exports.updateTorrentList, 60000);