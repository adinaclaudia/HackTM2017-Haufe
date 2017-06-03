/*jshint esversion: 6 */

const Alexa = require('alexa-sdk');
const uuidV1 = require('uuid/v1');
const async = require('async');
const games = require('./games');

let appId = 'amzn1.echo-sdk-ams.app.retro-game-hack-tm-2017';

exports.handler = function (event, context, callback) {
    var alexa = Alexa.handler(event, context);
    alexa.appId = appId;
    alexa.dynamoDBTableName = 'retroGames';
    alexa.registerHandlers(newSessionHandlers, startGameHandlers, selectModeHandlers, 
        playModeHandlers, saveModeHandlers);
    alexa.execute();
};

var states = {
    PLAYMODE: '_PLAYMODE', // User has started playing a game
    STARTMODE: '_STARTMODE', // Prompt the user to start or restart the game.
    SAVEMODE: '_SAVEMODE', //user wants to save game
    SELECTMODE: '_SELECTMODE' //user has selected a game
};

let newSessionHandlers = {
    'NewSession': function () {
        console.log('new session');
        if (Object.keys(this.attributes).length === 0) {
            this.attributes.endedSessionCount = 0;
            //this.attributes.gamesPlayed = 0;
            this.attributes.gameInProgress = {};
            this.attributes.savedGames = []; //savedGames = [{ id: gameId, name: gameName, session: sessionId }]
        }
        //TODO reset game in progress?
        this.handler.state = states.STARTMODE;
        let response = 'Welcome to retro games. ';
        if (this.attributes.savedGames.length !== 0) {
            response += 'You have the following saved games: ' + getSavedGameNames();
        } else {
            response += 'Please select a game or list games if unsure.';
        }

        this.emit(':ask', response);
    },
    "AMAZON.StopIntent": function () {
        this.emit(':tell', "Goodbye!");
    },
    "AMAZON.CancelIntent": function () {
        this.emit(':tell', "Goodbye!");
    },
    'SessionEndedRequest': function () {
        console.log('session ended!');
        //this.attributes['endedSessionCount'] += 1;
        this.emit(":tell", "Goodbye!");
    }
};

let startGameHandlers = Alexa.CreateStateHandler(states.STARTMODE, {
    'NewSession': function () {
        console.log('Startmode new session');
        this.emit('NewSession'); // Uses the handler in newSessionHandlers
    },
    'AMAZON.HelpIntent': function () {
        var message = 'If you don\'t know what games are available, say "list games". ' +
            'If you want to play a game, say "play" and the game name. ' +
            'You can always exit and save your game progress';
        this.emit(':ask', message, message);
    },
    'ListGamesIntent': function () {
        let availableGames = 'Available games are: ' + games.adventureNames;
        this.emit(':tell', availableGames, availableGames);
    },
    'ListSavedGamesIntent': function () {
        let message;
        if (this.attributes.savedGames.length === 0) {
            message = 'You do not have any saved games.';
        } else if (this.attributes.savedGames.length === 1) {
            message = 'You have one saved game: ' + getSavedGameNames();
        } else {
            message = 'Your saved games are: ' + getSavedGameNames();
        } 
        this.emit(':tell', message, message);
    },
    'SelectGameIntent': function () {
        const gameSlot = this.event.request.intent.slots.Game;
        let handleError = false;
        if(gameSlot){
            let game = gameSlot.value;
            console.log("selected game name: " + game);
            let selectedGame = games.findGame(game);
            if (selectedGame) {
                console.log("corresponding game id: " + selectedGame.id);
                this.attributes.gameInProgress = selectedGame;
                this.attributes.gameInProgress.sessionId = uuidV1();
                this.handler.state = states.SELECTMODE;
                this.emitWithState('PlayGameIntent');
            } else {
                if (game && game.startsWith("zork")) {
                    let zorkGames = games.adventureNames.substring(
                        games.adventureNames.indexOf("Zork"), 
                        games.adventureNames.length);
                    let message = 'Which zork game do you want to play? Select one of ' + zorkGames;
                    this(':ask', message, message);
                } else {
                    handleError=true;
                }
            }
        } else {
            handleError=true;
        }
        if(handleError) {
            console.log('Error: could not handle select game');
            let message = 'Sorry but I did not recognize selected game. Please select one of: ' + games.adventureNames;
            this.emit(':tell', message, message);
        }
    },
    'SaveGameIntent': function () {
        this.emit(':tell', 'Sorry, but you did not start a game yet. Try help if you don\'t know what to do');
    },
    "AMAZON.StopIntent": function () {
        console.log("STOPINTENT in startmode");
        this.emit(':tell', "Goodbye!");
    },
    "AMAZON.CancelIntent": function () {
        console.log("CANCELINTENT in startmode");
        this.emit(':tell', "Goodbye!");
    },
    'SessionEndedRequest': function () {
        console.log("SESSIONENDEDREQUEST in startmode");
        //this.attributes['endedSessionCount'] += 1;
        this.emit(':tell', "Goodbye!");
    },
    'Unhandled': function () {
        console.log("UNHANDLED in startmode");
        let message = 'Please select a game to play.';
        this.emit(':ask', message, message);
    }
});

