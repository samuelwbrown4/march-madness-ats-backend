const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const League = require('../models/League')
const Team = require('../models/Team')
const LeagueQueue = require('../models/LeagueQueue')

const initialSeedTeams = require('../scripts/initialSeed');

router.get('/exists/:name', async (req, res) => {
    const leagueName = req.params.name;
    console.log(leagueName)
    try {
        const league = await League.findOne({ name: leagueName });
        if (league) {
            res.json({
                exists: true,
                leagueId: league._id
            })
        } else {
            res.json({ exists: false })
        }
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }

})

router.get('/name', async (req, res) => {
    const leagueId = req.query.leagueId

    try {
        const matchLeague = await League.findOne({ _id: leagueId })
        if (matchLeague) {
            res.status(200).json({ name: matchLeague.name, players: matchLeague.players })
        } else {
            res.json({ message: 'no team name found' })
        }
    } catch (error) {
        res.status(500).json({ error: 'Server Error' })
    }


})


router.post('/initialize-tournament', async (req, res) => {
    const { leagueName, owners, numberOfOwners, year, runDate } = req.body
    console.log('req received')

    try {
        const result = await initialSeedTeams(leagueName, owners, numberOfOwners, year, runDate);
        if (result && result.error) {
            return res.status(400).json({ error: result.error });
        }
        res.json({ success: true })
    } catch (error) {
        res.status(500).json({ error: error.message || 'Server Error' });
    }
});

router.get('/get-standings', async (req, res) => {
    let leagueId = req.query.leagueId

    try {


        const matchLeague = await League.findOne({ _id: leagueId })

        const allTeams = await Team.find({ leagueId: leagueId })

        console.log('allteams', allTeams)

        const players = matchLeague.players
        let standings = [];

        players.forEach(function (player) {
            standings.push({
                name: player,
                teamCount: 0,
                teams: []
            })
        })
        let unplayedGames = [];

        allTeams.forEach(function (team) {

            let currentGame = team.rounds.find((round) => round.owner !== null && round.owner !== undefined && round.isFinal === false)
            if (currentGame) { unplayedGames.push(currentGame) }

        });

        console.log('unplayedgames', unplayedGames)

        standings.forEach(function (player) {
            unplayedGames.forEach(function (game) {
                if (game.owner === player.name) {
                    player.teamCount++
                    player.teams.push(game.ownerTeam)
                }
            })
        })

        standings.sort((a, b) => b.teamCount - a.teamCount);

        res.status(200).json({ success: true, name: matchLeague.name, standings: standings });

    } catch (error) {
        res.status(500).json({ error: error.message || 'Server Error' });
    }

})

router.get('/get-all-leagues', async (req, res) => {
    try {
        const allLeagues = await League.find({})

        let allLeagueNames = [];

        allLeagues.forEach(function (league) {
            allLeagueNames.push(league.name)
        })

        res.status(200).json({ success: true, leagueArray: allLeagueNames })
    } catch (error) {
        res.status(500).json({ error: error.message || 'Server Error' });
    }

})

router.post('/queue-league', async (req, res) => {
    try {
        const { leagueName, owners, numberOfOwners, year, runDate } = req.body
        console.log('req received')

        let existingLeague = await LeagueQueue.findOne({ name: leagueName });

        if (!existingLeague) {
            await LeagueQueue.create({
                name: leagueName,
                players: owners,
                numberOfOwners: numberOfOwners,
                year: year,
                createdAt: runDate
            })

            res.status(200).json({ success: true })
        } else {
            res.status(200).json({ error: 'League name already queued'})
        }


    } catch (error) {
        res.status(500).json({ error: error.message || 'Server Error' });
    }


})

module.exports = router;