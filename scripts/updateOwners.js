const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const Team = require('../models/Team');
const Timestamp = require('../models/Timestamp');
const League = require('../models/League');


async function updateOwners(updateOwnersDate, runDate) {
    try {

        const [yYear, month, day] = updateOwnersDate.split('-');
        // 11:59:59 PM Eastern = 03:59:59 UTC next day
        const updateDate = new Date(Date.UTC(Number(yYear), Number(month) - 1, Number(day) + 1, 3, 59, 59, 999));

        const rawData = fs.readFileSync(path.resolve(__dirname, `../data/tournament-data-${yYear}.json`), 'utf-8');
        const tournament = JSON.parse(rawData);
        const games = tournament.championships[0].games;

        function parseGameDate(date, time) {
            const [month, day, year] = date.split('/');
            return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${time}:00`);
        }

        const leagues = await League.find({ isArchived: false, year: Number(yYear) })
        const activeIds = leagues.map((l) => l._id.toString())

        const log = {
            runType: 'ownerUpdate',
            runOnDate: runDate,
            runForDate: updateOwnersDate,
            runForYear: yYear
        }

        await Timestamp.insertOne(log);

        for (let game of games) {
            if (game.round === 0) continue;

            const gameDate = parseGameDate(game.startDate, game.startTime);

            const roundIdx = game.round - 1;
            const nextRoundIdx = game.round;

            const winningTeam = game.teams.find((team) => team.isWinner === true);
            const losingTeam = game.teams.find((team) => team.isWinner === false);

            const dbWinningTeams = await Team.find({ name: winningTeam.nameShort, seed: winningTeam.seed, leagueId: { $in: activeIds } });
            const dbLosingTeams = await Team.find({ name: losingTeam.nameShort, seed: losingTeam.seed, leagueId: { $in: activeIds } });

            if (dbWinningTeams.length === 0 || dbLosingTeams.length === 0) {
                console.warn(`Teams not found: ${winningTeam.nameShort} or ${losingTeam.nameShort}`);
                continue;
            }

            for (let i = 0; i < dbWinningTeams.length; i++) {
                const dbWinningTeam = dbWinningTeams[i];
                const dbLosingTeam = dbLosingTeams.find((team) => team.leagueId === dbWinningTeam.leagueId);

                console.log('Checking game:', winningTeam.nameShort, 'vs', losingTeam.nameShort);
                console.log('updateDate:', updateDate);
                console.log('gameDate:', gameDate);
                console.log('updateDate > gameDate:', updateDate > gameDate);
                console.log('statusCodeDisplay:', game.statusCodeDisplay);
                console.log('ownerUpdated flags:', dbWinningTeam.rounds[roundIdx].ownerUpdated, dbLosingTeam.rounds[roundIdx].ownerUpdated);


                if (updateDate > gameDate && game.statusCodeDisplay === 'final' && !dbWinningTeam.rounds[roundIdx].ownerUpdated && !dbLosingTeam.rounds[roundIdx].ownerUpdated && activeIds.includes(dbWinningTeam.leagueId) && activeIds.includes(dbLosingTeam.leagueId)) {

                    const winningTeamScore = dbWinningTeam.rounds[roundIdx].finalScore;
                    const winningTeamSpread = dbWinningTeam.rounds[roundIdx].spread;
                    const winningTeamAdjustedScore = winningTeamScore + winningTeamSpread;

                    const losingTeamScore = dbLosingTeam.rounds[roundIdx].finalScore;
                    const losingTeamSpread = dbLosingTeam.rounds[roundIdx].spread;
                    const losingTeamAdjustedScore = losingTeamScore + losingTeamSpread;

                    if (winningTeamAdjustedScore > losingTeamAdjustedScore) {

                        dbWinningTeam.rounds[roundIdx].didCover = true;
                        dbLosingTeam.rounds[roundIdx].didCover = false;

                    } else if (losingTeamAdjustedScore > winningTeamAdjustedScore) {

                        dbLosingTeam.rounds[roundIdx].didCover = true;
                        dbWinningTeam.rounds[roundIdx].didCover = false;

                    } else {
                        dbLosingTeam.rounds[roundIdx].didCover = false;
                        dbWinningTeam.rounds[roundIdx].didCover = false;
                    }

                    await dbLosingTeam.save();
                    await dbWinningTeam.save();

                    dbWinningTeam.rounds[roundIdx].opponent = dbLosingTeam.name;
                    dbWinningTeam.rounds[roundIdx].opponentFinalScore = dbLosingTeam.rounds[roundIdx].finalScore;

                    dbLosingTeam.rounds[roundIdx].opponent = dbWinningTeam.name;
                    dbLosingTeam.rounds[roundIdx].opponentFinalScore = dbWinningTeam.rounds[roundIdx].finalScore;

                    dbWinningTeam.rounds[roundIdx].isFavorite = winningTeamSpread < 0 ? true : false;

                    dbLosingTeam.rounds[roundIdx].isFavorite = losingTeamSpread < 0 ? true : false;

                    if (dbWinningTeam && dbLosingTeam) {
                        //console.log('underdog: ', dbUnderdog.name , dbUnderdog.spreads[`round${gameRound}`])
                        if (dbWinningTeam.rounds[roundIdx].didCover) {
                            //keep favorite owner the same
                            dbWinningTeam.rounds[nextRoundIdx].owner = dbWinningTeam.rounds[roundIdx].owner;
                            dbWinningTeam.rounds[roundIdx].ownerUpdated = true;
                            dbLosingTeam.rounds[roundIdx].ownerUpdated = true;
                            await dbWinningTeam.save();
                            await dbLosingTeam.save();
                            console.log('updated favorite')

                        } else if (!dbLosingTeam.rounds[roundIdx].isFavorite && dbLosingTeam.rounds[roundIdx].didCover) {
                            //owner of underdog in this round is new owner of winningTeam
                            dbWinningTeam.rounds[nextRoundIdx].owner = dbLosingTeam.rounds[roundIdx].owner;
                            dbWinningTeam.rounds[roundIdx].ownerUpdated = true;
                            dbLosingTeam.rounds[roundIdx].ownerUpdated = true;
                            await dbWinningTeam.save();
                            await dbLosingTeam.save();
                            console.log('updated favorite w previous underdog')

                        } else if (!dbWinningTeam.rounds[roundIdx].didCover && !dbLosingTeam.rounds[roundIdx].didCover) {
                            dbWinningTeam.rounds[nextRoundIdx].owner = dbWinningTeam.rounds[roundIdx].owner;
                            dbWinningTeam.rounds[roundIdx].ownerUpdated = true;
                            dbLosingTeam.rounds[roundIdx].ownerUpdated = true;
                            await dbWinningTeam.save();
                            await dbLosingTeam.save();
                        }

                        if (game.round === 6 && game.statusCodeDisplay === 'final') {
                            const championOwner = dbWinningTeam.rounds[5].owner;

                            await League.updateOne(
                                { _id: dbWinningTeam.leagueId },
                                { $set: { champion: championOwner } }
                            );

                            console.log(`Set champion for league ${dbWinningTeam.leagueId}: ${championOwner}`);
                        }

                    } else console.log('underdog or favorite not found')

                }
            }
        }
    } catch (err) {
        console.error('Error in updateOwners:', err);
        return { error: err.message || 'Error updating owners.' };
    }
}

module.exports = updateOwners;

