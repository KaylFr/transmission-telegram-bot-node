'use strict'

const DateTime = require('date-and-time');
const Handlebars = require('handlebars');
const pretty = require('prettysize');



var exports = module.exports = {};

const torrentStatus = ['Stopped', 'Check wait', 'Check', 'Download wait', 'Download', 'Seed wait', 'Seed', 'Isolated'];

// Handlebars helper
Handlebars.registerHelper('getStatusType', (type) => {
    return torrentStatus[type] || 'Unknown';
});
Handlebars.registerHelper('torrentPercentage', (percent) => {
    return (percent * 100).toFixed(2) + '%';
})
Handlebars.registerHelper('getRemainingTime', (seconds) => {
    if (seconds < 0 || seconds >= (999 * 60 * 60))
        return 'remaining time unknown';

    var days = Math.floor(seconds / 86400),
        hours = Math.floor((seconds % 86400) / 3600),
        minutes = Math.floor((seconds % 3600) / 60),
        seconds = Math.floor(seconds % 60),
        d = days + ' ' + (days > 1 ? 'jours' : 'jour'),
        h = hours + ' ' + (hours > 1 ? 'heures' : 'heure'),
        m = minutes + ' ' + (minutes > 1 ? 'minutes' : 'minute'),
        s = seconds + ' ' + (seconds > 1 ? 'secondes' : 'seconde');

    if (days) {
        if (days >= 4 || !hours)
            return d + ' restant';
        return d + ', ' + h + ' restant';
    }
    if (hours) {
        if (hours >= 4 || !minutes)
            return h + ' restant';
        return h + ', ' + m + ' restant';
    }
    if (minutes) {
        if (minutes >= 4 || !seconds)
            return m + ' restant';
        return m + ', ' + s + ' restant';
    }

    return s + ' restant';
})
Handlebars.registerHelper('speed', (value) => {
    return pretty(value);
})
Handlebars.registerHelper('parseDate', (date) => {
    // See #10
    if (date == 0) return new Date();

    var mEpoch = parseInt(date);
    mEpoch *= 1000;
    return new Date(mEpoch);
})
Handlebars.registerHelper('formatDate', (date, format) => {
    return DateTime.format(date, format);
})
Handlebars.registerHelper('differenceBeetwenDates', (firstDate, secondDate) => {
    let seconds = DateTime.subtract(secondDate, firstDate).toSeconds();
    let string = '';
    let sec_num = parseInt(seconds, 10);
    let hours = Math.floor(sec_num / 3600);
    let minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    seconds = sec_num - (hours * 3600) - (minutes * 60);

    if (hours > 0)
        string += hours + ' heures, ';
    if (minutes > 0)
        string += minutes + ' minutes, ';
    if (seconds > 0)
        string += seconds + ' secondes';
    if (string.length == 0)
        string = 'problème';
    return string;
})
Handlebars.registerHelper('enableOrNot', (enable) => { return enable ? 'enabled' : 'not enabled' })


// Message d'erreur
exports.errorMessage = (err) => {
    return 'error 😰, details:\n' + err;
}

/* List torrent Template */
let torrentsListTemplate = `<strong>Liste des torrents actuels et leur statut:</strong>
{{#each this}}
{{id}}) {{name}} (<strong>{{getStatusType status}}</strong>)
➗ {{torrentPercentage percentDone}}
⌛️ {{getRemainingTime eta}}
⬇️ {{speed rateDownload}}/s - ⬆️ {{speed rateUpload}}/s

{{/each}}`;

exports.torrentsList = Handlebars.compile(torrentsListTemplate, { noEscape: true });

/* Complete torrent template */
let completeTorrentTemplate = `Hey !, un torrent a été télécharger completement 🙌\nVoici quelques détails 👇:
<strong>{{name}}</strong>

📅 {{formatDate (parseDate addedDate) 'DD/MM HH:mm'}} - {{formatDate (parseDate doneDate) 'DD/MM HH:mm'}}
🕔 {{differenceBeetwenDates (parseDate addedDate) (parseDate doneDate)}}
Taille: {{speed sizeWhenDone}}

📂 {{downloadDir}}
`;
exports.formatComplete = Handlebars.compile(completeTorrentTemplate, { noEscape: true });

/* Torrent details template */
let torrentDetailsTemplate = `{{name}}

Status = <strong>{{getStatusType status}}</strong>
⌛️ {{getRemainingTime eta}}
➗ <strong>{{torrentPercentage percentDone}}</strong>
⬇️ {{speed rateDownload}}/s - ⬆️ {{speed rateUpload}}/s

Taille: {{speed sizeWhenDone}}
📅 Ajouté le : {{formatDate (parseDate addedDate) 'dddd, DD MMMM HH:mm'}}
📂 {{downloadDir}}
👥 Peers connected: {{peersConnected}}
`;

exports.torrentDetails = Handlebars.compile(torrentDetailsTemplate, { noEscape: true });


exports.formatComplete = Handlebars.compile(completeTorrentTemplate, { noEscape: true });

/* Session details */
let sessionDetailsTemplate = `<strong>Transmission version: {{version}}</strong>
Config dir: <pre>{{config-dir}}</pre>

<strong>Espace libre: {{speed download-dir-free-space}}</strong>
Download directory: <pre>{{download-dir}}</pre>
Incomplete directory{{#if incomplete-dir-enabled}}: <pre>{{incomplete-dir}}</pre>{{else}} <strong>not enabled</strong>{{/if}}


🐢 Limitation vitesse {{#if alt-speed-enabled}}: Activé{{else}} Désactiver{{/if}}

⬇️ Speed limit{{#if speed-limit-down-enabled}}: {{speed-limit-down}}kB/s{{else}} not enabled{{/if}}
⬆️ Speed limit{{#if speed-limit-up-enabled}}: {{speed-limit-up}}kB/s{{else}} not enabled{{/if}}

👥 Peers limit:
• Global = {{peer-limit-global}}
• Per torrent = {{peer-limit-per-torrent}}

Download queue {{enableOrNot download-queue-enabled}}
`;
exports.sessionDetails = Handlebars.compile(sessionDetailsTemplate, { noEscape: true });

/* New torrent added template */
let newTorrentTemplate = `Torrent ajouté 👌, des infos sur celui-ci :
• <strong>ID torrent:</strong> {{id}};
• <strong>Name:</strong> {{name}}
`;
exports.newTorrent = Handlebars.compile(newTorrentTemplate, { noEscape: true });