const fs = require('fs');
const path = require('path');

const mongoose = require('mongoose');
const Team = require('../models/Team');
const Timestamp = require('../models/Timestamp');




async function spreadUpdater(spreadUpdateDate, runDate) {
    try {
        console.log(spreadUpdateDate)

        let totalSpreadsInjected = 0;

        const formatForApi = date => encodeURIComponent(date.toISOString());

        const [year, month, day] = spreadUpdateDate.split('-');
        const startToday = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 4, 0, 0, 0));
        const endToday = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day) + 1, 3, 59, 59, 999));//get the run dates end time.

        console.log('startToday:', startToday);
        console.log('endToday:', endToday);

        //helper function to get date time format from gameday strings in tournament data. i.e. date: "03/21/2025", time: "16:05"
        function parseGameDate(date, time) {
            const [month, day, year] = date.split('/');
            return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${time}:00`);
        }

        const SPREAD_API_BASE_URL = process.env.SPREAD_API_BASE_URL

        const SPREAD_API_URL = `${SPREAD_API_BASE_URL}?startDateRange=${formatForApi(startToday)}&endDateRange=${formatForApi(endToday)}`

        let rawData = fs.readFileSync(path.resolve(__dirname, `../data/tournament-data-${year}.json`));
        let data = JSON.parse(rawData);

        const championship = data.championships[0];
        const games = championship.games;

        //************************************************************************//



        const log = {
            runType: "spreadUpdate",
            runOnDate: runDate,
            runForDate: spreadUpdateDate,
            runForYear: year
        }

        await Timestamp.insertOne(log);

        //fetch spreads for games occuring on the same day as the tournament data update fetch.
        const spreadRes = await fetch(SPREAD_API_URL, {
            headers: {
                "Authorization": `Bearer ${process.env.SPREAD_API_KEY}`,
                "Content-Type": "application/json"
            }
        });
        const spreads = await spreadRes.json();

        console.log('fetched spreads: ', spreads.length)


        for (let game of games) {

            if (game.teams.length === 2) {

                const gameDate = parseGameDate(game.startDate, game.startTime)

                if (gameDate.getTime() >= startToday.getTime() && gameDate.getTime() <= endToday.getTime()) {

                    let matchedGame = spreads.find(spreadGame =>
                        (spreadGame.homeTeam === game.teams[0].nameShort && spreadGame.awayTeam === game.teams[1].nameShort) ||
                        (spreadGame.homeTeam === game.teams[1].nameShort && spreadGame.awayTeam === game.teams[0].nameShort)
                    );

                    if (matchedGame && matchedGame.lines) {

                        //take spread from either ESPN or Draft Kings.
                        let lineInfo = matchedGame.lines.find(line => line.provider === 'Draft Kings' || line.provider === 'ESPN BET');

                        if (lineInfo) {
                            for (let team of game.teams) {

                                let spreadValue = null
                                if (team.nameShort === matchedGame.homeTeam) {
                                    spreadValue = lineInfo.spread;

                                } else if (team.nameShort === matchedGame.awayTeam) {
                                    spreadValue = -lineInfo.spread;

                                }

                                const dbTeam = await Team.findOne({ name: team.nameShort, seed: team.seed })


                                if (dbTeam.rounds[game.round - 1].spread === null) {
                                    dbTeam.rounds[game.round - 1].spread = spreadValue;
                                    dbTeam.rounds[game.round - 1].opponentSpread = (spreadValue * -1);
                                    await dbTeam.save();

                                    totalSpreadsInjected++;
                                    console.log(`Injected spread for ${team.nameShort}: ${spreadValue}`);
                                }
                                ;
                            }
                        }
                    }
                }

            }
        }


        console.log('Total spreads injected: ', totalSpreadsInjected)
    } catch (err) {
        console.error('Error in spreadUpdater:', err);
        return { error: err.message || 'Error updating spreads.' };
    }

}


module.exports = spreadUpdater;


