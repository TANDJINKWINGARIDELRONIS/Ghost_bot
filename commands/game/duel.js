// ╔══════════════════════════════════════════════════════════════╗
// ║              ⚔️  DUEL DE SAVOIRS  ⚔️                          ║
// ║     Défie un membre sur des questions de culture générale    ║
// ╚══════════════════════════════════════════════════════════════╝

'use strict';

require('dotenv').config({ path: require('path').join(process.cwd(), 'Api.env') });
const OpenAI = require('openai');

// ─────────────────────────────────────────────
//  📚  CATÉGORIES
// ─────────────────────────────────────────────

const CATEGORIES = [
    'Histoire mondiale',
    'Géographie',
    'Sciences et nature',
    'Sport',
    'Cinéma et séries',
    'Musique',
    'Culture africaine',
    'Technologie et informatique',
    'Littérature',
    'Gastronomie du monde'
];

// ─────────────────────────────────────────────
//  🔵  GÉNÉRATION DE QUESTION — DEEPSEEK
// ─────────────────────────────────────────────

async function generateQuestion() {
    const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];

    const client = new OpenAI({
        apiKey : process.env.WISDOM_API_KEY,
        baseURL: 'https://wisdom-gate.juheapi.com/v1'
    });

    const prompt =
        `Tu es un maître de quiz. Génère UNE question de culture générale sur le thème : "${category}".\n` +
        `La question doit être intéressante, pas trop facile, pas trop difficile.\n\n` +
        `Réponds UNIQUEMENT en JSON valide (sans markdown, sans backticks) :\n` +
        `{\n` +
        `  "category": "${category}",\n` +
        `  "question": "...",\n` +
        `  "answer": "...",\n` +
        `  "hint": "Indice discret en une phrase",\n` +
        `  "explanation": "Explication courte de la réponse"\n` +
        `}`;

    const completion = await client.chat.completions.create({
        model      : 'deepseek-r1',
        messages   : [
            {
                role   : 'system',
                content: 'Tu es un maître de quiz expert. Tu réponds UNIQUEMENT en JSON valide, sans markdown, sans backticks, sans texte supplémentaire.'
            },
            {
                role   : 'user',
                content: prompt
            }
        ],
        temperature: 0.7
    });

    const raw  = completion.choices[0].message.content;
    const text = raw.trim().replace(/```json|```/g, '').trim();
    return JSON.parse(text);
}

// ─────────────────────────────────────────────
//  📦  ÉTAT DES DUELS EN COURS
//  Map<chatId, DuelState>
// ─────────────────────────────────────────────

const activeDuels = new Map();

// ─────────────────────────────────────────────
//  🔧  NORMALISATION DES RÉPONSES
// ─────────────────────────────────────────────

function normalize(str) {
    return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '')
        .trim();
}

function isCorrect(userAnswer, correctAnswer) {
    const u = normalize(userAnswer);
    const c = normalize(correctAnswer);
    return u === c || u.includes(c) || c.includes(u);
}

// ─────────────────────────────────────────────
//  ⚔️  COMMANDE — #duel @membre
// ─────────────────────────────────────────────

