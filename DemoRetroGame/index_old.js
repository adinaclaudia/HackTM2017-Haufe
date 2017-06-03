/*jshint esversion: 6 */


const uuidV1 = require('uuid/v1');
const async = require('async');
const games = require('./games');


// Intents ------------------------
let sessionAttributes = {};

function getWelcomeResponse(callback) {
    // If we wanted to initialize the session to have some attributes we could add those here.
    sessionAttributes = {};
    const cardTitle = 'Welcome';
    let speechOutput = 'Welcome to retro games. Please select a game or list games if unsure';

    // If the user either does not reply to the welcome message or says something that is not
    // understood, they will be prompted again with this text.
    let repromptText = 'Please select a game to play';
    const shouldEndSession = false;
    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function listGames(intent, callback) {

    const cardTitle = 'ListGames';
    let speechOutput = 'Available games are: ' + games.adventureNames;

    // If the user either does not reply to the welcome message or says something that is not
    // understood, they will be prompted again with this text.
    let repromptText = speechOutput;
    const shouldEndSession = false;
    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function selectGame(intent, session, callback) {
    const shouldEndSession = false;
    // if (sessionAttributes.selectedGame) {
    //     let speechOutput = 'You are already playing a game. If you want to select a different game please exit first and play new game.';
    //     let repromptText = 'If you want to select a different game please exit first and play new game.';
    //     callback(sessionAttributes,
    //         buildSpeechletResponse(intent.name, speechOutput, repromptText, shouldEndSession));
    // } else {
        sessionAttributes.sessionId = uuidV1();
        const gameSlot = intent.slots.Game;
        let error = false;
        //try {
        if (gameSlot) {
            let game = gameSlot.value;
            console.log("selected game name: " + game);
            let selectedGame = games.findGame(game);
            if (selectedGame) {
                console.log("corresponding game id: " + selectedGame.id);
                sessionAttributes.selectedGame = selectedGame.id;
            } else {
                //throw new Error("did not recognize game");
                if (game && game.startsWith("zork")) {
                    let zorkGames = games.adventureNames.substring(games.adventureNames.indexOf("Zork"), games.adventureNames.length);
                    let speechOutput = 'Which zork game do you want to play? Select one of ' + zorkGames;
                    let repromptText = speechOutput;
                    callback(sessionAttributes,
                        buildSpeechletResponse(intent.name, speechOutput, repromptText, shouldEndSession));
                } else {
                    error = true;
                }
            }
            playGame(intent.name, null, callback);
        } else {
            //throw new Error("did not get game slot");
            error = true;
        }

        //} catch (error) {
        if (error) {
            console.error(error);
            let speechOutput = 'Sorry but I did not recognize selected game. Please select one of: ' + games.adventureNames;
            let repromptText = 'Please select one of: ' + games.adventureNames;
            callback(sessionAttributes,
                buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
        }
    //}
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

function playGame(intentName, userAnswer, callback) {
    const cardTitle = intentName + sessionAttributes.selectedGame;
    const shouldEndSession = false;
    games.callGame(sessionAttributes.selectedGame, sessionAttributes.sessionId, userAnswer, (result) => {
        console.log("Result was received: " + result);
        const speechOutput = result;
        // If the user either does not reply to the welcome message or says something that is not
        // understood, they will be prompted again with this text.
        const repromptText = result;
        callback(sessionAttributes,
            buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
    });
}


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
    if (intentName === 'ListGamesIntent') {
        listGames(intentName, callback);
    } else if (intentName === 'SelectGameIntent') {
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