const fs = require('fs');
const path = require('path');

const mongoose = require('mongoose');
const Team = require('../models/Team');
const Timestamp = require('../models/Timestamp');
const League = require('../models/League')




async function spreadUpdater(spreadUpdateDate, runDate) {
    try {
        console.log(spreadUpdateDate)

        const leagues = await League.find({isArchived: false})
        const activeIds = leagues.map((l)=>l._id.toString())

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

        let rawMap = fs.readFileSync(path.resolve(__dirname, `../data/map/master.json`));
        let map = JSON.parse(rawMap);

        //************************************************************************//

        const log = {
            runType: "spreadUpdate",
            runOnDate: runDate,
            runForDate: spreadUpdateDate,
            runForYear: year
        }

        await Timestamp.insertOne(log);

        //fetch spreads for games occuring on the same day as the tournament data update fetch.

        console.log('SPREAD_API_URL:', SPREAD_API_URL);
        console.log('Decoded start:', decodeURIComponent(SPREAD_API_URL.split('startDateRange=')[1].split('&')[0]));
        console.log('Decoded end:', decodeURIComponent(SPREAD_API_URL.split('endDateRange=')[1]));

        const spreadRes = await fetch(SPREAD_API_URL, {
            headers: {
                "Authorization": `Bearer ${process.env.SPREAD_API_KEY}`,
                "Content-Type": "application/json"
            }
        });
        const spreads = await spreadRes.json();

        console.log('fetched spreads: ', spreads.length)

        function getTeamId(team) {
            let schoolObj = map.find((school) => school.seo === team.seoname)
            return schoolObj.matchedId
        }


        for (let game of games) {

            if (game.teams.length === 2) {

                const gameDate = parseGameDate(game.startDate, game.startTime)

                if (gameDate.getTime() >= startToday.getTime() && gameDate.getTime() <= endToday.getTime()) {

                    let matchedGame = spreads.find(spreadGame =>
                        (spreadGame.homeTeamId === getTeamId(game.teams[0]) && spreadGame.awayTeamId === getTeamId(game.teams[1])) ||
                        (spreadGame.homeTeamId === getTeamId(game.teams[1]) && spreadGame.awayTeamId === getTeamId(game.teams[0]))
                    );

                    if (matchedGame && matchedGame.lines) {

                        //take spread from either ESPN or Draft Kings.
                        let lineInfo = matchedGame.lines.find(line => line.provider === 'Draft Kings' || line.provider === 'ESPN BET');

                        if (lineInfo) {
                            for (let team of game.teams) {

                                let spreadValue = null
                                if (getTeamId(team) === matchedGame.homeTeamId) {
                                    spreadValue = lineInfo.spread;

                                } else if (getTeamId(team) === matchedGame.awayTeamId) {
                                    spreadValue = -lineInfo.spread;

                                }

                                const dbTeams = await Team.find({ name: team.nameShort, seed: team.seed })

                                if (dbTeams.length === 0) {
                                    console.warn(`No teams found: ${team.nameShort} seed ${team.seed}`);
                                    continue;
                                }

                                for (let dbTeam of dbTeams) {
                                    if(activeIds.includes(dbTeam.leagueId)){
                                        if (dbTeam.rounds[game.round - 1].spread === null) {
                                        dbTeam.rounds[game.round - 1].spread = spreadValue;
                                        dbTeam.rounds[game.round - 1].opponentSpread = (spreadValue * -1);
                                        await dbTeam.save();

                                        totalSpreadsInjected++;
                                        console.log(`Injected spread for ${team.nameShort} in league ${dbTeam.leagueName}: ${spreadValue}`);
                                    }
                                    }     
                                }
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


