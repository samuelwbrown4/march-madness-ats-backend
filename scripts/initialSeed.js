const mongoose = require('mongoose');
const fs = require('fs');
const Team = require('../models/Team')
const Timestamp = require('../models/Timestamp')
const League = require('../models/League')




async function initialSeedTeams(leagueName, owners, numberOfOwners, inputYear, runDate) {
    console.log("number of owners:" , numberOfOwners)
    const regions = [2, 3, 4, 5];

    const TOURNAMENT_API_BASE_URL = process.env.TOURNAMENT_API_BASE_URL

    const API_URL = `${TOURNAMENT_API_BASE_URL}${inputYear}`

    try {

        const existingLeague = await League.findOne({ name: leagueName })

        if (existingLeague) {
            return { error: 'League name already exists!' }
        }

        const newLeague = await League.create({ name: leagueName, players: owners, year: inputYear });

        const res = await fetch(API_URL);
        const data = await res.json();


        const championship = data.championships[0];
        const games = championship.games;
        const rounds = championship.rounds;
        //change year to current tournament year
        const year = inputYear

        const log = {
            runType: 'initialize',
            runOnDate: runDate,
            runForDate: null,
            runForYear: inputYear
        }

        await Timestamp.insertOne(log);

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

            const formatYMD = dateObj => {
                const year = dateObj.getFullYear();
                const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                const day = String(dateObj.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };

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
            `./data/tournament-data-${inputYear}.json`,
            JSON.stringify(data, null, 2)
        );

        function shuffle(array) {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
        }

        const allTeams = []

        if (numberOfOwners === 8) {

            for (let region of regions) {
                const regionGames = games.filter(game => game.sectionId === region && game.round === 1);
                const teams = [];

                const shuffledOwners = [...owners];
                shuffle(shuffledOwners);

                const ownerAssignments = Array(shuffledOwners.length).fill(0);

                regionGames.forEach(game => {
                    // Find two owners who have less than 2 teams
                    let availableOwners = shuffledOwners.filter((owner, idx) => ownerAssignments[idx] < 2);
                    shuffle(availableOwners);
                    game.teams.forEach((team, teamIdx) => {
                        // Pick an owner who doesn't have 2 teams yet
                        let owner;
                        for (let idx = 0; idx < availableOwners.length; idx++) {
                            if (ownerAssignments[shuffledOwners.indexOf(availableOwners[idx])] < 2) {
                                owner = availableOwners[idx];
                                ownerAssignments[shuffledOwners.indexOf(owner)] += 1;
                                availableOwners.splice(idx, 1);
                                break;
                            }
                        }
                        teams.push({
                            name: team.nameShort,
                            seed: team.seed,
                            rounds: [
                                {
                                    owner: owner,
                                    ownerTeam: team.nameShort,
                                    spread: null,
                                    finalScore: null,
                                    opponent: null,
                                    opponentSpread: null,
                                    opponentFinalScore: null,
                                    isFavorite: false,
                                    didWin: false,
                                    didCover: false,
                                    isFinal: false,
                                    ownerUpdated: false
                                },
                                {
                                    owner: null,
                                    ownerTeam: team.nameShort,
                                    spread: null,
                                    finalScore: null,
                                    opponent: null,
                                    opponentSpread: null,
                                    opponentFinalScore: null,
                                    isFavorite: false,
                                    didWin: false,
                                    didCover: false,
                                    isFinal: false,
                                    ownerUpdated: false
                                },
                                {
                                    owner: null,
                                    ownerTeam: team.nameShort,
                                    spread: null,
                                    finalScore: null,
                                    opponent: null,
                                    opponentSpread: null,
                                    opponentFinalScore: null,
                                    isFavorite: false,
                                    didWin: false,
                                    didCover: false,
                                    isFinal: false,
                                    ownerUpdated: false
                                },
                                {
                                    owner: null,
                                    ownerTeam: team.nameShort,
                                    spread: null,
                                    finalScore: null,
                                    opponent: null,
                                    opponentSpread: null,
                                    opponentFinalScore: null,
                                    isFavorite: false,
                                    didWin: false,
                                    didCover: false,
                                    isFinal: false,
                                    ownerUpdated: false
                                },
                                {
                                    owner: null,
                                    ownerTeam: team.nameShort,
                                    spread: null,
                                    finalScore: null,
                                    opponent: null,
                                    opponentSpread: null,
                                    opponentFinalScore: null,
                                    isFavorite: false,
                                    didWin: false,
                                    didCover: false,
                                    isFinal: false,
                                    ownerUpdated: false
                                },
                                {
                                    owner: null,
                                    ownerTeam: team.nameShort,
                                    spread: null,
                                    finalScore: null,
                                    opponent: null,
                                    opponentSpread: null,
                                    opponentFinalScore: null,
                                    isFavorite: false,
                                    didWin: false,
                                    didCover: false,
                                    isFinal: false,
                                    ownerUpdated: false
                                }
                            ],
                            leagueName: leagueName,
                            leagueId: newLeague._id
                        });
                    });
                });

                allTeams.push(...teams);

            }
        } else if (numberOfOwners === 64) {
            const shuffledOwners = [...owners];
            shuffle(shuffledOwners);

            const firstRoundGames = games.filter((game) => game.round === 1);
            console.log('First round games:', firstRoundGames.length);

            let ownerIdx = 0;

            firstRoundGames.forEach(function (game) {
                game.teams.forEach(function (team) {
                    allTeams.push({
                        name: team.nameShort,
                        seed: team.seed,
                        rounds: [
                            {
                                owner: shuffledOwners[ownerIdx],
                                ownerTeam: team.nameShort,
                                spread: null,
                                finalScore: null,
                                opponent: null,
                                opponentSpread: null,
                                opponentFinalScore: null,
                                isFavorite: false,
                                didWin: false,
                                didCover: false,
                                isFinal: false,
                                ownerUpdated: false
                            },
                            {
                                owner: null,
                                ownerTeam: team.nameShort,
                                spread: null,
                                finalScore: null,
                                opponent: null,
                                opponentSpread: null,
                                opponentFinalScore: null,
                                isFavorite: false,
                                didWin: false,
                                didCover: false,
                                isFinal: false,
                                ownerUpdated: false
                            },
                            {
                                owner: null,
                                ownerTeam: team.nameShort,
                                spread: null,
                                finalScore: null,
                                opponent: null,
                                opponentSpread: null,
                                opponentFinalScore: null,
                                isFavorite: false,
                                didWin: false,
                                didCover: false,
                                isFinal: false,
                                ownerUpdated: false
                            },
                            {
                                owner: null,
                                ownerTeam: team.nameShort,
                                spread: null,
                                finalScore: null,
                                opponent: null,
                                opponentSpread: null,
                                opponentFinalScore: null,
                                isFavorite: false,
                                didWin: false,
                                didCover: false,
                                isFinal: false,
                                ownerUpdated: false
                            },
                            {
                                owner: null,
                                ownerTeam: team.nameShort,
                                spread: null,
                                finalScore: null,
                                opponent: null,
                                opponentSpread: null,
                                opponentFinalScore: null,
                                isFavorite: false,
                                didWin: false,
                                didCover: false,
                                isFinal: false,
                                ownerUpdated: false
                            },
                            {
                                owner: null,
                                ownerTeam: team.nameShort,
                                spread: null,
                                finalScore: null,
                                opponent: null,
                                opponentSpread: null,
                                opponentFinalScore: null,
                                isFavorite: false,
                                didWin: false,
                                didCover: false,
                                isFinal: false,
                                ownerUpdated: false
                            }
                        ],
                        leagueName: leagueName,
                        leagueId: newLeague._id
                    });
                    ownerIdx++
                });
            });
        }

        console.log('Teams to insert:', allTeams.length);
        await Team.insertMany(allTeams);
        console.log(`All teams seeded!`);



    } catch (err) {
        console.log('ERROR SEEDING TEAMS: ', err);
        return { error: err.message || 'Error seeding teams.' };
    }
}

module.exports = initialSeedTeams;

