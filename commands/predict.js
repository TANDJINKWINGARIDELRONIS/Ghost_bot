const axios = require("axios");

const FOOTBALL = "a55174569e0a44248a0a9e02002d456e";
const URL = "https://api.football-data.org/v4";

const HEADERS = { "X-Auth-Token": FOOTBALL };

const leagues = {
    "premier league": "PL",
    "la liga": "PD",
    "serie a": "SA",
    "bundesliga": "BL1",
    "ligue 1": "FL1",
    "champions league": "CL",
    "world cup": "WC"
};

async function predictCommand(sock, chatId, message, leagueName) {
    try {

        if (!leagueName || typeof leagueName !== "string") {
            return await sock.sendMessage(chatId, {
                text: "❌ Indique un championnat après #predict (ex: ligue 1)."
            }, { quoted: message });
        }

        const key = leagueName.toLowerCase().trim();

        const leagueCode = leagues[key];

        if (!leagueCode) {
            return await sock.sendMessage(chatId, {
                text: "❌ Championnat non reconnu."
            }, { quoted: message });
        }

        const response = await axios.get(
            `${URL}/competitions/${leagueCode}/matches`,
            { headers: HEADERS }
        );

        const matches = response.data.matches;

        if (!matches || matches.length === 0) {
            return await sock.sendMessage(chatId, {
                text: "⚽ Aucune rencontre trouvée pour ce championnat."
            }, { quoted: message });
        }

        const match = matches[0];

        const homeTeam = match.homeTeam.name;
        const awayTeam = match.awayTeam.name;

        return await sock.sendMessage(chatId, {
            text: `⚽ ${homeTeam} vs ${awayTeam}\n📊 Match trouvé pour ${leagueName}.`
        }, { quoted: message });

    } catch (error) {

        console.log(error.response?.status, error.response?.data);

        return await sock.sendMessage(chatId, {
            text: "❌ Erreur API football — vérifie ta clé ou la limite d’accès."
        }, { quoted: message });
    }
};

module.exports = predictCommand;