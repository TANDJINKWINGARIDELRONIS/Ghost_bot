// ╔══════════════════════════════════════════════════════════════╗
// ║              🛠️  TOOLS COMMAND  🛠️                           ║
// ║              Menu des commandes générales                    ║
// ╚══════════════════════════════════════════════════════════════╝

'use strict';

// ✅ FIX — Suppression des imports fs/path/settings inutilisés
//    (imagePath n'était jamais défini → ReferenceError garanti)

async function toolsCommand(sock, chatId, message) {
    const sender       = message.key.participant || message.key.remoteJid;
    const senderNumber = sender.split('@')[0];

    const genhelp =
`╔══════════════════════════════════════╗
║     🛠️  *GHOST BOT — OUTILS*  🛠️      ║
╚══════════════════════════════════════╝

👋 Salut @${senderNumber} !
Voici toutes les commandes générales.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚙️  *BASIQUES*

  🏓  \`#ping\`
       ↳ Latence & statut du bot

  🤖  \`#alive\`
       ↳ Infos générales sur le bot

  ℹ️  \`#groupinfo\`
       ↳ Informations sur le groupe actuel

  📋  \`#help\`
       ↳ Menu principal complet

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🖼️  *MÉDIA & MODIFICATION*

  📸  \`#chip\`
       ↳ Photo de profil d'un utilisateur
       ↳ Réponds à un message ou mentionne

  🎭  \`#sticker\` _ou_ \`#s\`
       ↳ Convertit une image en sticker

  🖼️  \`#simage\`
       ↳ Convertit un sticker en image
       ↳ Réponds à un sticker

  👁️  \`#extract\`
       ↳ Extrait un média en vue unique

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔜  *À VENIR*

  ⏳  Nouvelles commandes en cours…
       ↳ Reste connecté pour les nouveautés !

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ *GHOST BOT*  •  Puissant • Rapide • Intelligent`;

    // ✅ FIX — Envoi direct sans vérification d'image inexistante
    await sock.sendMessage(chatId, {
        text    : genhelp,
        mentions: [sender]
    }, { quoted: message });
}

module.exports = toolsCommand;
