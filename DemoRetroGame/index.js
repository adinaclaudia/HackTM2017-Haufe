/*jshint esversion: 6 */

const http = require('http');
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
        result = str.substr(str.lastIndexOf(userAnswer) +
            userAnswer.length, str.length);
    } else {
        result = str.substr(str.lastIndexOf('<td width="80%" valign="top">'), str.length);
    }

    result = result.substr(0, result.indexOf("</td>"));
    result = result.replace(/<p class="status">.*<\/p>/, '' );

    var regex = /(<([^>]+)>)/ig,
        body = result,
        res2 = body.replace(regex, "");

    callback(res2);
}

// Intents ------------------------
const sessionAttributes = {
        game: "905"
}; 

function getWelcomeResponse(callback) {
    // If we wanted to initialize the session to have some attributes we could add those here.
    sessionAttributes.sessionId = uuidV1();
    // const cardTitle = 'Welcome';
    // const speechOutput = 'Welcome Demo Retro Game. Please start game';
    // // If the user either does not reply to the welcome message or says something that is not
    // // understood, they will be prompted again with this text.
    // const repromptText = 'Please start game.';
    // const shouldEndSession = false;

    // callback(sessionAttributes,
    //     buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
    callGameWaterfall(sessionAttributes.game, sessionAttributes.sessionId, null, (result) => {
        console.log("Result was received: " + result);
        const cardTitle = "PlayGameIntent" + sessionAttributes.game;
        const speechOutput = result;
        // If the user either does not reply to the welcome message or says something that is not
        // understood, they will be prompted again with this text.
        const repromptText = result;
        const shouldEndSession = false;

        callback(sessionAttributes,
            buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
    });
}

function playGame(intent, session, callback) {
    const textSlot = intent.slots.Text;
    const cardTitle = intent.name + sessionAttributes.game;
    const shouldEndSession = false;
    if(textSlot){
        const userAnswerValue = textSlot.value;
        console.log("User answer: "+ userAnswerValue);
        callGameWaterfall(sessionAttributes.game, sessionAttributes.sessionId, userAnswerValue, (result) => {
            console.log("Result was received: " + result);
            const speechOutput = result;
            // If the user either does not reply to the welcome message or says something that is not
            // understood, they will be prompted again with this text.
            const repromptText = result;
            callback(sessionAttributes,
                buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
        });
    }
    else{
        speechOutput = "I'm not sure what you said. Please try again.";
        repromptText = "Can you try again please?";
        callback(sessionAttributes,
                buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
    }
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
    if (intentName === 'PlayGameIntent') {
        playGame(intent, session, callback);
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