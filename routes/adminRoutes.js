const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth')
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const runLog = require('../models/Timestamp');
const metadata = require('../models/Metadata');
const League = require('../models/League');
const Team = require('../models/Team')

const fetchAndStore = require('../scripts/fetchAndStore');
const spreadUpdater = require('../scripts/spreadUpdater');
const updateOwners = require('../scripts/updateOwners');
const fetchAndStoreMetadata = require('../scripts/fetchAndStoreMetadata');



router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (username !== process.env.ADMIN_USER) {
        return res.status(401).json({ error: 'Incorrect username' })
    }
    const validPassword = await bcrypt.compare(password, process.env.ADMIN_PASS_HASH);

    if (!validPassword) {
        return res.status(401).json({ error: 'Invalid password' })
    }

    const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '2h' });

    res.json({ token })
});

router.post('/update-scores', requireAdmin, async (req, res) => {
    const { inputDate, runDate } = req.body;
    console.log('scores input date', inputDate)
    try {
        await fetchAndStore(inputDate, runDate);
        res.json({ success: true })
    } catch (err) {
        console.error('Update Scores Error:', err);
        res.status(500).json({ error: 'Something went wrong' })
    }
});

router.post('/get-spreads', requireAdmin, async (req, res) => {
    const { inputDate, runDate } = req.body
    console.log('input date', inputDate)
    try {
        await spreadUpdater(inputDate, runDate);
        res.json({ success: true })
    } catch (err) {
        console.error('Spread Update Error:', err);
        res.status(500).json({ error: err.message || 'Unknown error' });
    }
});

router.post('/update-owners', requireAdmin, async (req, res) => {
    const { inputDate, runDate } = req.body
    try {
        await updateOwners(inputDate, runDate);
        res.json({ success: true })
    } catch {
        res.status(500).json()
    }
});


router.get('/get-runData', requireAdmin, async (req, res) => {
    try {
        const initializedLatest = await runLog.find({ runType: 'initialize' }).sort({ runOnDate: -1 }).limit(1);

        const spreadLatest = await runLog.find({ runType: 'spreadUpdate' }).sort({ runOnDate: -1 }).limit(1);

        const finalScoresLatest = await runLog.find({ runType: 'finalScoreUpdate' }).sort({ runOnDate: -1 }).limit(1);

        const ownersLatest = await runLog.find({ runType: 'ownerUpdate' }).sort({ runOnDate: -1 }).limit(1);

        const spreadAll = await runLog.find({ runType: 'spreadUpdate' });

        const finalScoresAll = await runLog.find({ runType: 'finalScoreUpdate' });

        const ownersAll = await runLog.find({ runType: 'ownerUpdate' })

        console.log(initializedLatest,
            spreadLatest,
            finalScoresLatest,
            ownersLatest,
            spreadAll,
            finalScoresAll,
            ownersAll)

        res.json({
            initializedLatest,
            spreadLatest,
            finalScoresLatest,
            ownersLatest,
            spreadAll,
            finalScoresAll,
            ownersAll
        })
    } catch {
        res.status(500).json()
    }

})

router.get('/get-metadata', async (req, res) => {
    try {
        const metaDocs = await metadata.find({})
        res.json({ metadata: metaDocs })
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})

router.post('/fetch-new-metadata', requireAdmin, async (req, res) => {
    try {
        const { inputDate } = req.body

        await fetchAndStoreMetadata(inputDate)
        res.json({ success: true })
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})

router.delete('/delete-league/:leagueName', requireAdmin, async (req, res) => {
    try {
        const { leagueName } = req.params;
        const { runOnDate } = req.body;

        await League.deleteOne({ name: leagueName });
        await Team.deleteMany({ leagueName: leagueName })
        await runLog.create({
            runType: 'leagueDelete',
            runOnDate: runOnDate,
            runForDate: null,
            runForYear: null
        })

        res.status(200).json({ success: true, deleted: true })
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})

router.delete('/run-log-reset', requireAdmin, async (req, res) => {
    try {
        const fs = require('fs');
        const path = require('path');

        const {yearToReset} = req.body;

        const logsToDelete = ['spreadUpdate', 'finalScoreUpdate', "ownerUpdate"];
        await runLog.deleteMany({ runType: { $in: logsToDelete } });

         await Team.updateMany(
            {},
            {
                $set: {
                    'rounds.$[].spread': null,
                    'rounds.$[].opponentSpread': null,
                    'rounds.$[].finalScore': null,
                    'rounds.$[].opponentFinalScore': null,
                    'rounds.$[].opponent': null,
                    'rounds.$[].isFinal': false,
                    'rounds.$[].didWin': false,
                    'rounds.$[].didCover': false,
                    'rounds.$[].isFavorite': false,
                    'rounds.$[].ownerUpdated': false
                }
            }
        );

        // Second update: Reset owner for rounds 1-5 only
        await Team.updateMany(
            {},
            {
                $set: {
                    'rounds.1.owner': null,
                    'rounds.2.owner': null,
                    'rounds.3.owner': null,
                    'rounds.4.owner': null,
                    'rounds.5.owner': null
                }
            }
        );
       
        const inputYear = Number(yearToReset); 
        const TOURNAMENT_API_BASE_URL = process.env.TOURNAMENT_API_BASE_URL;
        const API_URL = `${TOURNAMENT_API_BASE_URL}${inputYear}`;
        
        const apiRes = await fetch(API_URL);
        const data = await apiRes.json();
        
        const championship = data.championships[0];
        const games = championship.games;
        const rounds = championship.rounds;
        
        rounds.forEach(function (round) {
            if (round.roundNumber <= 5) {
                let dateParts = round.subtitle.split('-');
                round.startDate = new Date(`${dateParts[0]}/${inputYear}`);
                round.endDate = new Date(`${dateParts[1]}/${inputYear}`);
            } else {
                round.gameDate = new Date(`${round.subtitle}/${inputYear}`);
            }
        });

        games.forEach(function (game) {
            let gameDay = new Date(game.startDate);
            rounds.forEach(function (round) {
                if (gameDay >= round.startDate && gameDay <= round.endDate) {
                    game.round = round.roundNumber - 1;
                } else if (round.gameDate && gameDay.getTime() === round.gameDate.getTime()) {
                    game.round = round.roundNumber - 1;
                }
            });

            if (game.teams.length === 2) {
                game.teams.forEach(function (team) {
                    if (team.nameShort.endsWith("St.")) {
                        team.nameShort = team.nameShort.replace(/St\.$/, "State");
                    }
                });
            }
        });

        fs.writeFileSync(
            path.resolve(__dirname, `../data/tournament-data-${inputYear}.json`),
            JSON.stringify(data, null, 2)
        );

        res.status(200).json({
            success: true,
            message: 'Run logs deleted, team data reset, and tournament data refreshed'
        });

    } catch (error) {
        console.error('Reset error:', error);
        res.status(500).json({ message: error.message });
    }
});


router.patch('/archive/:leagueName' , requireAdmin , async (req , res) => {
       try {
        const { leagueName } = req.params;
        
        const league = await League.findOneAndUpdate(
            {name: leagueName},
            { isArchived: true },
            { new: true }
        );
        
        if (!league) {
            return res.status(404).json({ error: 'League not found' });
        }
        
        res.json({ success: true, message: 'League archived successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message || 'Server Error' });
    } 
})

module.exports = router;