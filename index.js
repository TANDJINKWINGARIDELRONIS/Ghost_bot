require('./settings')
require('dotenv').config()

const { Boom } = require('@hapi/boom')
const fs = require('fs')
const path = require('path')
const axios = require('axios')
const chalk = require('chalk')
const pino = require('pino')
const NodeCache = require('node-cache')
const express = require('express')

const { handleMessages, handleGroupParticipantUpdate, handleStatus } = require('./main')
const { reactToAllMessages } = require('./lib/reactions')
const autoResponse = require('./commands/owner/autoreponse')
const { handleBadwordDetection } = require('./lib/antibadword')
const { autoDeleteHandler } = require('./commands/owner/autodelete')
const store = require('./lib/lightweight_store')
const settings = require('./settings')

const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    delay,
    Browsers,
} = require('@whiskeysockets/baileys')

// ─────────────────────────────────────────────
//  ⚙️  CONFIG
// ─────────────────────────────────────────────

const OWNER_NUMBER = '237655562634'

// Préfixes — position 0 = owner (IMMUABLE), suite = utilisateurs
const PREFIX_LIST = ['#', '!', '*', '$', '&', '?', '%', '.']

const MAX_USERS = 4
const SESSIONS_DIR = path.join(__dirname, 'sessions')
const BOT_START_TIME = Date.now()

global.botname = 'Ghost Bot'
global.themeemoji = '👻'

// ─────────────────────────────────────────────
//  📋  LOGS WEB
// ─────────────────────────────────────────────

const WEB_LOGS = []
const _loggedMsgs = new Set()   // anti-doublon
let logSequence = 0

function addLog(message) {
    // Déduplication : ignorer les messages identiques consécutifs
    if (_loggedMsgs.has(message)) return
    _loggedMsgs.add(message)
    setTimeout(() => _loggedMsgs.delete(message), 8000)

    logSequence++
    const entry = { id: logSequence, time: new Date().toLocaleTimeString(), msg: message }
    WEB_LOGS.push(entry)
    if (WEB_LOGS.length > 300) WEB_LOGS.shift()
    console.log(message)
}

// ─────────────────────────────────────────────
//  STATE
// ─────────────────────────────────────────────

/**
 * bots         : { number → socket }
 * userPrefixes : { number → prefix }
 * reconnectAttempts : { number → count }
 * reconnectTimers   : { number → timeoutId }  (évite les reconnexions doubles)
 */
const bots = {}
const userPrefixes = {}
const reconnectAttempts = {}
const reconnectTimers = {}

global.userPrefixes = userPrefixes
global.messageCount = 0

store.readFromFile()
setInterval(() => store.writeToFile(), settings.storeWriteInterval || 10_000)

// ─────────────────────────────────────────────
//  🗂  PRÉFIXES
// ─────────────────────────────────────────────

/**
 * Assigne un préfixe unique.
 * Owner → toujours '#' (PREFIX_LIST[0]).
 * Autres → premier préfixe libre dans PREFIX_LIST[1..].
 * Le préfixe de l'owner ne peut jamais être écrasé.
 */
function assignPrefix(number) {
    if (number === OWNER_NUMBER) return PREFIX_LIST[0]

    // Si déjà assigné, le conserver
    if (userPrefixes[number] && number !== OWNER_NUMBER) return userPrefixes[number]

    const used = new Set(Object.values(userPrefixes))
    const available = PREFIX_LIST.slice(1).filter(p => !used.has(p))
    return available.length > 0 ? available[0] : PREFIX_LIST[1]
}

/** Réserve immédiatement le préfixe pour éviter les conflits en cas de connexions simultanées */
function reservePrefix(number) {
    if (userPrefixes[number]) return userPrefixes[number]   // déjà réservé
    const prefix = assignPrefix(number)
    userPrefixes[number] = prefix
    return prefix
}

// ─────────────────────────────────────────────
//  🔍  VÉRIFICATION SESSION
// ─────────────────────────────────────────────

/**
 * Retourne true si le dossier sessions/<number> contient des credentials Baileys valides.
 */
