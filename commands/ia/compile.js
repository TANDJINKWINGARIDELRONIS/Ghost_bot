// ╔══════════════════════════════════════════════════════════════╗
// ║              💻  COMPILE MODULE  💻                          ║
// ║   Gemini → Gemini rotation → DeepSeek → Llama fallback      ║
// ╚══════════════════════════════════════════════════════════════╝

'use strict';

const axios  = require('axios');
const OpenAI = require('openai');
const fs     = require('fs');
const path   = require('path');
require('dotenv').config({ path: require('path').join(process.cwd(), 'Api.env') });

// ─────────────────────────────────────────────
//  🔑  LECTURE Api.env
// ─────────────────────────────────────────────

function loadEnvKey(keyName) {
    try {
        const envPath = path.join(process.cwd(), 'Api.env');
        if (!fs.existsSync(envPath)) return process.env[keyName] || null;
        const content = fs.readFileSync(envPath, 'utf-8');
        for (const line of content.split('\n')) {
            const trimmed = line.trim();
            if (trimmed.startsWith(`${keyName}=`)) {
                return trimmed.split('=').slice(1).join('=').trim() || null;
            }
        }
        return process.env[keyName] || null;
    } catch {
        return process.env[keyName] || null;
    }
}

// ─────────────────────────────────────────────
//  🗂️  LANGAGES SUPPORTÉS
// ─────────────────────────────────────────────

const languageMap = {
    python    : 'Python 3',
    py        : 'Python 3',
    javascript: 'JavaScript (Node.js)',
    js        : 'JavaScript (Node.js)',
    node      : 'JavaScript (Node.js)',
    typescript: 'TypeScript',
    ts        : 'TypeScript',
    java      : 'Java',
    c         : 'C',
    cpp       : 'C++',
    'c++'     : 'C++',
    csharp    : 'C#',
    cs        : 'C#',
    go        : 'Go',
    rust      : 'Rust',
    rs        : 'Rust',
    php       : 'PHP',
    ruby      : 'Ruby',
    rb        : 'Ruby',
    bash      : 'Bash',
    sh        : 'Bash',
    kotlin    : 'Kotlin',
    kt        : 'Kotlin',
    swift     : 'Swift',
    r         : 'R',
    lua       : 'Lua',
    scala     : 'Scala',
    perl      : 'Perl',
    pl        : 'Perl',
    sql       : 'SQL',
    html      : 'HTML',
};

// ─────────────────────────────────────────────
//  📋  AIDE
// ─────────────────────────────────────────────

const HELP_MESSAGE =
    `❌ *Format incorrect*\n\n` +
    `📖 *Usage :* \`#compile [langage] [code]\`\n\n` +
    `🌐 *Langages supportés :*\n` +
    `  python • js • ts • java • c • cpp • csharp\n` +
    `  go • rust • php • ruby • bash • kotlin • swift\n` +
    `  r • lua • scala • perl • sql • html\n\n` +
    `💡 *Exemple :*\n\`#compile python print("Bonjour le monde!")\``;

// ─────────────────────────────────────────────
//  📝  PROMPT COMMUN
// ─────────────────────────────────────────────

