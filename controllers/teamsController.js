const fs = require('fs');
const path = require('path');

const Team = require('../models/Team');
const League = require('../models/League');



exports.getAllTeams = async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const leagueId = req.query.leagueId;

    const league = await League.findById(leagueId);
    if (!league) {
        return res.status(404).json({ error: 'League not found' });
    }

    let rawData = fs.readFileSync(path.resolve(__dirname, `../data/tournament-data-${league.year}.json`));
    let tournamentData = JSON.parse(rawData);

    try {
        const allTeams = await Team.find({leagueId: leagueId});
        


        let round1Section4Games = []; //section 4 = West
        let round1Section2Games = []; //section 2 = South
        let round1Section3Games = []; //Section 3 = East
        let round1Section5Games = []; //section 5 = Midwest

        let round2Section4Games = [];
        let round2Section2Games = [];
        let round2Section3Games = [];
        let round2Section5Games = [];

        let round3Section4Games = [];
        let round3Section2Games = [];
        let round3Section3Games = [];
        let round3Section5Games = [];

        let round4Section4Games = [];
        let round4Section2Games = [];
        let round4Section3Games = [];
        let round4Section5Games = [];

        let round5Games = [];

        let finalGame = undefined;

        tournamentData.championships[0].games.forEach(function (game) {
            const gameDate = game.startDate || game.gameDate;

            if (game.round === 1) {
                if (game.sectionId === 4) {
                    round1Section4Games.push(game);
                } else if (game.sectionId === 2) {
                    round1Section2Games.push(game);
                } else if (game.sectionId === 3) {
                    round1Section3Games.push(game);
                } else if (game.sectionId === 5) {
                    round1Section5Games.push(game)
                }
            } else if (game.round === 2) {
                if (game.sectionId === 4) {
                    round2Section4Games.push(game);
                } else if (game.sectionId === 2) {
                    round2Section2Games.push(game);
                } else if (game.sectionId === 3) {
                    round2Section3Games.push(game);
                } else if (game.sectionId === 5) {
                    round2Section5Games.push(game)
                }
            } else if (game.round === 3) {
                if (game.sectionId === 4) {
                    round3Section4Games.push(game);
                } else if (game.sectionId === 2) {
                    round3Section2Games.push(game);
                } else if (game.sectionId === 3) {
                    round3Section3Games.push(game);
                } else if (game.sectionId === 5) {
                    round3Section5Games.push(game)
                }
            } else if (game.round === 4) {
                if (game.sectionId === 4) {
                    round4Section4Games.push(game);
                } else if (game.sectionId === 2) {
                    round4Section2Games.push(game);
                } else if (game.sectionId === 3) {
                    round4Section3Games.push(game);
                } else if (game.sectionId === 5) {
                    round4Section5Games.push(game)
                }
            } else if (game.round === 5) {
                round5Games.push(game);
            } else if (game.round === 6) {
                finalGame = game;
            }
        });

        let finalFourLeft = round5Games[0]
        let finalFourRight = round5Games[1]

        function attachDbDataToGameTeams(gameArray, dbTeams) {

            gameArray.forEach(function (game) {

                let roundIdx = game.round - 1;

                game.teams.forEach(function (team) {
                    let dbTeam = dbTeams.find((t) => t.name === team.nameShort && t.seed === team.seed);

                    team.owner = dbTeam.rounds[roundIdx].owner;
                    team.dbSpread = dbTeam.rounds[roundIdx].spread;
                    team.isFinal = dbTeam.rounds[roundIdx].isFinal;
                    team.didCover = dbTeam.rounds[roundIdx].didCover;
                    team.logoURL = dbTeam.rounds[roundIdx].logoURL;
                })
            })
        }

        function attachDbDataToFinalFour(gameArray, dbTeams) {
            gameArray.forEach(function (game) {
                let roundIdx = game.round - 1;

                game.teams.forEach(function (team) {
                    let dbTeam = dbTeams.find((t) => t.name === team.nameShort && t.seed === team.seed);

                    team.owner = dbTeam.rounds[roundIdx].owner;
                    team.dbSpread = dbTeam.rounds[roundIdx].spread;
                    team.isFinal = dbTeam.rounds[roundIdx].isFinal;
                    team.didCover = dbTeam.rounds[roundIdx].didCover;
                    team.logoURL = dbTeam.rounds[roundIdx].logoURL;
                })
            })
        }

        function attachDbDataToFinal(game, dbTeams) {
            game.teams.forEach(function (team) {
                let roundIdx = game.round - 1;
                let dbTeam = dbTeams.find((t) => t.name === team.nameShort && t.seed === team.seed);

                team.owner = dbTeam.rounds[roundIdx].owner;
                team.dbSpread = dbTeam.rounds[roundIdx].spread;
                team.isFinal = dbTeam.rounds[roundIdx].isFinal;
                team.didCover = dbTeam.rounds[roundIdx].didCover;
                team.logoURL = dbTeam.rounds[roundIdx].logoURL;
            })
        }

        attachDbDataToGameTeams(round1Section4Games, allTeams)
        attachDbDataToGameTeams(round1Section2Games, allTeams)
        attachDbDataToGameTeams(round1Section3Games, allTeams)
        attachDbDataToGameTeams(round1Section5Games, allTeams)

        attachDbDataToGameTeams(round2Section4Games, allTeams)
        attachDbDataToGameTeams(round2Section2Games, allTeams)
        attachDbDataToGameTeams(round2Section3Games, allTeams)
        attachDbDataToGameTeams(round2Section5Games, allTeams)

        attachDbDataToGameTeams(round3Section4Games, allTeams)
        attachDbDataToGameTeams(round3Section2Games, allTeams)
        attachDbDataToGameTeams(round3Section3Games, allTeams)
        attachDbDataToGameTeams(round3Section5Games, allTeams)

        attachDbDataToGameTeams(round4Section4Games, allTeams)
        attachDbDataToGameTeams(round4Section2Games, allTeams)
        attachDbDataToGameTeams(round4Section3Games, allTeams)
        attachDbDataToGameTeams(round4Section5Games, allTeams)

        attachDbDataToFinalFour(round5Games, allTeams)


        attachDbDataToFinal(finalGame, allTeams)

        res.json({
            round1Section4Games,
            round1Section2Games,
            round1Section3Games,
            round1Section5Games,
            round2Section4Games,
            round2Section2Games,
            round2Section3Games,
            round2Section5Games,
            round3Section4Games,
            round3Section2Games,
            round3Section3Games,
            round3Section5Games,
            round4Section4Games,
            round4Section2Games,
            round4Section3Games,
            round4Section5Games,
            round5Games,
            finalGame
        });


    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}