function sessionExists(number) {
    const sessionPath = path.join(SESSIONS_DIR, number)
    if (!fs.existsSync(sessionPath)) return false

    // Baileys stocke creds.json dans le dossier de session
    const credsFile = path.join(sessionPath, 'creds.json')
    if (!fs.existsSync(credsFile)) return false

    try {
        const creds = JSON.parse(fs.readFileSync(credsFile, 'utf8'))
        // Un compte est "registered" si me et noiseKey sont présents
        return !!(creds?.me?.id || creds?.registered)
    } catch {
        return false
    }
}

// ─────────────────────────────────────────────
//  🤖  DÉMARRAGE BOT
// ─────────────────────────────────────────────

/**
 * options.usePairingCode  : forcer le mode pairing code (true/false)
 *   - Si omis, la logique décide selon la présence de session
 * options.resolveCode     : callback (code) → appelé quand le pairing code est prêt
 * options.resolveError    : callback (err)  → appelé en cas d'erreur
 */
async function startBot(number, options = {}) {
    // Nettoyage d'un timer de reconnexion en attente
    if (reconnectTimers[number]) {
        clearTimeout(reconnectTimers[number])
        delete reconnectTimers[number]
    }

    const sessionPath = path.join(SESSIONS_DIR, number)
    fs.mkdirSync(sessionPath, { recursive: true })

    const hasSession = sessionExists(number)
    const isOwner = number === OWNER_NUMBER
    const wantPairingCode = options.usePairingCode !== undefined
        ? options.usePairingCode
        : !hasSession  // Si pas de session → pairing code

    addLog(`🔄 Démarrage bot ${number} | session:${hasSession ? '✅' : '❌'} | mode:${wantPairingCode ? 'pairing' : 'restore'}`)

    let { state: authState, saveCreds } = await useMultiFileAuthState(sessionPath)
    const { version } = await fetchLatestBaileysVersion()

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        auth: authState,
        printQRInTerminal: false,   // JAMAIS de QR en terminal
        browser: Browsers.ubuntu('Chrome'),
        connectTimeoutMs: 60_000,
        keepAliveIntervalMs: 25_000,
        msgRetryCounterCache: new NodeCache(),
        // Désactiver la génération QR pour le owner — inutile car
        // printQRInTerminal est false pour tout le monde
    })

    // Enregistrement immédiat pour éviter les doublons
    bots[number] = sock
    store.bind(sock.ev)
    sock.ev.on('creds.update', saveCreds)

    // ── Pairing code (uniquement si pas de session) ───────────────
    if (wantPairingCode && !hasSession) {
        // Laisser le temps à la connexion WebSocket de s'établir
        await delay(2500)

        try {
            addLog(`📱 Demande de pairing code pour ${number}...`)
            let rawCode = await sock.requestPairingCode(number)
            const code = rawCode.match(/.{1,4}/g).join('-')
            addLog(`✅ Pairing code généré pour ${number}: ${code}`)

            if (typeof options.resolveCode === 'function') {
                options.resolveCode(code)
            }
        } catch (err) {
            addLog(`❌ Erreur pairing code pour ${number}: ${err.message}`)
            if (typeof options.resolveError === 'function') {
                options.resolveError(err)
            }
        }
    }

    // ── Messages ──────────────────────────────────────────────────
    sock.ev.on('messages.upsert', async (chatUpdate) => {
        try {
            if (chatUpdate.type !== 'notify') return
            const mek = chatUpdate.messages[0]

            await reactToAllMessages(sock, mek)
            if (!mek.message) return

            await autoResponse(sock, mek)
            await autoDeleteHandler(sock, mek)

            mek.message = (Object.keys(mek.message)[0] === 'ephemeralMessage')
                ? mek.message.ephemeralMessage.message
                : mek.message

            if (mek.key?.remoteJid === 'status@broadcast') {
                await handleStatus(sock, chatUpdate)
                return
            }

            if (!mek?.message) return
            if (!sock.public && !mek.key.fromMe && chatUpdate.type === 'notify') {
                const isGroup = mek.key?.remoteJid?.endsWith('@g.us')
                if (!isGroup) return
            }
            if (mek.key.id.startsWith('BAE5') && mek.key.id.length === 16) return
            if (sock?.msgRetryCounterCache) sock.msgRetryCounterCache.clear()

            global.messageCount = (global.messageCount || 0) + 1

            try {
                await handleMessages(sock, chatUpdate, true)
            } catch (err) {
                console.error('Erreur dans handleMessages :', err)
                if (mek.key?.remoteJid) {
                    await sock.sendMessage(mek.key.remoteJid, {
                        text: '❌ Une erreur est survenue lors du traitement de votre message.'
                    })
                }
            }
        } catch (err) {
            console.error('❌ Erreur messages.upsert :', err)
        }
    })

    // ── Connexion ─────────────────────────────────────────────────
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update

        // QR reçu — uniquement loggé, jamais utilisé pour l'owner
        if (qr) {
            if (isOwner) {
                addLog(`⚠️ QR ignoré pour owner ${number} — Seul le pairing code est autorisé`)
            } else {
                addLog(`📷 QR Code disponible pour ${number}`)
            }
        }

        if (connection === 'connecting') {
            addLog(`🔄 Connexion WhatsApp en cours pour ${number}...`)
        }

        if (connection === 'open') {
            reconnectAttempts[number] = 0   // reset compteur de tentatives
            addLog(`✅ ${number} connecté avec succès`)
            addLog(`👻 Ghost Bot opérationnel pour ${number} — Prefix: ${userPrefixes[number]}`)

            // Message de bienvenue
            try {
                const botJid = sock.user?.id?.split(':')[0] + '@s.whatsapp.net'
                await sock.sendMessage(botJid, {
                    text:
                        `👻 *Ghost Bot connecté !*\n\n` +
                        `⏰ *Heure* : ${new Date().toLocaleString()}\n` +
                        `✅ *Statut* : En ligne\n` +
                        `🔑 *Prefix* : ${userPrefixes[number] || '#'}`
                })
            } catch (err) {
                // Non bloquant
            }
        }

        if (connection === 'close') {
            const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode
            addLog(`⚠️ Connexion fermée pour ${number} — Code: ${statusCode}`)

            // Déconnexion volontaire (logout) → on nettoie tout
            if (statusCode === DisconnectReason.loggedOut) {
                addLog(`❌ ${number} déconnecté définitivement (loggedOut)`)
                _cleanupBot(number, true)
                return
            }

            // Conflit de session (connexion depuis un autre appareil)
            if (statusCode === DisconnectReason.connectionReplaced) {
                addLog(`⚠️ Session ${number} remplacée par un autre appareil`)
                _cleanupBot(number, false)
                return
            }

            // Toute autre raison → reconnexion avec backoff exponentiel
            _scheduleReconnect(number)
        }
    })

    sock.ev.on('group-participants.update', async (update) => {
        try {
            await handleGroupParticipantUpdate(sock, update)
        } catch (err) {
            console.error('Erreur group-participants.update :', err)
        }
    })

    return sock
}

