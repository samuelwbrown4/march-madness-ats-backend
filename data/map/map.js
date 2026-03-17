const path = require('path');
const fs = require('fs')

let rawEspnData = fs.readFileSync(path.resolve(__dirname, `./espnId.json`));
let espnData = JSON.parse(rawEspnData);

let rawSeoIdData = fs.readFileSync(path.resolve(__dirname, `./seoIdMap.json`));
let seoIdData = JSON.parse(rawSeoIdData);

fullMapArray = []

seoIdData.forEach(function (school) {
    let matchingSchool = espnData.find((espnSchool) => espnSchool.id === school.id);

    let editedSchoolObj = {
        name: matchingSchool.school,
        matchedId: school.id,
        seo: school.seo,
        mascot: matchingSchool.mascot,
        abbreviation: matchingSchool.abbreviation,
        displayName: matchingSchool.displayName,
        shortDisplayName: matchingSchool.shortDisplayName,
        espnId: matchingSchool.sourceId,
        logoURL: `https://a.espncdn.com/i/teamlogos/ncaa/500/${matchingSchool.sourceId}.png`
    }

    fullMapArray.push(editedSchoolObj)
});

fs.writeFileSync(
    `./master.json`,
    JSON.stringify(fullMapArray, null, 2)
);