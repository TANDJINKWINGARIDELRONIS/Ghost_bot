const axios = require("axios");

const FOOTBALL = "a55174569e0a44248a0a9e02002d456e";
const URL = "https://api.football-data.org/v4";

const HEADERS = {
    "X-Auth-Token": FOOTBALL
};

const leagues = {
    "premier league": "PL",
    "la liga": "PD",
    "serie a": "SA",
    "bundesliga": "BL1",
    "ligue 1": "FL1",
    "champions league": "CL",
    "europa league": "EL",
    "world cup": "WC",
    "can": "AFRICA_CUP_OF_NATIONS",
    "nations league": "NATIONS_LEAGUE"
};

function calculatePrediction(homeRank, awayRank, homeGoals, awayGoals) {
    let score = 0;

    if (homeRank && awayRank) {
        score += (awayRank - homeRank) * 0.4;
    }

    score += (homeGoals - awayGoals) * 0.6;

    if (score > 0.5) {
        return "Victoire probable de l’équipe à domicile 🏠";
    } else if (score < -0.5) {
        return "Victoire probable de l’équipe à l’extérieur ✈️";
    } else {
        return "Match serré — nul probable 🤝";
    }
}

module.exports = async function (sock, chatId, message, leagueName) {
    try {

        const leagueCode = leagues[leagueName.toLowerCase()];

        if (!leagueCode) {
            return await sock.sendMessage(chatId, {
                text: "❌ Ligue non reconnue."
            }, { quoted: message });
        }

        // 🔥 Récupérer les matchs du jour
        const response = await axios.get(
            `${URL}/competitions/${leagueCode}/matches?status=SCHEDULED`,
            { headers: HEADERS }
        );

        const matches = response.data.matches;

        if (!matches || matches.length === 0) {
            return await sock.sendMessage(chatId, {
                text: "Aucun match programmé actuellement."
            }, { quoted: message });
        }

        // On prend le premier match
        const match = matches[0];

        const homeTeam = match.homeTeam.name;
        const awayTeam = match.awayTeam.name;

        const homeRank = match.homeTeam.position || 10;
        const awayRank = match.awayTeam.position || 10;

        const homeGoals = match.score.fullTime.home || 0;
        const awayGoals = match.score.fullTime.away || 0;

        const prediction = calculatePrediction(homeRank, awayRank, homeGoals, awayGoals);

        const text = `⚽ *${homeTeam}* vs *${awayTeam}*\n\n📊 ${prediction}`;

        await sock.sendMessage(chatId, { text }, { quoted: message });

    } catch (error) {
        console.error("Erreur prédiction :", error);

        await sock.sendMessage(chatId, {
            text: "❌ Impossible de récupérer les données du match."
        }, { quoted: message });
    }
};