async function duelCommand(sock, chatId, senderId, message) {
    try {
        // ── Duel déjà en cours ───────────────────────────────────
        if (activeDuels.has(chatId)) {
            return sock.sendMessage(chatId, {
                text:
                    `╔══════════════════════════════════╗\n` +
                    `║       ⚔️  *DUEL EN COURS*         ║\n` +
                    `╚══════════════════════════════════╝\n\n` +
                    `⚠️ Un duel est déjà en cours !\n\n` +
                    `Attendez qu'il se termine ou tapez\n` +
                    `\`#duelstop\` pour l'annuler.`
            }, { quoted: message });
        }

        // ── Vérifie qu'un adversaire est mentionné ───────────────
        const mentionedJids = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const opponent      = mentionedJids[0];

        if (!opponent) {
            return sock.sendMessage(chatId, {
                text:
                    `╔══════════════════════════════════╗\n` +
                    `║       ⚔️  *DUEL DE SAVOIRS*       ║\n` +
                    `╚══════════════════════════════════╝\n\n` +
                    `⚠️ *Mentionne un adversaire !*\n\n` +
                    `📖 Usage : \`#duel @membre\`\n\n` +
                    `💡 Le premier à répondre correctement gagne !`
            }, { quoted: message });
        }

        if (opponent === senderId) {
            return sock.sendMessage(chatId, {
                text: `😂 Tu ne peux pas te défier toi-même !`
            }, { quoted: message });
        }

        const challengerName = senderId.split('@')[0];
        const opponentName   = opponent.split('@')[0];

        // ── Annonce du duel ──────────────────────────────────────
        await sock.sendMessage(chatId, {
            text:
                `╔══════════════════════════════════╗\n` +
                `║   ⚔️  *DUEL DE SAVOIRS !*  ⚔️    ║\n` +
                `╚══════════════════════════════════╝\n\n` +
                `🥊 @${challengerName} défie @${opponentName} !\n\n` +
                `🧠 *Préparez-vous...*\n` +
                `📚 Une question arrive dans *3 secondes*\n\n` +
                `⏱️ Vous aurez *45 secondes* pour répondre\n` +
                `💡 Un indice sera donné après *20 secondes*`,
            mentions: [senderId, opponent]
        }, { quoted: message });

        await new Promise(r => setTimeout(r, 3000));

        // ── Génération de la question ────────────────────────────
        let questionData;
        try {
            questionData = await generateQuestion();
        } catch (e) {
            console.error('❌ [DUEL] Erreur génération:', e.message);
            activeDuels.delete(chatId);
            return sock.sendMessage(chatId, {
                text:
                    `╔══════════════════════════════════╗\n` +
                    `║       ⚔️  *DUEL ANNULÉ*           ║\n` +
                    `╚══════════════════════════════════╝\n\n` +
                    `❌ Impossible de générer une question.\n` +
                    `Réessaie dans quelques secondes !`
            });
        }

        // ── Crée et stocke l'état du duel ────────────────────────
        const duelState = {
            challenger  : senderId,
            opponent    : opponent,
            question    : questionData,
            startTime   : Date.now(),
            ended       : false,
            hintTimer   : null,
            timeoutTimer: null
        };
        activeDuels.set(chatId, duelState);

        // ── Pose la question ─────────────────────────────────────
        await sock.sendMessage(chatId, {
            text:
                `╔══════════════════════════════════╗\n` +
                `║  🧠  *${(questionData.category || 'CULTURE G.').toUpperCase().slice(0, 18)}*\n` +
                `╚══════════════════════════════════╝\n\n` +
                `❓ *${questionData.question}*\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `👥 @${challengerName}  ⚔️  @${opponentName}\n` +
                `⏱️ *45 secondes — À vous de jouer !*`,
            mentions: [senderId, opponent]
        });

        // ── Indice après 20 secondes ─────────────────────────────
        duelState.hintTimer = setTimeout(async () => {
            const duel = activeDuels.get(chatId);
            if (!duel || duel.ended) return;

            await sock.sendMessage(chatId, {
                text:
                    `╔══════════════════════════════════╗\n` +
                    `║       💡  *INDICE*                ║\n` +
                    `╚══════════════════════════════════╝\n\n` +
                    `🔍 ${questionData.hint}\n\n` +
                    `⏱️ *25 secondes restantes...*`,
                mentions: [senderId, opponent]
            });
        }, 20000);

        // ── Timeout après 45 secondes ────────────────────────────
        duelState.timeoutTimer = setTimeout(async () => {
            const duel = activeDuels.get(chatId);
            if (!duel || duel.ended) return;

            duel.ended = true;
            clearTimeout(duel.hintTimer);
            activeDuels.delete(chatId);

            await sock.sendMessage(chatId, {
                text:
                    `╔══════════════════════════════════╗\n` +
                    `║       ⏰  *TEMPS ÉCOULÉ !*        ║\n` +
                    `╚══════════════════════════════════╝\n\n` +
                    `😅 @${challengerName} et @${opponentName}\n` +
                    `   ont tous les deux échoué !\n\n` +
                    `✅ *La réponse était :*\n` +
                    `   ${questionData.answer}\n\n` +
                    `📖 *Explication :*\n${questionData.explanation}\n\n` +
                    `🤝 _Match nul — aucun point !_`,
                mentions: [senderId, opponent]
            });
        }, 45000);

    } catch (err) {
        console.error('❌ [DUEL] Erreur:', err.message);
        activeDuels.delete(chatId);
        await sock.sendMessage(chatId, {
            text: `❌ Erreur lors du lancement du duel. Réessaie !`
        }, { quoted: message });
    }
}

// ─────────────────────────────────────────────
//  📩  VÉRIFICATION DES RÉPONSES
//  Appelé depuis main.js sur chaque message
// ─────────────────────────────────────────────

async function checkDuelAnswer(sock, chatId, senderId, userMessage) {
    try {
        const duel = activeDuels.get(chatId);
        if (!duel || duel.ended) return false;

        // Seuls les deux joueurs peuvent répondre
        if (senderId !== duel.challenger && senderId !== duel.opponent) return false;

        // Mauvaise réponse → on ne fait rien
        if (!isCorrect(userMessage, duel.question.answer)) return false;

        // ── Bonne réponse ! ──────────────────────────────────────
        duel.ended = true;
        clearTimeout(duel.hintTimer);
        clearTimeout(duel.timeoutTimer);
        activeDuels.delete(chatId);

        const winnerName = senderId.split('@')[0];
        const loserJid   = senderId === duel.challenger ? duel.opponent : duel.challenger;
        const loserName  = loserJid.split('@')[0];
        const timeTaken  = ((Date.now() - duel.startTime) / 1000).toFixed(1);

        const titles = [
            '🏆 GÉNIE ABSOLU',
            '🔥 INARRÊTABLE',
            '🧠 CERVEAU D\'ÉLITE',
            '⚡ ÉCLAIR DE GÉNIE',
            '👑 CHAMPION INCONTESTÉ'
        ];
        const title = titles[Math.floor(Math.random() * titles.length)];

        await sock.sendMessage(chatId, {
            text:
                `╔══════════════════════════════════╗\n` +
                `║   🏆  *DUEL TERMINÉ !*  🏆       ║\n` +
                `╚══════════════════════════════════╝\n\n` +
                `🎉 *@${winnerName} GAGNE !*\n` +
                `${title}\n\n` +
                `⏱️ *Temps :* ${timeTaken} secondes\n` +
                `✅ *Réponse :* ${duel.question.answer}\n\n` +
                `📖 *Explication :*\n${duel.question.explanation}\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `😔 @${loserName} retourne réviser ! 📚`,
            mentions: [senderId, loserJid]
        });

        return true;

    } catch (err) {
        console.error('❌ [DUEL] checkDuelAnswer error:', err.message);
        return false;
    }
}

