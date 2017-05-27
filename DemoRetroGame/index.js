/*jshint esversion: 6 */

const http = require('http');
const https = require('https');
const uuidV1 = require('uuid/v1');
const async = require('async');

//Logic-----------------

//e.g
// callGameWaterfall("905", "1234567999", '', (result) => {
//     if (result) {
//         console.log("end: " + result);
//     }
// });


function callGame(game, sessionId, answer, callback) {
    var result;
    //The url we want is: 'www.random.org/integers/?num=1&min=1&max=10&col=1&base=10&format=plain&rnd=new'

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

function callGameWaterfall(game, sessionId, userAnswer, callback) {
    async.waterfall([
        callback => callGame(game, sessionId, userAnswer, callback),
        (result) => parseResponse(result, userAnswer, callback)
    ], callback);
}

function parseResponse(str, userAnswer, callback) {
    var result = '';

    //console.log(str.length);

    if (userAnswer) {
        let userAnswerWrapper = userAnswer+'</font>';
        result = str.substr(str.lastIndexOf(userAnswerWrapper) +
            userAnswerWrapper.length, str.length);
    } else {
        result = str.substr(str.lastIndexOf('<td width="80%" valign="top">'), str.length);
    }

    result = result.substr(0, result.indexOf("</td>"));

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

function getGames(callback) {
    var options = {
        host: 'wrapapi.com',
        path: '/use/raulfiru/endpoints/games/latest?wrapAPIKey=4bgBkwkb3PyVnuM8gggKfq251AQq2tuo',
    };
    https.get(options, function (res) {
        var str = '';
        res.on('data', function (chunk) {
            str += chunk;
        });
        res.on('end', function () {
            var data = JSON.parse(str).data;
            callback(data.output[0].games);
        });
    }).on('error', function (e) {
        console.log("Error message: " + e.message);
    });
}

// Intents ------------------------
const sessionAttributes = {};

function getWelcomeResponse(callback) {
    // If we wanted to initialize the session to have some attributes we could add those here.
    sessionAttributes.sessionId = uuidV1();
    const cardTitle = 'Welcome';
    let speechOutput = 'Welcome to Adventure Time.';
    // If the user either does not reply to the welcome message or says something that is not
    // understood, they will be prompted again with this text.
    let repromptText = 'Please select a game to play';
    const shouldEndSession = false;

    getGames(games => {
        sessionAttributes.games = games;
        if (games) {
            var adventureNames = "";
            games.forEach(function (element) {
                adventureNames += element.name + ", ";
            });
            speechOutput += 'Please select one of the following adventures: ' + adventureNames;
            sessionAttributes.adventureNames = adventureNames;
        } else {
            speechOutput += 'Sorry but I cannot retrieve list of games at this time. Please try again later!';
            repromptText = 'Please try again later!';
        }
        callback(sessionAttributes,
            buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
    });


    // callGameWaterfall(sessionAttributes.game, sessionAttributes.sessionId, null, (result) => {
    //     console.log("Result was received: " + result);
    //     const cardTitle = "PlayGameIntent" + sessionAttributes.game;
    //     const speechOutput = result;
    //     // If the user either does not reply to the welcome message or says something that is not
    //     // understood, they will be prompted again with this text.
    //     const repromptText = result;
    //     const shouldEndSession = false;

    //     callback(sessionAttributes,
    //         buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
    // });
}

function selectGame(intent, session, callback) {
    //TODO if selecting after game has started, retry
    const gameSlot = intent.slots.Game;

    const shouldEndSession = false;
    try {
        if (gameSlot) {
            let game = gameSlot.value;
            console.log("selected game name: " + game);
            let selectedGame = sessionAttributes.games.find(item => {
                return item.name.toLowerCase() === game.toLowerCase();
            });
            if (selectedGame) {
                console.log("corresponding game id: " + selectedGame.id[0]);
                sessionAttributes.selectedGame = selectedGame.id[0];
            } else {
                throw new Error("did not recognize game");
            }
            playGame(intent.name, null, callback);
        } else {
            throw new Error("did not get game slot");
        }
    } catch (error) {
        console.error(error);
        let speechOutput = 'Sorry but I did not recognize selected game. Please select one of: ' + sessionAttributes.adventureNames;
        let repromptText = 'Please select one of: ' + sessionAttributes.adventureNames;
        callback(sessionAttributes,
            buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
    }
}

function handlePlayGame(intent, session, callback) {
    const textSlot = intent.slots.Text;
    if (textSlot) {
        const userAnswerValue = textSlot.value;
        console.log("User answer: " + userAnswerValue);
        playGame(intent.name, userAnswerValue, callback);
    } else {
        const cardTitle = intent.name + sessionAttributes.selectedGame;
        const shouldEndSession = false;
        let speechOutput = "I'm not sure what you said. Please try again.";
        let repromptText = "Can you try again please?";
        callback(sessionAttributes,
            buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
    }
}

function playGame(intentName, userAnswer, callback){
    const cardTitle = intentName + sessionAttributes.selectedGame;
    const shouldEndSession = false;
    callGameWaterfall(sessionAttributes.selectedGame, sessionAttributes.sessionId, userAnswer, (result) => {
        console.log("Result was received: " + result);
        const speechOutput = result;
        // If the user either does not reply to the welcome message or says something that is not
        // understood, they will be prompted again with this text.
        const repromptText = result;
        callback(sessionAttributes,
            buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
    });
}

// function handleSuperIntent(intent, session, callback) {
//     const cardTitle = intent.name;
//     const text = intent.slots.Text;
//     let repromptText = '';

//     const shouldEndSession = false;
//     let speechOutput = '';

//     if (text) {
//         const textValue = text.value;
//         speechOutput = textValue;
//         repromptText = "What do you want me to say next?";
//     } else {
//         speechOutput = "I'm not sure what you said. Please try again.";
//         repromptText = "What do you want me to say next?";
//     }

//     callback(sessionAttributes,
//         buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
// }
// --------------- Events -----------------------

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
    console.log(`onSessionStarted requestId=${sessionStartedRequest.requestId}, sessionId=${session.sessionId}`);
}

/**
 * Called when the user launches the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    console.log(`onLaunch requestId=${launchRequest.requestId}, sessionId=${session.sessionId}`);

    // Dispatch to your skill's launch.
    getWelcomeResponse(callback);
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {
    console.log(`onIntent requestId=${intentRequest.requestId}, sessionId=${session.sessionId}`);

    const intent = intentRequest.intent;
    const intentName = intentRequest.intent.name;

    // Dispatch to your skill's intent handlers
    if (intentName === 'SelectGameIntent') {
        selectGame(intent, session, callback);
    } else if (intentName === 'PlayGameIntent') {
        handlePlayGame(intent, session, callback);
    } else if (intentName === 'AMAZON.StopIntent' || intentName === 'AMAZON.CancelIntent') {
        handleSessionEndRequest(callback);
    } else {
        throw new Error('Invalid intent');
    }
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
    console.log(`onSessionEnded requestId=${sessionEndedRequest.requestId}, sessionId=${session.sessionId}`);
    // Add cleanup logic here
}

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = (event, context, callback) => {
    try {
        console.log(`event.session.application.applicationId=${event.session.application.applicationId}`);

        /**
         * Uncomment this if statement and populate with your skill's application ID to
         * prevent someone else from configuring a skill that sends requests to this function.
         */
        /*
        if (event.session.application.applicationId !== 'amzn1.echo-sdk-ams.app.[unique-value-here]') {
             callback('Invalid Application ID');
        }
        */

        if (event.session.new) {
            onSessionStarted({
                requestId: event.request.requestId
            }, event.session);
        }

        if (event.request.type === 'LaunchRequest') {
            onLaunch(event.request,
                event.session,
                (sessionAttributes, speechletResponse) => {
                    callback(null, buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === 'IntentRequest') {
            onIntent(event.request,
                event.session,
                (sessionAttributes, speechletResponse) => {
                    callback(null, buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === 'SessionEndedRequest') {
            onSessionEnded(event.request, event.session);
            callback();
        }
    } catch (err) {
        callback(err);
    }
};

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: 'PlainText',
            text: output,
        },
        card: {
            type: 'Simple',
            title: `SessionSpeechlet - ${title}`,
            content: `SessionSpeechlet - ${output}`,
        },
        reprompt: {
            outputSpeech: {
                type: 'PlainText',
                text: repromptText,
            },
        },
        shouldEndSession,
    };
}


function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: '1.0',
        sessionAttributes,
        response: speechletResponse,
    };
}