// ─────────────────────────────────────────────
//  🔄  RECONNEXION INTELLIGENTE
// ─────────────────────────────────────────────

/**
 * Planifie une reconnexion avec délai exponentiel.
 * Délais : 3s → 6s → 12s → 24s → 48s → max 60s
 */
function _scheduleReconnect(number) {
    // Éviter les doubles planifications
    if (reconnectTimers[number]) return

    const attempts = reconnectAttempts[number] || 0
    const delayMs = Math.min(3000 * Math.pow(2, attempts), 60_000)

    addLog(`🔄 Reconnexion ${number} dans ${Math.round(delayMs / 1000)}s (tentative ${attempts + 1})`)

    reconnectTimers[number] = setTimeout(async () => {
        delete reconnectTimers[number]
        reconnectAttempts[number] = attempts + 1

        try {
            _cleanupSocket(number)
            await startBot(number, { usePairingCode: false })
        } catch (err) {
            addLog(`❌ Échec reconnexion ${number}: ${err.message}`)
            _scheduleReconnect(number)
        }
    }, delayMs)
}

/** Ferme proprement le socket sans toucher à la session */
function _cleanupSocket(number) {
    if (bots[number]) {
        try { bots[number].end() } catch { }
        delete bots[number]
    }
}

/** Supprime complètement un bot (socket + préfixe + éventuellement session) */
function _cleanupBot(number, deleteSession = false) {
    _cleanupSocket(number)

    if (reconnectTimers[number]) {
        clearTimeout(reconnectTimers[number])
        delete reconnectTimers[number]
    }

    // On ne supprime JAMAIS le préfixe de l'owner
    if (number !== OWNER_NUMBER) {
        delete userPrefixes[number]
    }

    if (deleteSession) {
        const sessionPath = path.join(SESSIONS_DIR, number)
        if (fs.existsSync(sessionPath)) {
            fs.rmSync(sessionPath, { recursive: true, force: true })
            addLog(`🗑️ Session ${number} supprimée`)
        }
    }

    delete reconnectAttempts[number]
}

