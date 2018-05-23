'use strict'

const TelegramBot = require('node-telegram-bot-api');
const DateTime = require('date-and-time');
const transmission = require('./transmission.js');
const config = require('./config.json');
const UserManager = require('./user.js');

// Variable d'utilisateur
var userStates = {};
var userLimit = {};

var userAdmin;


if (UserManager.fileExists()) {
    userAdmin = UserManager.loadFile();
    if (userAdmin) {
        userAdmin = JSON.parse(userAdmin)
    } else {
        userAdmin = {};
    }
} else {
    userAdmin = {};
    UserManager.saveFile(userAdmin);
}

console.log(DateTime.format(new Date(Date.now()), 'DD/MM HH:mm:ss - ') + 'Initialisation du bot...')
const bot = new TelegramBot(config.bot.token, { polling: true });

bot.getMe().then(function (info) {
    console.log(DateTime.format(new Date(Date.now()), 'DD/MM HH:mm:ss - ') + `${info.first_name} is ready, the username is @${info.username}`);
})

bot.on('message', function (msg) {
    console.log(`Message inconnu !
-------- voici les info --------
Date: ${DateTime.format(new Date(msg.date * 1000), 'DD/MM HH:mm')}
Utilisateur: ${msg.chat.username || 'no username'}
Chat ID: ${msg.chat.id}
Nom Prénom: ${msg.from.first_name} ${msg.from.last_name}
Message id: ${msg.message_id}
Message text: ${msg.text || 'no text'}
userStats: ${userStates[msg.from.id] || 'none'}
`);

});


// Start message
bot.onText(/\/start/, function (msg) {
    if (!verifUser(msg.from.id)){
        bot.sendMessage(chatId, "Vous n'êtes pas autorisé a utilise ce bot, vous devez vous identifier avec le commande '/auth VOTRE_MOT_DE_PASSE'");
        return;
    }

    var chatId = msg.chat.id;
    var reply = 'Hey ' + msg.chat.first_name + ' 🙌, Je suis votre 🤖\nJe suis la pour vous permettre de parler a transmission 😊.';
    bot.sendMessage(chatId, reply, transmission.listOfCommandsKeyboard);
});

bot.onText(/\/auth (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const codeAuth = match[1];

    if (userAdmin[msg.from.id]) {
        if (userAdmin[msg.from.id].auth == true) {
            return;
        } else {
            userAdmin[msg.from.id] = {
                auth: true,
                notification: false
            }
            UserManager.saveFile(userAdmin);
            bot.sendMessage(chatId, 'Vous êtes maintenant autorisé à utilise ce bot 🤖 🙌 🙌 🙌', transmission.listOfCommandsKeyboard);
        }
    } else if (config.bot.auth == codeAuth) {

        userAdmin[msg.from.id] = {
            auth: true,
            notification: true
        }
        UserManager.saveFile(userAdmin);
        console.log(DateTime.format(new Date(Date.now()), 'DD/MM HH:mm:ss - ') + msg.from.id + ' ('+msg.from.first_name+') est maintenant autorisé a utilié ce bot ')
        bot.sendMessage(chatId, 'Vous êtes maintenant autorisé à utilise ce bot 🤖 🙌 🙌 🙌', transmission.listOfCommandsKeyboard);
    } else {
        return;
    }

});

// list des torrent
bot.onText(/\/torrentlist|Liste des torrents/, function (msg) {

    if (!verifUser(msg.from.id)) return;

    var chatId = msg.chat.id;


    transmission.getTorrentsList(userLimit[chatId], (msg) => {
        if (transmission.torrents.length == 0)
            bot.sendMessage(chatId, transmission.noTorrentsText, transmission.listOfCommandsKeyboard);
        else
            if (msg.length < 4096) {
                bot.sendMessage(chatId, msg, transmission.listOfCommandsKeyboard);
            } else {
                bot.sendMessage(chatId, "La liste est trop longue pour etre affichée, changer la limit de la liste", transmission.listOfCommandsKeyboard);
            }
    }, (err) => {
        bot.sendMessage(chatId, err);
    });


});