function buildPrompt(language, code) {
    return (
        `Tu es un compilateur expert. Exécute ce code ${language} et réponds UNIQUEMENT en texte brut avec ce format exact, sans markdown ni backticks :\n\n` +
        `╔══════════════════════════════════╗\n` +
        `║  💻  RÉSULTAT D'EXÉCUTION        ║\n` +
        `╚══════════════════════════════════╝\n\n` +
        `[✅ Exécution réussie / 🔴 Erreur de compilation / ⚠️ Erreur d'exécution]\n\n` +
        `📤 SORTIE :\n[sortie exacte du programme ou "Aucune sortie"]\n\n` +
        `[Si erreur uniquement :]\n❌ ERREUR :\n[message d'erreur précis + numéro de ligne]\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `Voici le code ${language} à exécuter :\n${code}`
    );
}

// ─────────────────────────────────────────────
//  🤖  IA 1 — Gemini 2.5 Flash (clé unique)
// ─────────────────────────────────────────────

async function tryGeminiSingle(language, code) {
    const apiKey = loadEnvKey('GEMINI_API_KEY');
    if (!apiKey) throw new Error('GEMINI_API_KEY manquante');

    const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
            contents        : [{ parts: [{ text: buildPrompt(language, code) }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 1024 }
        },
        { headers: { 'Content-Type': 'application/json' }, timeout: 30000 }
    );

    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) throw new Error('Réponse vide');
    return text;
}

// ─────────────────────────────────────────────
//  🤖  IA 2 — Gemini rotation multi-clés AI_STUDIO
// ─────────────────────────────────────────────

async function tryGeminiRotation(language, code) {
    const { GoogleGenAI } = require('@google/genai');
    const keysRaw = loadEnvKey('AI_STUDIO');
    if (!keysRaw) throw new Error('AI_STUDIO manquant');

    const keys = keysRaw.split(',');
    const prompt = buildPrompt(language, code);

    for (let i = 0; i < keys.length; i++) {
        try {
            const ai     = new GoogleGenAI({ apiKey: keys[i].trim() });
            const result = await ai.models.generateContent({
                model   : 'gemini-2.5-flash',
                contents: prompt
            });
            const text = result?.text?.trim();
            if (!text) throw new Error('Réponse vide');
            console.log(`✅ [COMPILE] Gemini rotation clé ${i + 1}`);
            return text;
        } catch (err) {
            console.log(`❌ [COMPILE] Gemini rotation clé ${i + 1}: ${err.message}`);
        }
    }
    throw new Error('Toutes les clés Gemini rotation ont échoué');
}

// ─────────────────────────────────────────────
//  🤖  IA 3 — DeepSeek R1 (juheapi)
// ─────────────────────────────────────────────

async function tryDeepSeek(language, code) {
    const apiKey = loadEnvKey('WISDOM_API_KEY');
    if (!apiKey) throw new Error('WISDOM_API_KEY manquante');

    const client = new OpenAI({
        apiKey : apiKey,
        baseURL: 'https://wisdom-gate.juheapi.com/v1'
    });

    const completion = await client.chat.completions.create({
        model      : 'deepseek-r1',
        messages   : [
            { role: 'system', content: 'Tu es un compilateur expert. Réponds uniquement en texte brut sans markdown.' },
            { role: 'user',   content: buildPrompt(language, code) }
        ],
        temperature: 0.1
    });

    const text = completion.choices[0].message.content?.trim();
    if (!text) throw new Error('Réponse vide');
    return text;
}

// ─────────────────────────────────────────────
//  🤖  IA 4 — Llama 3.3 70B (Groq)
// ─────────────────────────────────────────────

async function tryLlama(language, code) {
    const apiKey = loadEnvKey('GROQ_API_KEY');
    if (!apiKey) throw new Error('GROQ_API_KEY manquante');

    const client = new OpenAI({
        apiKey : apiKey,
        baseURL: 'https://api.groq.com/openai/v1'
    });

    const completion = await client.chat.completions.create({
        model      : 'llama-3.3-70b-versatile',
        messages   : [
            { role: 'system', content: 'Tu es un compilateur expert. Réponds uniquement en texte brut sans markdown.' },
            { role: 'user',   content: buildPrompt(language, code) }
        ],
        temperature: 0.1
    });

    const text = completion.choices[0].message.content?.trim();
    if (!text) throw new Error('Réponse vide');
    return text;
}

// ─────────────────────────────────────────────
//  🔗  CHAÎNE DE FALLBACK
//  1. Gemini clé unique
//  2. Gemini rotation (AI_STUDIO)
//  3. DeepSeek R1
//  4. Llama 3.3 (Groq)
// ─────────────────────────────────────────────

async function compileWithFallback(language, code) {
    const chain = [
        { name: 'Gemini 2.5 Flash',  fn: () => tryGeminiSingle(language, code)   },
        { name: 'Gemini rotation',   fn: () => tryGeminiRotation(language, code) },
        { name: 'DeepSeek R1',       fn: () => tryDeepSeek(language, code)       },
        { name: 'Llama 3.3 (Groq)',  fn: () => tryLlama(language, code)          },
    ];

    for (const { name, fn } of chain) {
        try {
            console.log(`🔄 [COMPILE] Essai via ${name}...`);
            const result = await fn();
            console.log(`✅ [COMPILE] Succès via ${name}`);
            return { result, provider: name };
        } catch (err) {
            console.log(`❌ [COMPILE] ${name} échoué: ${err.message}`);
        }
    }

    throw new Error('Toutes les IA ont échoué. Réessaie plus tard.');
}

// ─────────────────────────────────────────────
//  🚀  MODULE PRINCIPAL
// ─────────────────────────────────────────────

module.exports = {
    name    : 'compile',
    category: 'ia',
    desc    : 'Compile et exécute du code avec fallback multi-IA automatique.',
    commands: ['compile', 'run', 'code'],

    run: async (sock, message, args, { reply }) => {

        if (!args || !args[0]) return reply(HELP_MESSAGE);

        const langKey = args[0].toLowerCase();
        const code    = args.slice(1).join(' ').trim();

        if (!code) {
            return reply('❌ *Code manquant.*\n💡 Exemple : `#compile python print("hello")`');
        }

        const langLabel = languageMap[langKey];
        if (!langLabel) {
            return reply(
                `❌ *Langage non supporté :* \`${langKey}\`\n\n` +
                `✅ *Langages dispo :*\n` +
                `  python • js • ts • java • c • cpp • csharp\n` +
                `  go • rust • php • ruby • bash • kotlin • swift\n` +
                `  r • lua • scala • perl • sql • html`
            );
        }

        await reply(
            `╔══════════════════════════════════╗\n` +
            `║  💻  COMPILATION EN COURS...     ║\n` +
            `╚══════════════════════════════════╝\n\n` +
            `🔄 Langage : *${langLabel}*\n` +
            `⚡ Recherche de l'IA disponible...`
        );

        try {
            const { result, provider } = await compileWithFallback(langLabel, code);
            return reply(result + `\n\n_🤖 Compilé via : ${provider}_`);

        } catch (e) {
            console.error('[COMPILE FATAL]', e.message);
            return reply(
                `╔══════════════════════════════════╗\n` +
                `║  💻  RÉSULTAT D'EXÉCUTION        ║\n` +
                `╚══════════════════════════════════╝\n\n` +
                `❌ *Toutes les IA sont indisponibles.*\n\n` +
                `📋 ${e.message}\n\n` +
                `💡 Réessaie dans quelques instants.`
            );
        }
    }
};