// ─────────────────────────────────────────────
//  🌍  SERVEUR EXPRESS
// ─────────────────────────────────────────────

const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json())

const dashDir = path.join(__dirname, 'dashboard')
if (fs.existsSync(dashDir)) {
    app.use(express.static(dashDir))
    addLog('📊 Dashboard disponible dans /dashboard')
}

// ── Pages HTML ───────────────────────────────

app.get('/', (req, res) => {
    const p = path.join(dashDir, 'index.html')
    if (fs.existsSync(p)) return res.sendFile(p)
    const fallback = path.join(__dirname, 'index.html')
    if (fs.existsSync(fallback)) return res.sendFile(fallback)
    res.send('👻 Ghost Bot actif.')
})

    ;['pair', 'users', 'visual', 'admin', 'qr', 'connection', 'terminal'].forEach(page => {
        app.get('/' + page, (req, res) => {
            const p = path.join(dashDir, 'index.html')
            if (fs.existsSync(p)) return res.sendFile(p)
            res.status(404).send('Page introuvable')
        })
    })

// ── Actions & Middleware Administrateur ───────

const adminAuth = (req, res, next) => {
    const password = req.headers['x-admin-password']
    if (password === (process.env.ADMIN_PASSWORD || '1234')) {
        next()
    } else {
        res.status(401).json({ error: true, message: 'Mot de passe administrateur incorrect ou manquant' })
    }
}

// Nettoie récursivement un dossier
function clearDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) return 0
    let clearedCount = 0
    const files = fs.readdirSync(dirPath)
    for (const file of files) {
        const fullPath = path.join(dirPath, file)
        try {
            if (fs.lstatSync(fullPath).isDirectory()) {
                fs.rmSync(fullPath, { recursive: true, force: true })
            } else {
                fs.unlinkSync(fullPath)
            }
            clearedCount++
        } catch (err) {
            // Ignorer silencieusement si verrouillé
        }
    }
    return clearedCount
}

app.post('/admin/clearcache', adminAuth, (req, res) => {
    let totalCleared = 0
    totalCleared += clearDirectory(path.join(__dirname, 'cache'))
    totalCleared += clearDirectory(path.join(__dirname, 'temp'))
    totalCleared += clearDirectory(path.join(__dirname, 'tmp'))
    
    addLog(`🧹 Cache serveur vidé par l'administrateur (${totalCleared} fichiers/dossiers supprimés)`)
    res.json({ success: true, filesCleared: totalCleared })
})

app.post('/admin/reconnect', adminAuth, async (req, res) => {
    const activeNumbers = Object.keys(bots)
    if (activeNumbers.length === 0) {
        return res.json({ success: false, message: 'Aucun bot actif à reconnecter' })
    }
    
    addLog(`📡 Reconnexion forcée de ${activeNumbers.length} bot(s) par l'administrateur`)
    
    for (const number of activeNumbers) {
        try {
            _cleanupSocket(number)
            startBot(number, { usePairingCode: false }).catch(err => {
                addLog(`❌ Échec de reconnexion pour ${number}: ${err.message}`)
            })
        } catch (err) {
            addLog(`❌ Erreur de reconnexion pour ${number}: ${err.message}`)
        }
    }
    
    res.json({ success: true, message: `Reconnexion forcée lancée pour ${activeNumbers.length} bot(s)` })
})