// Reprise torrent
bot.onText(/\/torrentstart|▶️ Start/, function (msg) {
    if (!verifUser(msg.from.id)) return;

    var chatId = msg.chat.id;
    var keyb = transmission.getKeyboardPaused();
    var opts = {
        reply_markup: JSON.stringify({
            keyboard: keyb
        })
    };
    
    if (transmission.torrents.length == 0)
        bot.sendMessage(chatId, transmission.noTorrentsText, transmission.listOfCommandsKeyboard);
    else if (keyb.length == 1)
        bot.sendMessage(chatId, 'All torrents are in download queue', transmission.listOfCommandsKeyboard);
    else{
        bot.sendMessage(chatId,"Quel torrent voulez vous reprendre ?", opts)
        userStates[chatId] = 'start';
    }
 
});

// Stop torrent
bot.onText(/\/torrentstop|⏸ Pause/, function (msg) {
    if (!verifUser(msg.from.id)) return;

    var chatId = msg.chat.id;
    var keyb = transmission.getKeyboardActive();
    var opts = {
        reply_markup: JSON.stringify({
            keyboard: keyb
        })
    };

    if (transmission.torrents.length == 0)
        bot.sendMessage(chatId, transmission.noTorrentsText, transmission.listOfCommandsKeyboard);
    else if (keyb.length == 1)
        bot.sendMessage(chatId, "Tous les torrent sont arrêter", transmission.listOfCommandsKeyboard);
    else {
        bot.sendMessage(chatId, 'Quel torrent voulez vous arrêter ?', opts);
        userStates[chatId] = 'stop';
    }
});

// Remove torrent
bot.onText(/\/torrentremove|❌ Remove/, function (msg) {
    if (!verifUser(msg.from.id)) return;

    var chatId = msg.chat.id;
    var keyb = transmission.getKeyboard();
    var opts = {
        reply_markup: JSON.stringify({
            keyboard: keyb
        })
    };

    if (transmission.torrents.length == 0)
        bot.sendMessage(chatId, transmission.noTorrentsText, transmission.listOfCommandsKeyboard);
    else {
        bot.sendMessage(chatId, '⚠️ Faites attention! Une fois que vous l\'avez supprimé, vous ne pouvez plus le récupérer\nDit-moi le torrent que tu veut supprimer 😊', opts);
        userStates[chatId] = 'remove';
    }
})

// Add a torrent from url
bot.onText(/\/addtorrent|Add torrent/, function (msg) {
    if (!verifUser(msg.from.id)) return;

    var chatId = msg.chat.id;

    bot.sendMessage(chatId, 'Envoyé moi l\'url du torrent ou le fichier .torrent ', transmission.hideKeyboard);
    userStates[chatId] = 'add';
});

bot.onText(/[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/, function (msg) {
    if (!verifUser(msg.from.id)) return;

    var chatId = msg.chat.id;

    var torrentAction = userStates[chatId] || '';
    if (torrentAction == 'add')
        transmission.addTorrent(msg.text, (details) => {
            bot.sendMessage(chatId, details, transmission.listOfCommandsKeyboard);
        }, (err) => {
            bot.sendMessage(chatId, err, transmission.listOfCommandsKeyboard);
        });
});

// Receive a document (for add torrent command)
bot.on('document', function (msg) {
    if (!verifUser(msg.from.id)) return;

    var chatId = msg.chat.id;
    var fileId = msg.document.file_id;
    bot.getFileLink(fileId).then((link) => {
        transmission.addTorrent(link, (details) => {
            bot.sendMessage(chatId, 'Le torrent a été ajouté avec succès, voici quelques informations 👇\n' + details, transmission.listOfCommandsKeyboard);
        }, (err) => {
            bot.sendMessage(chatId, err, transmission.listOfCommandsKeyboard);
        });
    });
});

// Texte (start/pause/remove)
bot.onText(/\d+\) .+/, function (msg) {
    if (!verifUser(msg.from.id)) return;

    var chatId = msg.chat.id;

    var torrentId = msg.text.match(/\d+/)[0];

    var torrentAction = userStates[chatId] || '';

    if (torrentAction == 'start') {
        transmission.startTorrent(torrentId, (details) => {
            bot.sendMessage(chatId, 'Torrent correctement démarrer', transmission.listOfCommandsKeyboard);
        }, (err) => {
            bot.sendMessage(chatId, err, transmission.listOfCommandsKeyboard);
        });
    } else if (torrentAction == 'stop') {
        transmission.pauseTorrent(torrentId, (details) => {
            bot.sendMessage(chatId, 'Torrent mis en pause', transmission.listOfCommandsKeyboard);
        }, (err) => {
            bot.sendMessage(chatId, err, transmission.listOfCommandsKeyboard);
        });
    } else if (torrentAction == 'remove') {
        userStates[chatId] = torrentId;
        bot.sendMessage(chatId, 'Etes-vous sûr de vouloir supprimer ce torrent ?', {
            reply_markup: JSON.stringify({
                keyboard: [['Oui', 'Non', 'Oui Supprimer les données']]
            })
        });
    } else if (torrentAction == 'details') {
        transmission.getTorrentDetails(torrentId, (details) => {
            bot.sendMessage(chatId, details, transmission.listOfCommandsKeyboard);
        }, (err) => {
            bot.sendMessage(chatId, err, transmission.listOfCommandsKeyboard);
        });
    }

});

