// ╔══════════════════════════════════════════════════════════════╗
// ║              🛡️  ADMIN HELP COMMAND  🛡️                      ║
// ║              Panneau d'aide — Commandes Admin                ║
// ╚══════════════════════════════════════════════════════════════╝

'use strict';

async function adminCommand(sock, chatId, message) {
    const sender       = message.key.participant || message.key.remoteJid;
    const senderNumber = sender.split('@')[0];

    const genhelp =
        `╔══════════════════════════════════════╗\n` +
        `║    🛡️  *GHOST BOT — ADMIN PANEL*  🛡️  ║\n` +
        `╚══════════════════════════════════════╝\n\n` +
        `👋 Salut @${senderNumber} !\n\n` +
        `⚠️ *Le bot doit être ADMIN du groupe*\n` +
        `   pour que ces commandes fonctionnent.\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🔐  *GESTION DU GROUPE*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `  🔒  \`#mute\`\n` +
        `       ↳ Fermer le groupe (admins seulement)\n\n` +
        `  🔓  \`#unmute\`\n` +
        `       ↳ Ouvrir le groupe à tous\n\n` +
        `  👑  \`#promote @membre\`\n` +
        `       ↳ Promouvoir un membre en admin\n\n` +
        `  🚫  \`#demote @membre\`\n` +
        `       ↳ Retirer les droits admin\n\n` +
        `  👢  \`#kick @membre\`\n` +
        `       ↳ Expulser un membre du groupe\n\n` +
        `  ➕  \`#add numéro\`\n` +
        `       ↳ Ajouter un membre au groupe\n\n` +
        `  🔄  \`#resetlink\`\n` +
        `       ↳ Réinitialiser le lien d'invitation\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📢  *OUTILS ADMIN*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `  📣  \`#tagall\`\n` +
        `       ↳ Mentionner tous les membres\n\n` +
        `  🗑️  \`#delete\`\n` +
        `       ↳ Supprimer un message (réponds au msg)\n\n` +
        `  🛡️  \`#antidelete on/off\`\n` +
        `       ↳ Intercepter les messages supprimés\n\n` +
        `  🚫  \`#antilink on/off\`\n` +
        `       ↳ Bloquer les liens dans le groupe\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `⚡ *GHOST BOT*  •  Puissant • Rapide • Discret`;

    await sock.sendMessage(chatId, {
        text    : genhelp,
        mentions: [sender]
    }, { quoted: message });
}

module.exports = adminCommand;
