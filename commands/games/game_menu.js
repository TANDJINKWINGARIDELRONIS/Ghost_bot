module.exports = {
    name: 'game',
    category: 'games',
    desc: 'Affiche les jeux disponibles.',
    commands: ['game', 'games', 'divertissement', 'listgame'],
    run: async (sock, m, args, { reply, commands }) => {
        const organized = []
        const processed = new Set()

        commands.forEach((cmdModule, cmdName) => {
            if (processed.has(cmdModule)) return
            processed.add(cmdModule)
            if (cmdModule.name === 'game') return

            if (cmdModule.category === 'games') {
                organized.push({
                    name: cmdModule.name,
                    desc: cmdModule.desc || 'Pas de description.'
                })
            }
        })

        let text = `🎮 *ZONE DE JEUX MW PHANTOM* 🎮\n\n`
        organized.sort((a, b) => a.name.localeCompare(b.name)).forEach(cmd => {
            text += `▸ *${global.prefix || '~'}${cmd.name}* : _${cmd.desc}_\n`
        })

        text += `\n👉 *Amusez-vous bien !*`
        reply(text.trim())
    }
}
