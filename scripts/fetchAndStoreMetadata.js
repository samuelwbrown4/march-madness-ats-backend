const mongoose = require('mongoose');
const fs = require('fs');

const Dates = require('../models/Metadata')

async function fetchAndStoreMetadata(inputYear) {

    await Dates.deleteOne({year: inputYear})
    console.log('inputYear:', inputYear);

    const TOURNAMENT_API_BASE_URL = process.env.TOURNAMENT_API_BASE_URL;
    const API_URL = `${TOURNAMENT_API_BASE_URL}${inputYear}`

    try {

        const res = await fetch(API_URL);
        const data = await res.json();


        const championship = data.championships[0];
        const games = championship.games;
        const rounds = championship.rounds;
        const year = inputYear


        let importantDates = [];

        rounds.forEach(function (round) {

            if (round.roundNumber <= 5) {
                let dateParts = round.subtitle.split('-');

                round.startDate = new Date(`${dateParts[0]}/${year}`);
                round.endDate = new Date(`${dateParts[1]}/${year}`);

                console.log(round.startDate, round.endDate);
            } else {
                round.gameDate = new Date(`${round.subtitle}/${year}`)
            }

            const formatYMD = dateObj => {
                const year = dateObj.getFullYear();
                const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                const day = String(dateObj.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };

            const dates = {
                label: round.label,
                staged: round.staged,
                subtitle: round.subtitle,
                title: round.title,
                startDate: round.startDate ? formatYMD(new Date(round.startDate)) : null,
                endDate: round.endDate ? formatYMD(new Date(round.endDate)) : null,
                gameDate: round.gameDate ? formatYMD(new Date(round.gameDate)) : null
            };

            importantDates.push(dates);
        });

        await Dates.insertOne({
            year: inputYear,
            rounds: importantDates
        })

    } catch (error) {
        console.error(error);
    }

}

module.exports = fetchAndStoreMetadata;