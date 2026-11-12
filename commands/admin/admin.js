module.exports = {
    name: 'admin',
    category: 'admin',
    desc: 'Affiche les commandes réservées aux administrateurs.',
    run: async (sock, m, args, { reply, isOwner, isAdmins, commands }) => {
        if (!isOwner && !isAdmins) return reply('❌ Cette commande est réservée aux administrateurs.')

        const organized = []
        const processed = new Set()

        commands.forEach((cmdModule, cmdName) => {
            if (processed.has(cmdModule)) return
            processed.add(cmdModule)
            if (cmdModule.name === 'admin') return

            if (cmdModule.category === 'admin') {
                organized.push({
                    name: cmdModule.name,
                    desc: cmdModule.desc || 'Pas de description.'
                })
            }
        })

        let text = `👑 *MENU ADMINISTRATION*\n\n`
        organized.sort((a, b) => a.name.localeCompare(b.name)).forEach(cmd => {
            text += `🔹 *${global.prefix || '~'}${cmd.name}* : _${cmd.desc}_\n`
        })

        reply(text.trim())
    }
}
