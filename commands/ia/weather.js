// ╔══════════════════════════════════════════════════════════════╗
// ║              🌦️  WEATHER COMMAND  🌦️                         ║
// ║         Météo en temps réel via OpenWeatherMap               ║
// ╚══════════════════════════════════════════════════════════════╝

'use strict';

const axios = require('axios');

// ─────────────────────────────────────────────
//  🎨  ICÔNES MÉTÉO selon condition
// ─────────────────────────────────────────────

function getWeatherEmoji(condition) {
    const c = condition.toLowerCase();
    if (c.includes('thunder'))                    return '⛈️';
    if (c.includes('drizzle'))                    return '🌦️';
    if (c.includes('rain'))                       return '🌧️';
    if (c.includes('snow'))                       return '❄️';
    if (c.includes('mist') || c.includes('fog'))  return '🌫️';
    if (c.includes('haze') || c.includes('smoke'))return '🌫️';
    if (c.includes('clear'))                      return '☀️';
    if (c.includes('few clouds'))                 return '🌤️';
    if (c.includes('scattered'))                  return '⛅';
    if (c.includes('cloud'))                      return '☁️';
    if (c.includes('sand') || c.includes('dust')) return '🌪️';
    return '🌡️';
}

// ─────────────────────────────────────────────
//  🌡️  ICÔNE TEMPÉRATURE
// ─────────────────────────────────────────────

function getTempEmoji(temp) {
    if (temp <= 0)  return '🥶';
    if (temp <= 10) return '🧊';
    if (temp <= 18) return '🌬️';
    if (temp <= 25) return '😊';
    if (temp <= 33) return '☀️';
    return '🔥';
}

// ─────────────────────────────────────────────
//  💨  ICÔNE VENT
// ─────────────────────────────────────────────

function getWindEmoji(speed) {
    if (speed < 5)  return '🍃';
    if (speed < 15) return '💨';
    if (speed < 30) return '🌬️';
    return '🌪️';
}

// ─────────────────────────────────────────────
//  🕐  CONVERSION TIMESTAMP → HEURE LOCALE
// ─────────────────────────────────────────────

function formatTime(timestamp, timezoneOffset) {
    const date = new Date((timestamp + timezoneOffset) * 1000);
    const h = String(date.getUTCHours()).padStart(2, '0');
    const m = String(date.getUTCMinutes()).padStart(2, '0');
    return `${h}:${m}`;
}

// ─────────────────────────────────────────────
//  🚀  COMMANDE PRINCIPALE
// ─────────────────────────────────────────────

module.exports = async function weatherCommand(sock, chatId, message, city) {

    if (!city || !city.trim()) {
        return sock.sendMessage(chatId, {
            text: '❌ *Précise une ville.*\n💡 Exemple : `#weather Yaoundé`'
        }, { quoted: message });
    }

    try {
        const apiKey   = '4902c0f2550f58298ad4146a92b65e10';
        const url      = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric&lang=fr`;
        const response = await axios.get(url, { timeout: 10000 });
        const w        = response.data;

        // ── Extraction des données ──────────────────────────────
        const cityName    = w.name;
        const country     = w.sys.country;
        const condition   = w.weather[0].description;
        const condEmoji   = getWeatherEmoji(condition);
        const temp        = Math.round(w.main.temp);
        const feelsLike   = Math.round(w.main.feels_like);
        const tempMin     = Math.round(w.main.temp_min);
        const tempMax     = Math.round(w.main.temp_max);
        const humidity    = w.main.humidity;
        const windSpeed   = Math.round(w.wind.speed * 3.6); // m/s → km/h
        const windDir     = w.wind.deg ?? '—';
        const visibility  = w.visibility ? `${(w.visibility / 1000).toFixed(1)} km` : '—';
        const pressure    = w.main.pressure;
        const cloudiness  = w.clouds.all;
        const sunrise     = formatTime(w.sys.sunrise, w.timezone);
        const sunset      = formatTime(w.sys.sunset,  w.timezone);
        const tempEmoji   = getTempEmoji(temp);
        const windEmoji   = getWindEmoji(windSpeed);

        // ── Capitalise la description ───────────────────────────
        const conditionStr = condition.charAt(0).toUpperCase() + condition.slice(1);

        // ── Construction du message ─────────────────────────────
        const weatherText =
`╔══════════════════════════════════╗
║   ${condEmoji}  *MÉTÉO — ${cityName.toUpperCase()}, ${country}*
╚══════════════════════════════════╝

${condEmoji}  *Condition :*  ${conditionStr}
${tempEmoji}  *Température :*  *${temp}°C*
🌡️  *Ressenti :*  ${feelsLike}°C
📉  *Min / Max :*  ${tempMin}°C — ${tempMax}°C

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💧  *Humidité :*      ${humidity}%
${windEmoji}  *Vent :*          ${windSpeed} km/h  (${windDir}°)
👁️  *Visibilité :*    ${visibility}
🌡️  *Pression :*      ${pressure} hPa
☁️  *Nuages :*        ${cloudiness}%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🌅  *Lever du soleil :*   ${sunrise}
🌇  *Coucher du soleil :* ${sunset}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌍 *Source :* OpenWeatherMap`;

        await sock.sendMessage(chatId, {
            text: weatherText
        }, { quoted: message });

    } catch (error) {
        console.error('❌ [WEATHER] Erreur:', error.message);

        // ✅ FIX — `weather` n'existe pas dans le catch, on utilise `city` à la place
        if (error.response?.status === 404) {
            await sock.sendMessage(chatId, {
                text: `❌ *Ville introuvable :* _${city}_\n💡 Vérifie l'orthographe ou essaie en anglais.`
            }, { quoted: message });
        } else if (error.response?.status === 401) {
            await sock.sendMessage(chatId, {
                text: '❌ *Clé API invalide.* Contacte l\'administrateur du bot.'
            }, { quoted: message });
        } else if (error.code === 'ECONNABORTED') {
            await sock.sendMessage(chatId, {
                text: '⏱️ *Délai dépassé.* Le serveur météo ne répond pas. Réessaie dans quelques instants.'
            }, { quoted: message });
        } else {
            await sock.sendMessage(chatId, {
                text: `❌ *Impossible de récupérer la météo pour* _${city}_.\n📋 ${error.message}`
            }, { quoted: message });
        }
    }
};
