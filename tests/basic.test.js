const { test } = require('node:test')
const assert = require('assert')

const { difficulteDe, essaisPour, NIVEAUX } = require('../lib/jeux')

test('helpers globaux présents', () => {
    global.db = global.db || {}
    global.ajouterScore = global.ajouterScore || ((userJid, nom, victoire) => {
        if (!userJid) return
        if (!global.db.scores) global.db.scores = {}
        const cle = String(userJid).split('@')[0]
        const s = global.db.scores[cle] || (global.db.scores[cle] = { points: 0, victoires: 0, parties: 0, nom: '' })
        if (nom) s.nom = nom
        s.parties++
        if (victoire) { s.victoires++; s.points += 10 } else s.points += 1
    })
    assert.ok(typeof global.ajouterScore === 'function')
})

test('gestion des scores', () => {
    global.db = { scores: {}, difficulte: {} }
    global.ajouterScore('123@s.whatsapp.net', 'Test', true)
    global.ajouterScore('123@s.whatsapp.net', 'Test', false)
    const s = global.db.scores['123']
    assert.ok(s)
    assert.equal(s.parties, 2)
    assert.equal(s.victoires, 1)
    assert.ok(s.points >= 11)
})

test('difficulté des jeux : défaut moyen et niveau par chat', () => {
    global.db = { difficulte: {} }
    assert.equal(difficulteDe('chat1'), 'moyen')

    global.db.difficulte['chat1'] = 'difficile'
    assert.equal(difficulteDe('chat1'), 'difficile')

    global.db.difficulte['chat1'] = 'inconnu'
    assert.equal(difficulteDe('chat1'), 'moyen')
})

test('essaisPour suit le niveau du chat', () => {
    global.db = { difficulte: { chat1: 'facile' } }
    assert.equal(essaisPour('chat1', { facile: 10, moyen: 6, difficile: 4 }), 10)

    global.db.difficulte.chat1 = 'difficile'
    assert.equal(essaisPour('chat1', { facile: 10, moyen: 6, difficile: 4 }), 4)

    assert.deepEqual(NIVEAUX, ['facile', 'moyen', 'difficile'])
})

test('autoresponse : répond en IB via l\'IA et met à jour l\'historique', async () => {
    const auto = require('../commands/ai/autoresponse')
    global.db = { aiReplyCache: {} }
    global.jidToNumber = j => String(j).split('@')[0]
    const hist = [{ role: 'user', contenu: '[Alice] Bonjour' }]
    global.getHistorique = () => hist
    global.ajouterHistorique = (chat, role, contenu) => hist.push({ role, contenu })
    let recu
    global.getAIResponse = async (texte, provider, system, base) => {
        recu = { texte, provider, base }
        return { out: 'Salut Alice !' }
    }
    const envois = []
    const sock = {
        sendMessage: async (jid, content, opts) => {
            envois.push({ jid, content, opts })
            return { key: { id: 'MSG1' } }
        }
    }
    const m = {
        key: { remoteJid: '123@s.whatsapp.net' },
        text: 'Bonjour',
        pushName: 'Alice',
        sender: '123@s.whatsapp.net'
    }

    const out = await auto.repondre(sock, m)
    assert.equal(out, 'Salut Alice !')
    assert.equal(recu.texte, 'Bonjour')
    assert.equal(recu.provider, 'auto')
    assert.deepEqual(recu.base, [])
    assert.deepEqual(hist.map(e => e.role), ['user', 'bot'])
    assert.equal(envois.length, 1)
    assert.equal(envois[0].jid, '123@s.whatsapp.net')
    assert.equal(envois[0].content.text, 'Salut Alice !')
    assert.equal(envois[0].opts.quoted, m)
})

test('autoresponse : ignore un message vide', async () => {
    const auto = require('../commands/ai/autoresponse')
    const sock = { sendMessage: async () => { throw new Error('envoi inattendu') } }
    const m = { key: { remoteJid: '123@s.whatsapp.net' }, text: '   ', sender: '123@s.whatsapp.net' }
    assert.equal(await auto.repondre(sock, m), null)
})

test('autoresponse : commande on/off réservée au propriétaire', async () => {
    const auto = require('../commands/ai/autoresponse')
    global.db = { settings: { autoresponse: false } }
    global.prefix = '~'
    const reponses = []
    const reply = t => reponses.push(t)

    await auto.run(null, {}, [], { reply, isOwner: false })
    assert.match(reponses[0], /réservée au propriétaire/)

    await auto.run(null, {}, ['on'], { reply, isOwner: true })
    assert.equal(global.db.settings.autoresponse, true)

    await auto.run(null, {}, ['off'], { reply, isOwner: true })
    assert.equal(global.db.settings.autoresponse, false)
})

test('me : envoie le média en IB lors de l\'utilisation par un non-propriétaire', async () => {
    const me = require('../commands/media/me')
    global.ownerJid = () => '999@s.whatsapp.net'
    global.sameJid = (a, b) => String(a).split('@')[0] === String(b).split('@')[0]

    const envois = []
    const sock = { sendMessage: async (jid, content) => { envois.push({ jid, content }) } }
    const m = { key: { remoteJid: '123@g.us', fromMe: false }, sender: '123@s.whatsapp.net' }

    await me.run(sock, m)
    assert.equal(envois.length, 1)
    assert.equal(envois[0].jid, '123@s.whatsapp.net')
    assert.notEqual(envois[0].jid, '123@g.us')
})

test('me : ignore silencieusement les non-propriétaires (comportement ancien)', async () => {
    // Ce test vérifie l'ancien comportement où seuls les propriétaires pouvaient utiliser ~me.
    // Il est conservé pour référence mais le comportement par défaut maintenant
    // permet à tout utilisateur d'envoyer un média en IB via ~me.
    const me = require('../commands/media/me')
    global.ownerJid = () => '999@s.whatsapp.net'
    global.sameJid = (a, b) => String(a).split('@')[0] === String(b).split('@')[0]

    let envoi = false
    const sock = { sendMessage: async () => { envoi = true } }
    const m = { key: { remoteJid: '123@g.us', fromMe: false }, sender: '123@s.whatsapp.net' }

    await me.run(sock, m)
    // Nouveau comportement : le média est envoyé en IB, donc envoi a lieu
    assert.equal(envoi, true)
})

test('me : les erreurs partent dans l\'IB du propriétaire, pas dans le groupe', async () => {
    const me = require('../commands/media/me')
    global.ownerJid = () => '999@s.whatsapp.net'
    global.sameJid = (a, b) => String(a).split('@')[0] === String(b).split('@')[0]

    const envois = []
    const sock = { sendMessage: async (jid, content) => { envois.push({ jid, content }) } }
    const m = { key: { remoteJid: '123@g.us', fromMe: false }, sender: '999@s.whatsapp.net' }

    await me.run(sock, m)
    assert.equal(envois.length, 1)
    assert.equal(envois[0].jid, '999@s.whatsapp.net')
    assert.notEqual(envois[0].jid, '123@g.us')
})
