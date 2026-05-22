// ╔══════════════════════════════════════╗
// ║          ⚡ GHOST BOT PING ⚡         ║
// ╚══════════════════════════════════════╝

'use strict';

const os = require('os');
const settings = require('../../settings.js');

function formatUptime(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);

    return [
        h > 0 ? `${h}h` : '',
        m > 0 ? `${m}m` : '',
        `${s}s`
    ].filter(Boolean).join(' ');
}

async function pingCommand(sock, chatId, message) {
    try {
        const start = Date.now();

        const temp = await sock.sendMessage(
            chatId,
            { text: '⚡ *Testing speed...*' },
            { quoted: message }
        );

        const ping = Date.now() - start;

        const pingStatus =
            ping < 150 ? '🟢 Excellent' :
                ping < 350 ? '🟡 Stable' :
                    '🔴 Slow';

        const ramUsed = (
            process.memoryUsage().heapUsed / 1024 / 1024
        ).toFixed(1);

        const botText = `
╭━━━〔 👻 GHOST BOT 〕━━━⬣
┃ ⚡ Speed  : ${ping} ms
┃ 📡 Status : ${pingStatus}
┃ ⏳ Uptime : ${formatUptime(process.uptime())}
┃ 💾 RAM    : ${ramUsed} MB
┃ 🖥️ System : ${os.platform()}
┃ 🟩 Node   : ${process.version}
┃ 📦 Version: v${settings.version || '1.0.0'}
╰━━━━━━━━━━━━━━━━━━⬣`;

        await sock.sendMessage(
            chatId,
            {
                text: botText,
                edit: temp.key
            }
        );

    } catch (err) {
        console.error(err);

        await sock.sendMessage(chatId, {
            text: '❌ Impossible de récupérer le ping.'
        }, { quoted: message });
    }
}

module.exports = pingCommand;