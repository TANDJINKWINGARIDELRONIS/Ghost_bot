const fs = require('fs');
const path = require('path');

const USER_GROUP_DATA = path.join(__dirname, '../data/userGroupData.json');

const emojiIntents = {
    greeting: ['👋', '😊', '🙌'],
    positive: ['❤️', '🔥', '💯', '✨', '👏'],
    funny: ['😂', '🤣', '😹'],
    sad: ['😢', '🥺', '💔'],
    angry: ['😡', '🤬', '⚠️'],
    question: ['🤔', '❓'],
    surprise: ['😲', '😮', '😱'],
    love: ['😍', '❤️‍🔥', '😘'],
    agreement: ['👍', '👌'],
    disagreement: ['👎', '🙄'],
    spam: ['🚫'],
    neutral: ['🤖', '👀']
};

function loadAutoReactionState() {
    try {
        if (fs.existsSync(USER_GROUP_DATA)) {
            const data = JSON.parse(fs.readFileSync(USER_GROUP_DATA));
            return data.autoReaction || false;
        }
    } catch (error) {
        console.error('Erreur chargement réactions automatiques :', error);
    }
    return false;
}

function saveAutoReactionState(state) {
    try {
        const data = fs.existsSync(USER_GROUP_DATA)
            ? JSON.parse(fs.readFileSync(USER_GROUP_DATA))
            : { groups: [], chatbot: {} };

        data.autoReaction = state;
        fs.writeFileSync(USER_GROUP_DATA, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Erreur sauvegarde réactions automatiques :', error);
    }
}

let isAutoReactionEnabled = loadAutoReactionState();

function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function analyzeMessage(text = '') {
    const msg = text.toLowerCase();

    if (/bonjour|salut|hello|yo|bonsoir/.test(msg))
        return pickRandom(emojiIntents.greeting);

    if (/merci|cool|top|super|parfait|bien/.test(msg))
        return pickRandom(emojiIntents.positive);

    if (/lol|mdr|😂|🤣/.test(msg))
        return pickRandom(emojiIntents.funny);

    if (/triste|mal|pleure|😭|😢/.test(msg))
        return pickRandom(emojiIntents.sad);

    if (/fuck|merde|con|putain|bordel/.test(msg))
        return pickRandom(emojiIntents.angry);

    if (msg.includes('?'))
        return pickRandom(emojiIntents.question);

    if (/wow|incroyable|omg|😮|😱/.test(msg))
        return pickRandom(emojiIntents.surprise);

    if (/je t'aime|love|❤️|😍/.test(msg))
        return pickRandom(emojiIntents.love);

    if (/oui|ok|d'accord|👌|👍/.test(msg))
        return pickRandom(emojiIntents.agreement);

    if (/non|jamais|🙄|👎/.test(msg))
        return pickRandom(emojiIntents.disagreement);

    if (msg.length < 2)
        return pickRandom(emojiIntents.spam);

    return pickRandom(emojiIntents.neutral);
}

async function reactToAllMessages(sock, message) {
    try {
        if (!isAutoReactionEnabled) return;
        if (!message?.key?.id) return;

        const text =
            message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            '';

        // Évite de réagir aux messages du bot lui-même
        if (message.key.fromMe) return;

        // Seule réaction aux commandes (commençant par '#')
        if (!text.trim().startsWith('#')) return;

        const emoji = analyzeMessage(text);

        await sock.sendMessage(message.key.remoteJid, {
            react: {
                text: emoji,
                key: message.key
            }
        });

    } catch (error) {
        console.error('Erreur réaction automatique :', error);
    }
}


async function handleAreactCommand(sock, chatId, message, isOwner) {
    try {
        if (!isOwner) {
            await sock.sendMessage(chatId, {
                text: '❌ Cette commande est réservée au propriétaire du bot.',
                quoted: message
            });
            return;
        }

        const args = message.message?.conversation?.split(' ') || [];
        const action = args[1];

        if (action === 'on') {
            isAutoReactionEnabled = true;
            saveAutoReactionState(true);
            await sock.sendMessage(chatId, {
                text: '✅ Les réactions automatiques sont ACTIVÉES pour tous les groupes.',
                quoted: message
            });
        } else if (action === 'off') {
            isAutoReactionEnabled = false;
            saveAutoReactionState(false);
            await sock.sendMessage(chatId, {
                text: '✅ Les réactions automatiques sont DÉSACTIVÉES.',
                quoted: message
            });
        } else {
            await sock.sendMessage(chatId, {
                text:
`ℹ️ Réactions automatiques : *${isAutoReactionEnabled ? 'ACTIVÉES' : 'DÉSACTIVÉES'}*

Utilisation :
.areact on  → Activer
.areact off → Désactiver`,
                quoted: message
            });
        }
    } catch (error) {
        console.error('Erreur commande areact :', error);
    }
}

module.exports = {
    reactToAllMessages,
    handleAreactCommand
};
