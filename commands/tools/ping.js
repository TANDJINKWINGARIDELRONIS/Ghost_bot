// ╔══════════════════════════════════════════════════════════════╗
// ║              🚀  PING COMMAND  🚀                            ║
// ║              Statut et latence du bot                        ║
// ╚══════════════════════════════════════════════════════════════╝

'use strict';

const os       = require('os');
const settings = require('../../settings.js');

// ─────────────────────────────────────────────
//  🕐  FORMATAGE DU TEMPS D'ACTIVITÉ
// ─────────────────────────────────────────────

function formatUptime(seconds) {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    const parts = [];
    if (d > 0) parts.push(`${d}j`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);

    return parts.join(' ');
}

// ─────────────────────────────────────────────
//  🌡️  BARRE DE SANTÉ MÉMOIRE
// ─────────────────────────────────────────────

function memoryBar(usedMB, totalMB) {
    const pct   = usedMB / totalMB;
    const filled = Math.round(pct * 10);
    const bar   = '█'.repeat(filled) + '░'.repeat(10 - filled);
    return `${bar} ${Math.round(pct * 100)}%`;
}

// ─────────────────────────────────────────────
//  🚀  COMMANDE PRINCIPALE
// ─────────────────────────────────────────────

async function pingCommand(sock, chatId, message) {
    try {
        // Mesure de la latence aller-retour
        const start = Date.now();
        await sock.sendMessage(chatId, { text: '🏓 *Pong !*' }, { quoted: message });
        const ping = Math.round((Date.now() - start) / 2);

        // Données système
        const uptime   = formatUptime(process.uptime());
        const memUsed  = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
        const memTotal = Math.round(os.totalmem() / 1024 / 1024);
        const memFree  = Math.round(os.freemem()  / 1024 / 1024);
        const cpuModel = os.cpus()[0]?.model?.split(' ').slice(0, 3).join(' ') || 'N/A';
        const platform = `${os.type()} ${os.arch()}`;
        const nodeVer  = process.version;

        // Indicateur de qualité du ping
        const pingEmoji = ping < 200 ? '🟢' : ping < 500 ? '🟡' : '🔴';

        const botInfo =
`╔══════════════════════════════════════╗
║       🤖  *GHOST BOT — STATUS*  🤖    ║
╚══════════════════════════════════════╝

${pingEmoji}  *Latence :*       ${ping} ms
⏱️  *Uptime :*        ${uptime}
📦  *Version :*       v${settings.version ?? '1.0.0'}
🟢  *Statut :*        En ligne

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💾  *RAM utilisée :*  ${memUsed} Mo
💿  *RAM totale :*    ${memTotal} Mo
🆓  *RAM libre :*     ${memFree} Mo
📊  *Utilisation :*   ${memoryBar(memUsed, memTotal)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🖥️  *Plateforme :*   ${platform}
⚙️  *CPU :*          ${cpuModel}
🟩  *Node.js :*      ${nodeVer}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ *GHOST BOT*  •  Puissant • Rapide • Intelligent`;

        await sock.sendMessage(chatId, { text: botInfo }, { quoted: message });

    } catch (error) {
        console.error('❌ [PING] Erreur:', error.message);
        await sock.sendMessage(chatId, {
            text: '❌ *Impossible de récupérer le statut du bot.*'
        }, { quoted: message });
    }
}

module.exports = pingCommand;
