module.exports = {
    name: 'chatbot',
    category: 'settings',
    desc: 'Active/Désactive la réponse automatique de l\'IA quand vous êtes tagué.',
    commands: ['chatbot', 'autoai'],
    run: async (sock, m, args, { reply, isOwner }) => {
        if (!isOwner) return reply('❌ Commande réservée au propriétaire.')
        const p = global.prefix || '~'
        const valeur = (args[0] || '').toLowerCase()

        if (!valeur) {
            return reply(
                `🤖 *Mode chatbot* : ${global.db.settings.chatbot ? 'activé ✅' : 'désactivé ❌'}\n\n` +
                `_Utilisation :_ \`${p}chatbot on\` ou \`${p}chatbot off\``
            )
        }

        if (valeur === 'on') {
            global.db.settings.chatbot = true
            return reply('✅ Mode chatbot *activé* : le bot répondra aux mentions, à son nom et aux réponses à ses messages.')
        }
        if (valeur === 'off') {
            global.db.settings.chatbot = false
            return reply('✅ Mode chatbot *désactivé* : plus de réponse automatique. Utilisez `' + p + 'ai` pour interroger l\'IA.')
        }

        return reply(`Usage : \`${p}chatbot on\` ou \`${p}chatbot off\``)
    }
}
