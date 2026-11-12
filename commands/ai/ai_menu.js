module.exports = {
    name: 'aimenu',
    category: 'ai',
    desc: 'Affiche les commandes d\'intelligence artificielle.',
    commands: ['ia', 'aimenu', 'ai_menu'],
    run: async (sock, m, args, { reply, commands }) => {
        const organized = []
        const processed = new Set()

        commands.forEach((cmdModule, cmdName) => {
            if (processed.has(cmdModule)) return
            processed.add(cmdModule)
            if (cmdModule.name === 'aimenu') return

            if (cmdModule.category === 'ai') {
                organized.push({
                    name: cmdModule.name,
                    desc: cmdModule.desc || 'Pas de description.'
                })
            }
        })

        let text = `🧠 *MW PHANTOM AI* 🧠\n\n`
        organized.forEach(cmd => {
            text += `✨ *${global.prefix || '~'}${cmd.name}* : _${cmd.desc}_\n`
        })

        text += `\n👉 *Posez vos questions au bot !*`
        reply(text.trim())
    }
}