app.post('/admin/restart', adminAuth, (req, res) => {
    addLog('🔄 Redémarrage du serveur demandé par l\'administrateur...')
    res.json({ success: true, message: 'Redémarrage du serveur en cours...' })
    
    setTimeout(() => {
        process.exit(0)
    }, 1000)
})

app.post('/admin/shutdown', adminAuth, (req, res) => {
    addLog('⏹ Arrêt complet du serveur demandé par l\'administrateur...')
    res.json({ success: true, message: 'Arrêt du serveur en cours...' })
    
    Object.keys(bots).forEach(number => {
        _cleanupSocket(number)
    })
    
    setTimeout(() => {
        process.exit(0)
    }, 1000)
})

// ── GET /status ───────────────────────────────

app.get('/status', (req, res) => {
    const list = Object.keys(bots).map(num => ({
        number: num,
        prefix: userPrefixes[num] || PREFIX_LIST[0],
        isOwner: num === OWNER_NUMBER,
    }))

    res.json({
        connected: list.length > 0,
        users: list.length,
        messages: global.messageCount || 0,
        list,
        startTime: BOT_START_TIME,
    })
})

// ── POST /connect ─────────────────────────────
//
// Logique :
//   1. Numéro absent → erreur
//   2. Slots pleins  → erreur
//   3. Bot déjà enregistré (session valide) → erreur "déjà connecté"
//   4. Socket existant mais non enregistré  → re-demander pairing code
//   5. Nouveau bot → démarrer + retourner pairing code
//
app.post('/connect', async (req, res) => {
    const { number } = req.body

    if (!number) {
        return res.json({ error: true, message: 'Numéro manquant' })
    }

    // Garantir que le préfixe owner est toujours '#'
    if (number === OWNER_NUMBER) {
        userPrefixes[number] = PREFIX_LIST[0]
    }

    // Vérifier si une session valide existe déjà → connexion auto, pas de code
    if (sessionExists(number) && bots[number]) {
        return res.json({
            error: true,
            message: `${number} est déjà connecté via session existante`,
        })
    }

    // Slots pleins (en comptant les bots réellement actifs)
    const activeCount = Object.keys(bots).length
    if (activeCount >= MAX_USERS && !bots[number]) {
        return res.json({
            error: true,
            message: `Maximum d'utilisateurs atteint (${MAX_USERS})`,
        })
    }

    // Réserver le préfixe avant tout démarrage
    reservePrefix(number)
    addLog(`[CONNECT] Numéro: ${number} — Prefix: ${userPrefixes[number]}`)

    // Si le socket existe déjà (démarrage en cours), on re-demande juste le code
    if (bots[number]) {
        try {
            await delay(1500)
            let raw = await bots[number].requestPairingCode(number)
            const code = raw.match(/.{1,4}/g).join('-')
            addLog(`📲 Code re-généré pour ${number}: ${code}`)
            return res.json({ code, prefix: userPrefixes[number] })
        } catch (err) {
            return res.json({ error: true, message: 'Impossible de re-générer le code: ' + err.message })
        }
    }

    // Nouveau bot — on démarre et on retourne le code via Promise
    try {
        const code = await new Promise(async (resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Timeout: code non reçu dans les 30 secondes'))
            }, 30_000)

            await startBot(number, {
                usePairingCode: true,
                resolveCode: (c) => { clearTimeout(timeout); resolve(c) },
                resolveError: (e) => { clearTimeout(timeout); reject(e) },
            })
        })

        return res.json({ code, prefix: userPrefixes[number] })

    } catch (err) {
        addLog(`❌ /connect erreur pour ${number}: ${err.message}`)
        // Nettoyage partiel si le bot n'est pas encore enregistré
        if (!sessionExists(number)) _cleanupBot(number, false)
        return res.json({ error: true, message: err.message || 'Erreur de connexion' })
    }
})

// ── POST /disconnect ──────────────────────────

app.post('/disconnect', async (req, res) => {
    const { number } = req.body

    if (!number) {
        return res.json({ error: true, message: 'Numéro requis' })
    }

    if (!bots[number]) {
        return res.json({ error: true, message: 'Bot introuvable' })
    }

    try {
        await bots[number].logout()
    } catch {
        // logout peut échouer si déjà déconnecté
    }

    _cleanupBot(number, true)
    addLog(`❌ Bot ${number} déconnecté manuellement`)
    res.json({ success: true, message: 'Bot déconnecté et session supprimée' })
})