// ─────────────────────────────────────────────
//  🛑  ANNULER UN DUEL — #duelstop
// ─────────────────────────────────────────────

async function duelStopCommand(sock, chatId, senderId, message) {
    try {
        const duel = activeDuels.get(chatId);

        if (!duel) {
            return sock.sendMessage(chatId, {
                text: `ℹ️ Aucun duel en cours dans ce groupe.`
            }, { quoted: message });
        }

        if (senderId !== duel.challenger && senderId !== duel.opponent && !message.key.fromMe) {
            return sock.sendMessage(chatId, {
                text: `🚫 Seuls les joueurs peuvent annuler le duel.`
            }, { quoted: message });
        }

        duel.ended = true;
        clearTimeout(duel.hintTimer);
        clearTimeout(duel.timeoutTimer);
        activeDuels.delete(chatId);

        await sock.sendMessage(chatId, {
            text:
                `╔══════════════════════════════════╗\n` +
                `║       ⚔️  *DUEL ANNULÉ*           ║\n` +
                `╚══════════════════════════════════╝\n\n` +
                `🏳️ Le duel a été annulé.\n\n` +
                `✅ *La réponse était :* ${duel.question.answer}\n\n` +
                `📖 ${duel.question.explanation}`
        }, { quoted: message });

    } catch (err) {
        console.error('❌ [DUEL] duelStopCommand error:', err.message);
    }
}

// ─────────────────────────────────────────────
//  📤  EXPORTS
// ─────────────────────────────────────────────

module.exports = {
    duelCommand,
    checkDuelAnswer,
    duelStopCommand
};
