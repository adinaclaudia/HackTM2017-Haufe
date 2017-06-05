/*jshint esversion: 6 */
const http = require('http');
const async = require('async');

/**
 * Cannot get game names via WrapAPI, because not all game names are undesrtood by Alexa. 
 * Therefore, we used understandable game names and mapped them to the web-adventures portal ids.
 */
// const https = require('https');
// function getGames(callback) {
//     var options = {
//         host: 'wrapapi.com',
//         path: '/use/raulfiru/endpoints/games/latest?wrapAPIKey=4bgBkwkb3PyVnuM8gggKfq251AQq2tuo',
//     };
//     https.get(options, function (res) {
//         var str = '';
//         res.on('data', function (chunk) {
//             str += chunk;
//         });
//         res.on('end', function () {
//             var data = JSON.parse(str).data;
//             callback(data.output[0].games);
//         });
//     }).on('error', function (e) {
//         console.log("Error message: " + e.message);
//     });
// }

let availableGames = [{
        name: "nine o'clock",
        url: "http://www.web-adventures.org/cgi-bin/webfrotz?s=905",
        id: "905"
    },
    {
        name: "nine dancers",
        url: "http://www.web-adventures.org/cgi-bin/webfrotz?s=9Dancers",
        id: "9Dancers"
    },
    {
        name: "The Acorn Court",
        url: "http://www.web-adventures.org/cgi-bin/webfrotz?s=AcornCourt",
        id: "AcornCourt"
    },
    {
        name: "Adventure",
        url: "http://www.web-adventures.org/cgi-bin/webfrotz?s=Adventure",
        id: "Adventure"
    },
    {
        name: "Ad Verbum",
        url: "http://www.web-adventures.org/cgi-bin/webfrotz?s=AdVerbum",
        id: "AdVerbum"
    },
    {
        name: "Aisle",
        url: "http://www.web-adventures.org/cgi-bin/webfrotz?s=Aisle",
        id: "Aisle"
    },
    {
        name: "The Bear",
        url: "http://www.web-adventures.org/cgi-bin/webfrotz?s=Bear",
        id: "Bear"
    },
    {
        name: "Galatea",
        url: "http://www.web-adventures.org/cgi-bin/webfrotz?s=Galatea",
        id: "Galatea"
    },
    {
        name: "Jigsaw",
        url: "http://www.web-adventures.org/cgi-bin/webfrotz?s=Jigsaw",
        id: "Jigsaw"
    },
    {
        name: "The Meteor",
        url: "http://www.web-adventures.org/cgi-bin/webfrotz?s=Sherbet",
        id: "Sherbet"
    },
    {
        name: "So Far",
        url: "http://www.web-adventures.org/cgi-bin/webfrotz?s=SoFar",
        id: "SoFar"
    },
    {
        name: "Spider and Web",
        url: "http://www.web-adventures.org/cgi-bin/webfrotz?s=Tangle",
        id: "Tangle"
    },
    {
        name: "Zork one",
        url: "http://www.web-adventures.org/cgi-bin/webfrotz?s=Zork1&t=Y",
        id: "Zork1"
    },
    {
        name: "Zork two",
        url: "http://www.web-adventures.org/cgi-bin/webfrotz?s=Zork2&t=Y",
        id: "Zork2"
    },
    {
        name: "Zork three",
        url: "http://www.web-adventures.org/cgi-bin/webfrotz?s=Zork3&t=Y",
        id: "Zork3"
    },
    {
        name: "Zork The Undiscovered Underground",
        url: "http://www.web-adventures.org/cgi-bin/webfrotz?s=ZTUU",
        id: "ZTUU"
    },
    {
        name: "Zork Dungeon",
        url: "http://www.web-adventures.org/cgi-bin/webfrotz?s=ZorkDungeon",
        id: "ZorkDungeon"
    }
];

let adventureNames = availableGames.map(function(elem){
    return elem.name;
}).join(", ");

function findGame(gameName) {
    return availableGames.find(item => {
        return item.name.toLowerCase() === gameName.toLowerCase();
    });
}

function callGame(game, sessionId, userAnswer, callback) {
    async.waterfall([
        callback => gameHttpRequest(game, sessionId, userAnswer, callback),
        (result) => parseResponse(result, userAnswer, callback)
    ], callback);
}

function gameHttpRequest(game, sessionId, answer, callback) {
    var result;
    let path = '/cgi-bin/webfrotz?s=' + game;
    if (sessionId) {
        path = path + '&x=' + sessionId;
    }
    if (answer) {
        path = path + '&a=' + encodeURIComponent(answer);
    }
    var options = {
        host: 'www.web-adventures.org',
        path: path
    };

    console.log("Request path=", options.path);
    http.request(options, (response) => {
        var str = '';

        //another chunk of data has been recieved, so append it to `str`
        response.on('data', function (chunk) {
            str += chunk;
        });

        //the whole response has been recieved, so we just print it out here
        response.on('end', function () {
            result = str;
            callback(null, result);
        });
    }).end();
}

function parseResponse(str, userAnswer, callback) {
    var result = '';
    let userAnswerWrapper = '';

    result = str.substr(str.lastIndexOf('<td width="80%" valign="top">'), str.length);
    if (userAnswer) {
        userAnswerWrapper = userAnswer;
    }
    userAnswerWrapper += '</font>';
    if(result.lastIndexOf(userAnswerWrapper) !== -1){
        result = result.substr(result.lastIndexOf(userAnswerWrapper) +
                userAnswerWrapper.length, result.length);
    }

    result = result.substr(0, result.indexOf("</td>"));
    result = result.replace(/<p class="status">.*<\/p>/, '');

    var regex = /(<([^>]+)>)/ig,
        body = result,
        res2 = body.replace(regex, "");

    res2 = cleanUp(res2);
    callback(res2);
}

function cleanUp(str) {
    var result = str;
    result = str.replace(/-----[\s\S]*?[\s\S]-----/, '');
    result = result.replace(/LARS[\s\S]*?[\s\S]6\/11/, '');
    result = result.replace(/THE ACORN[\s\S]*?[\s\S]1\.0/, '');
    result = result.replace(/ADVENTURE[\s\S]*?[\s\S]6\/11 S/, '');
    result = result.replace(/A BEAR\'S[\s\S]*?[\s\S] 6\/7/, '');
    result = result.replace(/Copyright[\s\S]*?[\s\S] 6\/10/, '');
    result = result.replace(/Copyright[\s\S]*?[\s\S]interpreter 1\.0/, '');
    result = result.replace(/The Interactive[\s\S]*?[\s\S]interpreter 1\.0/, '');
    result = result.replace(/Copyright[\s\S]*?[\s\S]840726/, '');
    result = result.replace(/Copyright[\s\S]*?[\s\S]840904/, '');
    result = result.replace(/Copyright[\s\S]*?[\s\S]840727/, '');
    result = result.replace(/Release[\s\S]*?[\s\S] 6\/7/, '');
    //console.log(result);
    return result;
}

module.exports={
    availableGames: availableGames,
    adventureNames: adventureNames,
    findGame: findGame,
    callGame: callGame
};