// ── GET /logs ─────────────────────────────────

app.get('/logs', (req, res) => res.json(WEB_LOGS))

// ── GET /log (ancienne interface) ─────────────

app.get('/log', (req, res) => res.json(global.COMMAND_LOGS || []))

// ── GET /paircode ─────────────────────────────

app.get('/paircode', (req, res) => {
    // Retourne le code du owner si disponible
    res.json({ code: null, message: 'Utilisez POST /connect pour générer un code' })
})

// ── GET /prefix/:number ───────────────────────

app.get('/prefix/:number', (req, res) => {
    res.json({ prefix: userPrefixes[req.params.number] || PREFIX_LIST[0] })
})

// ── GET /qr-verif (legacy) ────────────────────

app.get('/qr-verif', (req, res) => res.json({ qr: null }))

// ─────────────────────────────────────────────
//  🚀  DÉMARRAGE SERVEUR
// ─────────────────────────────────────────────

app.listen(PORT, async () => {
    addLog(`🌍 Serveur HTTP actif sur le port ${PORT}`)
    addLog(`📊 Dashboard : http://localhost:${PORT}`)
    addLog(`👻 Ghost Bot v4.0 démarré`)

    // Préfixe owner fixé dès le départ
    userPrefixes[OWNER_NUMBER] = PREFIX_LIST[0]

    // Démarrage auto du owner
    addLog(`👑 Démarrage du compte owner: ${OWNER_NUMBER}`)

    // Délai court pour laisser Express s'installer
    setTimeout(async () => {
        try {
            const hasSession = sessionExists(OWNER_NUMBER)

            if (hasSession) {
                // ── CAS 1 : Session existante → restauration directe ──────
                addLog(`✅ Session owner trouvée — Restauration automatique`)
                await startBot(OWNER_NUMBER, { usePairingCode: false })
            } else {
                // ── CAS 2 : Pas de session → pairing code via dashboard ───
                addLog(`ℹ️ Aucune session owner — Utilisez le dashboard pour générer un pairing code`)
                addLog(`💡 Allez sur la page "Connexion" et cliquez "Connecter Owner"`)
            }
        } catch (err) {
            addLog(`❌ Erreur démarrage owner: ${err.message}`)
        }
    }, 2000)
})

// ─────────────────────────────────────────────
//  🔁  AUTO-PING RENDER (toutes les 5 minutes)
// ─────────────────────────────────────────────

setInterval(async () => {
    try {
        const url = process.env.RENDER_EXTERNAL_URL
        if (!url) return
        await axios.get(url)
    } catch {
        // Silencieux
    }
}, 5 * 60_000)

// ─────────────────────────────────────────────
//  🧹  GESTION MÉMOIRE
// ─────────────────────────────────────────────

setInterval(() => {
    if (global.gc) global.gc()
}, 60_000)

setInterval(() => {
    const used = process.memoryUsage().rss / 1024 / 1024
    if (used > 1024) {
        addLog(`⚠️ RAM critique (${Math.round(used)}MB) — Redémarrage...`)
        process.exit(1)
    }
}, 30_000)

// ─────────────────────────────────────────────
//  🛡️  ERREURS GLOBALES
// ─────────────────────────────────────────────

process.on('uncaughtException', (err) => {
    console.error('⚠️ Exception non capturée :', err)
    addLog(`⚠️ Exception: ${err.message}`)
})

process.on('unhandledRejection', (err) => {
    console.error('⚠️ Promesse rejetée :', err)
    addLog(`⚠️ Promesse rejetée: ${err?.message || err}`)
})

// ─────────────────────────────────────────────
//  🔄  RECHARGEMENT À CHAUD
// ─────────────────────────────────────────────

const _selfFile = require.resolve(__filename)
fs.watchFile(_selfFile, () => {
    fs.unwatchFile(_selfFile)
    console.log(chalk.redBright(`Mise à jour détectée : ${__filename}`))
    delete require.cache[_selfFile]
    require(_selfFile)
})