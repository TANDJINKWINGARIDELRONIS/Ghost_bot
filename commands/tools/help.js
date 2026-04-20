// ╔══════════════════════════════════════════════════════════════╗
// ║              🤖  HELP COMMAND  🤖                            ║
// ║              Menu principal du bot                           ║
// ╚══════════════════════════════════════════════════════════════╝

'use strict';

// ✅ FIX — Suppression des imports fs/path/settings inutilisés
//    (imagePath n'était jamais défini → ReferenceError garanti)

async function helpCommand(sock, chatId, message, channelLink) {
    const sender       = message.key.participant || message.key.remoteJid;
    const senderNumber = sender.split('@')[0];

    const helpMessage =
`╔══════════════════════════════════════╗
║       🤖  *GHOST BOT — MENU*  🤖      ║
╚══════════════════════════════════════╝

👋 Salut @${senderNumber} !
Voici toutes les catégories disponibles.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🛠️  *OUTILS GÉNÉRAUX*
   ↳ Commande : \`#tools\`
   Ping, stickers, profil, groupe…

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🧠  *INTELLIGENCE ARTIFICIELLE*
   ↳ Commande : \`#ia\`
   GPT, Gemini, TTS, Météo, Traduction…

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📥  *TÉLÉCHARGEMENTS*
   ↳ Commande : \`#data\`
   YouTube, médias, contenus…

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎮  *JEUX*
   ↳ Commande : \`#game\`
   TicTacToe, jeux interactifs…

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔐  *ADMINISTRATION*
   ↳ Commande : \`#admin\`
   Kick, mute, antilink, tagall…

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👑  *PROPRIÉTAIRE*
   ↳ Commande : \`#owner\`
   Mode, sudo, session, profil…

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚡ *GHOST BOT*  •  Puissant • Rapide • Intelligent`;

    // ✅ FIX — Envoi direct sans vérification d'image inexistante
    await sock.sendMessage(chatId, {
        text    : helpMessage,
        mentions: [sender]
    }, { quoted: message });
}

module.exports = helpCommand;
