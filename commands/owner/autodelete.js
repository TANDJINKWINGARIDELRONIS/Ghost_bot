const fs = require('fs');
const path = require('path');
const isOwnerOrSudo = require('../../lib/isOwner');

const CONFIG_PATH = path.join(__dirname, '../../data/autodelete.json');

if (!fs.existsSync(CONFIG_PATH)) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({
        enabled: false,
        delay: 5
    }, null, 2));
}

function getConfig() {
    return JSON.parse(fs.readFileSync(CONFIG_PATH));
}

function saveConfig(data) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2));
}

async function handleAutoDeleteCommand(sock, msg, args) {

    const chatId = msg.key.remoteJid;

    if (!chatId.endsWith('@g.us')) {
        return sock.sendMessage(chatId, {
            text: "⚠️ Cette commande fonctionne seulement dans les groupes."
        });
    }

    const senderId = msg.key.participant || msg.key.remoteJid;

    const isOwner = await isOwnerOrSudo(senderId, sock, chatId);

    if (!isOwner) {
        return sock.sendMessage(chatId, {
            text: "❌ Commande réservée au Owner / Sudo."
        });
    }

    const config = getConfig();

    if (!args[0]) {
        return sock.sendMessage(chatId, {
            text:
`⚙️ *AutoDelete*

*autodelete on*
*autodelete off*
*autodelete 5*

Exemple :
*autodelete 5* → supprime les messages après 5 minutes`
        });
    }

    if (args[0] === "on") {

        config.enabled = true;
        saveConfig(config);

        return sock.sendMessage(chatId, {
            text: "✅ AutoDelete activé."
        });
    }

    if (args[0] === "off") {

        config.enabled = false;
        saveConfig(config);

        return sock.sendMessage(chatId, {
            text: "❌ AutoDelete désactivé."
        });
    }

    const minutes = parseInt(args[0]);

    if (isNaN(minutes)) {
        return sock.sendMessage(chatId, {
            text: "⚠️ Donne un nombre valide."
        });
    }

    config.enabled = true;
    config.delay = minutes;

    saveConfig(config);

    return sock.sendMessage(chatId, {
        text: `✅ AutoDelete activé\n⏱ suppression après ${minutes} minute(s)`
    });
}

async function autoDeleteHandler(sock, msg) {

    const config = getConfig();

    if (!config.enabled) return;

    const chatId = msg.key.remoteJid;

    if (!chatId.endsWith('@g.us')) return;

    if (!msg.key.fromMe) return;

    const delay = config.delay * 60 * 1000;

    setTimeout(async () => {

        try {

            await sock.sendMessage(chatId, {
                delete: msg.key
            });

        } catch (err) {
            console.log("AutoDelete error:", err);
        }

    }, delay);
}

module.exports = {
    handleAutoDeleteCommand,
    autoDeleteHandler
};