bot.onText(/Oui|Non|Oui Supprimer les données/, function (msg) {
    if (!verifUser(msg.from.id)) return;

    var chatId = msg.chat.id;

    var torrentId = userStates[chatId] || '';
    var answer = msg.text;

    if (answer == 'Oui') {
        transmission.removeTorrent(torrentId, false, (details) => {
            bot.sendMessage(chatId, 'Torrent supprimé', transmission.listOfCommandsKeyboard);
        }, (err) => {
            bot.sendMessage(chatId, err, transmission.listOfCommandsKeyboard);
        });
    } else if (answer == 'Oui Supprimer les données') {
        transmission.removeTorrent(torrentId, true, (details) => {
            bot.sendMessage(chatId, 'Torrent completement supprimé', transmission.listOfCommandsKeyboard);
        }, (err) => {
            bot.sendMessage(chatId, err, transmission.listOfCommandsKeyboard);
        });
    } else {
        bot.sendMessage(chatId, 'L\'opération a été annulée, Je suis désolé 😪', transmission.listOfCommandsKeyboard);
    }

})

// Get all details about a torrent
bot.onText(/\/torrentstatus|Status/, function (msg) {
    if (!verifUser(msg.from.id)) return;

    var chatId = msg.chat.id;
    var keyb = transmission.getKeyboard();
    var opts = {
        reply_markup: JSON.stringify({
            keyboard: keyb
        })
    };
    if (transmission.torrents.length == 0)
        bot.sendMessage(chatId, transmission.noTorrentsText, transmission.listOfCommandsKeyboard);
    else {
        bot.sendMessage(chatId, 'Choisie un torrent pour voir les details', opts);
        userStates[chatId] = 'details';
    }
});

// Configuration
// setting
bot.onText(/\/settings|⚙ Settings/, function (msg) {
    if (!verifUser(msg.from.id)) return;

    var chatId = msg.chat.id;

    bot.sendMessage(chatId, 'Choisissez un reglege dans la liste', transmission.settingsKeyboard);
})

// retour au menu
bot.onText(/🔙 menu/, function (msg) {
    if (!verifUser(msg.from.id)) return;

    var chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Que voulez vous ?', transmission.listOfCommandsKeyboard);
})


bot.onText(/List limit ([0-9]+)/, (msg, match) => {
    if (!verifUser(msg.from.id)) return;

    const chatId = msg.chat.id;

    const resp = match[1];
    userLimit[chatId] = resp
    bot.sendMessage(chatId, "La limite de la liste est sur " + resp, transmission.listOfCommandsKeyboard);

});

bot.onText(/List Limit/, (msg, match) => {
    if (!verifUser(msg.from.id)) return;

    const chatId = msg.chat.id;
    userStates[chatId] = 'set-limit';

    bot.sendMessage(chatId, "quelle limit veux tu ?", transmission.hideKeyboard);
});


// Qui a besoin de nombre ?
bot.onText(/([0-9]+)/, (msg, match) => {
    if (!verifUser(msg.from.id)) return;

    const chatId = msg.chat.id;

    if (userStates[chatId] == 'set-limit') {
        userStates[chatId] = '';
        userLimit[chatId] = match[1]
        bot.sendMessage(chatId, "La limite de la liste est maintenant de " + userLimit[chatId], transmission.settingsKeyboard);
    }else if (userStates[chatId] == 'start') {
        transmission.startTorrent(match[1], (details) => {
            bot.sendMessage(chatId, 'Torrent correctement démarrer', transmission.listOfCommandsKeyboard);
        }, (err) => {
            bot.sendMessage(chatId, err, transmission.listOfCommandsKeyboard);
        });
    } else if (userStates[chatId] == 'stop') {
        transmission.pauseTorrent(match[1], (details) => {
            bot.sendMessage(chatId, 'Torrent mis en pause', transmission.listOfCommandsKeyboard);
        }, (err) => {
            bot.sendMessage(chatId, err, transmission.listOfCommandsKeyboard);
        });
    } 
});

