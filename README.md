<h1 align="center">Transmission Bot for Telegram</h1>

Un bot pour controlé votre serveur transmission depuis n'importe où

Avec ce botre vous pouvez :
- Voir les torrent en cours
- Ajouté un torrent (par url ou par fichier .torrent)
- Arreté un torrent
- Démarrer un torrnet

<b>Comment l'installer</b>
Récuperer les fichier depuis ce github

1/ Créer votre bot
Commencer un chat avec <b>@BotFather</b>, Envoyer la commande <code>/newbot</code> suivez les instruction de @BotFather

2/ Configurer le bot
Modifier le fichier <b>config.json</b> en y ajoutant le token du bot créer via BotFather

```
{
    "bot": {
        "token": "votre token ici",
        "auth":"mypassword"
    },
    "transmission": {
        "address": "ip du serveur transmission",
        "path": "/transmission/rpc",
        "credentials": {
            "username": "",
            "password": ""
        },
        "port": 9091
    }
}
```

En utilisant votre terminal, allez dans le dossier contenue le bot et entrer la commande <code>npm install</code>

3/ Lancer le bot
Avec le commande <code>node server.js</code>

4/ S'authentifier a votre bot
Dans télégram dans un conversation avec votre bot dite : <code>/auth</code> suivit du mot de passe que vous aurez mi dans le fichier <b>config.json</b>

