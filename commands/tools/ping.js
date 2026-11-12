const package = require('../../package.json')

module.exports = {
    name: 'ping',
    category: 'tools',
    desc: 'Vérifie la latence et le statut du bot.',
    run: async (sock, m, args, { reply }) => {
        const start = Date.now()
        const { key } = await sock.sendMessage(m.key.remoteJid, { text: 'Pinging... 🚀' }, { quoted: m })
        const end = Date.now()

        const uptime = process.uptime()
        const hours = Math.floor(uptime / 3600)
        const minutes = Math.floor((uptime % 3600) / 60)
        const seconds = Math.floor(uptime % 60)
        const uptimeStr = `${hours}h ${minutes}m ${seconds}s`

        const response = `
🚀 *MW PHANTOM STATUS* 🚀

📡 *Latence:* ${end - start}ms
🆙 *Uptime:* ${uptimeStr}
📦 *Version:* v${package.version}
🤖 *Status:* Connecté & Prêt

_Taper ~menu pour les commandes_
`
        await sock.sendMessage(m.key.remoteJid, { text: response.trim(), edit: key })
    }
}
