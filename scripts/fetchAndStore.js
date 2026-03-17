const fs = require('fs');
const fetch = require('node-fetch');
const mongoose = require('mongoose');
const path = require('path')
const Timestamp = require('../models/Timestamp')
const Team = require('../models/Team');



async function fetchAndStore(inputDate, runDate) {
    try {

        const TOURNAMENT_API_BASE_URL = process.env.TOURNAMENT_API_BASE_URL

        const year = new Date(inputDate).getFullYear();
        const API_URL = `${TOURNAMENT_API_BASE_URL}${year}`



        const log = {
            runType: 'finalScoreUpdate',
            runOnDate: runDate,
            runForDate: inputDate,
            runForYear: year
        }

        await Timestamp.insertOne(log);

        //fetch tournament data
        const res = await fetch(API_URL);
        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`API error: ${res.status} - ${errorText}`);
        }
        const data = await res.json();


        const championship = data.championships[0];
        const games = championship.games;
        const rounds = championship.rounds;



        //for each round, take the date range and split it into start and end dates.
        rounds.forEach(function (round) {

            if (round.roundNumber <= 5) {
                let dateParts = round.subtitle.split('-');

                round.startDate = new Date(`${dateParts[0]}/${year}`);
                round.endDate = new Date(`${dateParts[1]}/${year}`);

                console.log(round.startDate, round.endDate);
            } else {
                round.gameDate = new Date(`${round.subtitle}/${year}`)
            }
        });

        //for each game, make start date a date object. 
        // assign a round number to the game based on which round start/end dates it falls between.
        //if a team in a game has a name that ends with 'St.', change it to 'State'.
        games.forEach(function (game) {
            let gameDay = new Date(game.startDate);

            rounds.forEach(function (round) {
                if (gameDay >= round.startDate && gameDay <= round.endDate) {
                    game.round = round.roundNumber - 1;
                } else if (round.gameDate && gameDay.getTime() === round.gameDate.getTime()) {
                    game.round = round.roundNumber - 1;
                }
            })

            if (game.teams.length === 2) {
                game.teams.forEach(function (team) {
                    if (team.nameShort.endsWith("St.")) {
                        team.nameShort = team.nameShort.replace(/St\.$/, "State");
                    }
                })
            }
        });



        fs.writeFileSync(
            path.resolve(__dirname, `../data/tournament-data-${year}.json`),
            JSON.stringify(data, null, 2)
        );

        const [yYear, month, day] = inputDate.split('-');
        // 11:59:59 PM Eastern = 03:59:59 UTC next day
        const runForDate = new Date(Date.UTC(Number(yYear), Number(month) - 1, Number(day) + 1, 3, 59, 59, 999));
        const inputDateOnly = `${yYear}-${month}-${day}`;



        for (let game of games) {
            if (game.round === 0) continue;
            const [gameMonth, gameDay, gameYear] = game.startDate.split('/');
            const gameDateOnly = `${gameYear}-${gameMonth.padStart(2, '0')}-${gameDay.padStart(2, '0')}`;

            if (game.statusCodeDisplay === 'final' && gameDateOnly === inputDateOnly) {
                for (let team of game.teams) {


                    let dbTeams = await Team.find({ name: team.nameShort, seed: team.seed })

                    if (dbTeams.length === 0) {
                        console.warn(`Team not found: ${team.nameShort}`);
                        continue;
                    }

                    for (let dbTeam of dbTeams) {
                        console.log('found team to update', team.nameShort, game.round, 'in league', dbTeam.leagueName)

                        dbTeam.rounds[game.round - 1].finalScore = team.score;
                        dbTeam.rounds[game.round - 1].isFinal = true;
                        dbTeam.rounds[game.round - 1].didWin = team.isWinner;

                        if (dbTeam.name === game.teams[0].nameShort) {
                            dbTeam.rounds[game.round - 1].opponent = game.teams[1].nameShort;
                            dbTeam.rounds[game.round - 1].opponentFinalScore = game.teams[1].score;

                        } else if (dbTeam.name === game.teams[1].nameShort) {
                            dbTeam.rounds[game.round - 1].opponent = game.teams[0].nameShort;
                            dbTeam.rounds[game.round - 1].opponentFinalScore = game.teams[0].score;

                        }

                        await dbTeam.save();
                    }
                }
            }
        }
    } catch (err) {
        console.error('Error in fetchAndStore:', err);
        throw new Error(err.message || 'Error updating tournament data.');
    }
}



module.exports = fetchAndStore;