let selectModeHandlers = Alexa.CreateStateHandler(states.SELECTMODE, {
    'NewSession': function () {
        //this.handler.state = '';
        //this.emitWithState('NewSession'); // Equivalent to the Start Mode NewSession handler
        console.log('Selectmode new session');
    },
    'PlayGameIntent': function(){
        console.log('play game intent with selectmode state');
        if(this.attributes.gameInProgress){ 
            this.handler.state = states.PLAYMODE;
            games.callGame(this.attributes.gameInProgress.id, this.attributes.gameInProgress.sessionId, null, (result) => {
                console.log("Result was received: " + result);
                this.emit(':tell', result, result);
            });
        } else {
            console.log('no game in progress');
            //TODO
        }
    },
    'Unhandled': function () {
        console.log("UNHANDLED in selectmode");
        let message = 'Please select a game to play.'; //TODO
        this.emit(':ask', message, message);
    }
});

let playModeHandlers = Alexa.CreateStateHandler(states.PLAYMODE, {
    'NewSession': function () {
        //this.handler.state = '';
        //this.emitWithState('NewSession'); // Equivalent to the Start Mode NewSession handler
        console.log('Playmode new session');
    },
    'PlayGameIntent': function(){
        console.log('play game intent with playmode state');
        if(this.attributes.gameInProgress){ 
            const textSlot = this.event.request.intent.slots.Text;
            if (textSlot) {
                const userAnswerValue = textSlot.value;
                console.log("User answer: " + userAnswerValue);
                games.callGame(this.attributes.gameInProgress.id, this.attributes.gameInProgress.sessionId, userAnswerValue, (result) => {
                    console.log("Result was received: " + result);
                    this.emit(':tell', result, result);
                });
            } else {
                this.emit(':tell', 'I\'m not sure what you said. Please try again.',
                    'Can you try again please?');
            }
        } else {
            console.log('no game in progress');
            //TODO
        }
    },
    "AMAZON.StopIntent": function () {
        console.log("STOPINTENT in playmode");
        //TODO save game
        this.emit(':tell', "Goodbye!");
    },
    "AMAZON.CancelIntent": function () {
        console.log("CANCELINTENT in playmode");
        //TODO save game
    },
    'SessionEndedRequest': function () {
        console.log("SESSIONENDEDREQUEST in playmode");
        //TODO save game
        this.attributes.endedSessionCount += 1;
        this.emit(':saveState', true);
        this.emit(':tell', "Goodbye!");
    },
    'Unhandled': function () {
        console.log("UNHANDLED in playmode");
        this.emit(':ask', 'Sorry, I didn\'t get that. Try saying a number.', 'Try saying a number.');
    }
});

let saveModeHandlers = Alexa.CreateStateHandler(states.SAVEMODE, {
    'AMAZON.YesIntent': function() {
        console.log('user wants to save game');
        // this.attributes.savedGames
        // this.handler.state = states.GUESSMODE;
        // this.emit(':ask', 'Great! ' + 'Try saying a number to start the game.', 'Try saying a number.');
    },
    'AMAZON.NoIntent': function() {
        console.log("user does not want to save game");
        this.emit(':tell', 'Ok, see you next time!');
    },
});

// These handlers are not bound to a state
let guessAttemptHandlers = {
    'TooHigh': function (val) {
        this.emit(':ask', val.toString() + ' is too high.', 'Try saying a smaller number.');
    },
    'TooLow': function (val) {
        this.emit(':ask', val.toString() + ' is too low.', 'Try saying a larger number.');
    },
    'JustRight': function (callback) {
        this.handler.state = states.STARTMODE;
        this.attributes['gamesPlayed']++;
        callback();
    },
    'NotANum': function () {
        this.emit(':ask', 'Sorry, I didn\'t get that. Try saying a number.', 'Try saying a number.');
    }
};

function getSavedGameNames() {
    return this.attributes.savedGames.map(item => {
        return item.name;
    }).join(', ');
}