// Cancel Operation
bot.onText(/Annuler/, function (msg) {
    if (!verifUser(msg.from.id)) return;

    var chatId = msg.chat.id;
    userStates[chatId] = '';
    bot.sendMessage(chatId, 'Opération annulé', transmission.listOfCommandsKeyboard);
})


bot.onText(/Transmission info/, function (msg) {
    if (!verifUser(msg.from.id)) return;

    var chatId = msg.chat.id;
    transmission.getSessionDetails((msg) => {
        bot.sendMessage(chatId, msg, transmission.settingsKeyboard);
    });
})


bot.onText(/Speed Limit/, function (msg) {
    if (!verifUser(msg.from.id)) return;

    var chatId = msg.chat.id;
    transmission.getSpeedLimit((info) => {

        userStates[chatId] = 'set-speed-limit';
        var keyboard = {
            reply_markup: JSON.stringify({
                keyboard: [['Activé 🐢', 'Désactivé 🐇']]
            })
        }

        var msg = 'Speed-Limit désactivé 🐇 , Souhaitez vous l\'activé ?'
        if (info['alt-speed-enabled'] == true) msg = 'Speed-Limit Activé 🐢 , Souhaitez vous le désactiver ?'

        bot.sendMessage(chatId, msg, keyboard);

    });
})

bot.onText(/Notification/, function (msg) {
    if (!verifUser(msg.from.id)) return;

    var chatId = msg.chat.id;

    userStates[chatId] = 'set-notification';
    var keyboard = {
        reply_markup: JSON.stringify({
            keyboard: [['Activé 🔔', 'Désactivé 🔕']]
        })
    }

    var msg = 'Notification désactivé 🔕 , Souhaitez vous l\'activé ?'
    if (userAdmin[chatId].notification == true) msg = 'Notification Activé 🔔 , Souhaitez vous le désactiver ?'

    bot.sendMessage(chatId, msg, keyboard);


})

bot.onText(/Activé|Désactivé|Activé 🐢|Désactivé 🐇|Activé 🔔|Désactivé 🔕/, function (msg) {
    if (!verifUser(msg.from.id)) return;

    var chatId = msg.chat.id;
    var answer = msg.text;

    if (userStates[chatId] == 'set-speed-limit') {
        if (answer == 'Désactivé' || answer == 'Désactivé 🐇') {
            transmission.setSettings({ 'alt-speed-enabled': false }, () => {
                bot.sendMessage(chatId, 'Speed limit désactivé 🐇', transmission.settingsKeyboard);
            }, (err) => {
                bot.sendMessage(chatId, err, transmission.settingsKeyboard);
            });

        } else {
            transmission.setSettings({ 'alt-speed-enabled': true }, () => {
                bot.sendMessage(chatId, 'Speed limit activé 🐢', transmission.settingsKeyboard);
            }, (err) => {
                bot.sendMessage(chatId, err, transmission.settingsKeyboard);
            });
        }
    } else if (userStates[chatId] == 'set-notification') {
        if (answer == 'Désactivé' || answer == "Désactivé 🔕") {
            userAdmin[chatId].notification = false
            bot.sendMessage(chatId, 'Notification Dé-Activé 🔕', transmission.settingsKeyboard);
            UserManager.saveFile(userAdmin);

        }else{
            userAdmin[chatId].notification = true
            bot.sendMessage(chatId, 'Notification Activé 🔔', transmission.settingsKeyboard);
            UserManager.saveFile(userAdmin);
        }
    }

})


// Torrent Fini
// Callback when a torrent is completed
transmission.torrentCompleted = (msg) => {
    for (var k in userAdmin) {
        if (userAdmin.hasOwnProperty(k)) {
            if (userAdmin[k].auth && userAdmin[k].notification) {
                bot.sendMessage(k, msg, transmission.listOfCommandsKeyboard);
            }
        }
    }
};

function verifUser(userId) {
    if (userAdmin[userId]) {
        if (userAdmin[userId].auth == true) {
            return true;
        } else {
            return false;
        }
    } else {
        return false;
    }
}
