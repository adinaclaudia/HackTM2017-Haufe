/*jshint esversion: 6 */

const Alexa = require('alexa-sdk');
const uuidV1 = require('uuid/v1');
const games = require('./games');

let appId = 'amzn1.ask.skill.4d630d6f-c8cb-4d7f-a448-adce2b3738d6';

exports.handler = function (event, context, callback) {
    let alexa = Alexa.handler(event, context);
    alexa.appId = appId;
    alexa.dynamoDBTableName = 'retroGames';
    alexa.registerHandlers(genericHandlers, startGameHandlers,
        playModeHandlers);
    alexa.execute();
};

let states = {
    PLAYMODE: '_PLAYMODE', // User has started playing a game
    STARTMODE: '_STARTMODE' // Prompt the user to start or restart the game.
    //SAVEMODE: '_SAVEMODE', //user wants to save game
    //SELECTMODE: '_SELECTMODE' //user has selected a game
};

let genericHandlers = {
    'NewSession': function () {
        console.log('new session');
        if (Object.keys(this.attributes).length === 0) {
            this.attributes.endedSessionCount = 0;
            this.attributes.gameInProgress = {};
            this.attributes.savedGames = []; //savedGames = [{ id: gameId, name: gameName, session: sessionId }]
        }
        console.log('saved games: ' + JSON.stringify(this.attributes.savedGames));
        //TODO reset game in progress?
        this.handler.state = states.STARTMODE;
        this.emitWithState('Welcome');
    },
    'AMAZON.HelpIntent': function () {
        var message = 'If you don\'t know what games are available, say "list games". ' +
            'If you want to play a game, say "play" and the game name. ' +
            'You can always exit and save your game progress';
        this.emit(':ask', message, message);
    },
    "AMAZON.StopIntent": function () {
        console.log('StopIntent');
        this.emit(':tell', "Goodbye!");
    },
    "AMAZON.CancelIntent": function () {
        console.log('CancelIntent');
        this.emit(':tell', "Goodbye!");
    },
    'SessionEndedRequest': function () {
        console.log('session ended!');
        this.attributes.gameInProgress = {};
        this.emit(':saveState', true);
        //this.emit(":tell", "Goodbye!");
    }
};

let startGameHandlers = Alexa.CreateStateHandler(states.STARTMODE, {
    'NewSession': function () {
        console.log('startmode new session');
        this.handler.state = undefined;
        this.emit('NewSession'); 
    },
    'Welcome': function() {
        let response = 'Welcome to retro games. ';
        if (this.attributes.savedGames.length !== 0) {
            response += 'You have the following saved games: ' + getSavedGameNames.call(this);
        } else {
            response += 'Please select a game or list games if unsure.';
        }
        this.emit(':ask', response, response);
    },
    'AMAZON.HelpIntent': function () {
        this.emit('AMAZON.HelpIntent');
    },
    'ListGamesIntent': function () {
        console.log('startmode list games');
        let availableGames = 'Available games are: ' + games.adventureNames;
        this.emit(':ask', availableGames, availableGames);
    },
    'ListSavedGamesIntent': function () {
        console.log('startmode list saved games');
        let message;
        if (this.attributes.savedGames.length === 0) {
            message = 'You do not have any saved games.';
        } else if (this.attributes.savedGames.length === 1) {
            message = 'You have one saved game: ' + getSavedGameNames.call(this);
        } else {
            message = 'Your saved games are: ' + getSavedGameNames.call(this);
        }
        this.emit(':ask', message, message);
    },
    'SelectGameIntent': function () {
        console.log('start mode select game intent');
        const gameSlot = this.event.request.intent.slots.Game;
        let handleError = false;
        if (gameSlot) {
            let game = gameSlot.value;
            console.log("selected game name: " + game);
            let selectedGame = games.findGame(game);
            if (selectedGame) {
                console.log("corresponding game id: " + selectedGame.id);
                //if there is already a game in progress and the user selected a different game
                if (this.attributes.gameInProgress && Object.keys(this.attributes.gameInProgress) !== 0 &&
                    this.attributes.gameInProgress.id !== selectedGame.id) {
                    console.log('a different game already in progress -> saving previous game');
                    saveGame.call(this);
                }
                this.attributes.gameInProgress = selectedGame;
                this.attributes.gameInProgress.sessionId = getSessionIdIfExists.call(this, selectedGame.id);
                this.handler.state = states.PLAYMODE;
                console.log('call play game with true');
                this.emitWithState('PlayGame', true);
            } else {
                if (game && game.startsWith("zork")) {
                    let zorkGames = games.adventureNames.substring(
                        games.adventureNames.indexOf("Zork"),
                        games.adventureNames.length);
                    let message = 'Which zork game do you want to play? Select one of ' + zorkGames;
                    this.emit(':ask', message, message);
                } else {
                    handleError = true;
                }
            }
        } else {
            handleError = true;
        }
        if (handleError) {
            console.log('Error: could not handle select game');
            let message = 'Sorry but I did not recognize selected game. Please select one of: ' + games.adventureNames;
            this.emit(':ask', message, message);
        }
    },
    "AMAZON.StopIntent": function () {
        this.handler.state = undefined;
        saveGame.call(this);
        this.emit('AMAZON.StopIntent');
    },
    "AMAZON.CancelIntent": function () {
        this.handler.state = undefined;
        saveGame.call(this);
        this.emit('AMAZON.CancelIntent');
    },
    'SessionEndedRequest': function () {
        console.log("SESSIONENDEDREQUEST in startmode");
        //this.attributes['endedSessionCount'] += 1;
        this.handler.state = undefined;
        saveGame.call(this);
        this.attributes.gameInProgress = {};
        this.emit(':tell', "Goodbye!");
    },
    'Unhandled': function () {
        console.log("UNHANDLED in startmode");
        let message = 'Please select a game to play.';
        this.emit(':ask', message, message);
    }
});

// let selectModeHandlers = Alexa.CreateStateHandler(states.SELECTMODE, {
//     'PlayGameIntent': function(){
//         console.log('play game intent with selectmode state');
//         if(this.attributes.gameInProgress){ 
//             this.handler.state = states.PLAYMODE;
//             games.callGame(this.attributes.gameInProgress.id, this.attributes.gameInProgress.sessionId, null, (result) => {
//                 console.log("Result was received: " + result);
//                 this.emit(':ask', result, result);
//             });
//         } else {
//             console.log('no game in progress');
//             //TODO
//         }
//     },
//     'ListGamesIntent': function () {
//         this.handler.state = states.STARTMODE;
//         this.emitWithState('ListGamesIntent');
//     },
//     'ListSavedGamesIntent': function () {
//         this.handler.state = states.STARTMODE;
//         this.emitWithState('ListSavedGamesIntent');
//     },
//     "AMAZON.StopIntent": function () {
//         this.handler.state = '';
//         this.emit('AMAZON.StopIntent');
//     },
//     "AMAZON.CancelIntent": function () {
//         this.handler.state = '';
//         this.emit('AMAZON.CancelIntent');
//     },
//     'Unhandled': function () {
//         console.log("UNHANDLED in selectmode");
//         let message = 'Please select a game to play.'; //TODO
//         this.emit(':ask', message, message);
//     }
// });

let playModeHandlers = Alexa.CreateStateHandler(states.PLAYMODE, {
    'NewSession': function () {
        console.log('playmode new session');
        this.handler.state = undefined;
        this.emit('NewSession'); 
    },
    'PlayGameIntent': function () {
        console.log('call play game with false');
        this.emitWithState('PlayGame', false);
    },
    'PlayGame': function (firstCall) {
        console.log('play game intent with playmode state');
        if (this.attributes.gameInProgress) {
            if (firstCall) {
                games.callGame(this.attributes.gameInProgress.id, this.attributes.gameInProgress.sessionId, null, (result) => {
                    console.log("Result was received: " + result);
                    this.emit(':ask', result, result);
                });
            } else {
                const textSlot = this.event.request.intent.slots.Text;
                if (textSlot) {
                    const userAnswerValue = textSlot.value;
                    console.log("User answer: " + userAnswerValue);
                    games.callGame(this.attributes.gameInProgress.id, this.attributes.gameInProgress.sessionId, userAnswerValue, (result) => {
                        console.log("Result was received: " + result);
                        this.emit(':ask', result, result);
                    });
                } else {
                    this.emit(':ask', 'I\'m not sure what you said. Please try again.',
                        'Can you try again please?');
                }
            }
        } else {
            console.log('no game in progress');
            //TODO
        }
    },
    'SelectGameIntent': function () {
        console.log('playmode select game');
        saveGame.call(this);
        this.handler.state = states.STARTMODE;
        //this.emit(':saveState', true);
        this.emitWithState('SelectGameIntent');
    },
    'ListGamesIntent': function () {
        console.log('playmode list games');
        saveGame.call(this);
        this.handler.state = states.STARTMODE;
        //this.emit(':saveState', true);
        this.emitWithState('ListGamesIntent');
    },
    'ListSavedGamesIntent': function () {
        console.log('playmode list saved games');
        saveGame.call(this);
        this.handler.state = states.STARTMODE;
        //this.emit(':saveState', true);
        this.emitWithState('ListSavedGamesIntent');
    },
    "AMAZON.StopIntent": function () {
        this.handler.state = undefined;
        this.emit('AMAZON.StopIntent');
    },
    "AMAZON.CancelIntent": function () {
        this.handler.state = undefined;
        this.emit('AMAZON.CancelIntent');
    },
    'SessionEndedRequest': function () {
        console.log("SESSIONENDEDREQUEST in playmode");
        //TODO save game
        this.attributes.endedSessionCount += 1;
        saveGame.call(this);
        this.handler.state = undefined;
        this.attributes.gameInProgress = {};
        //this.emit(':saveState', true);
        this.emit(':tell', "Goodbye!");
    },
    'Unhandled': function () {
        console.log("UNHANDLED in playmode");
        this.emit(':ask', 'Sorry, I didn\'t get that.', 'Sorry, I didn\'t get that.');
    }
});

let saveModeHandlers = Alexa.CreateStateHandler(states.SAVEMODE, {
    'AMAZON.YesIntent': function () {
        console.log('user wants to save game');
        // this.attributes.savedGames
        // this.handler.state = states.GUESSMODE;
        // this.emit(':ask', 'Great! ' + 'Try saying a number to start the game.', 'Try saying a number.');
    },
    'AMAZON.NoIntent': function () {
        console.log("user does not want to save game");
        this.emit(':tell', 'Ok, see you next time!');
    },
});

// These handlers are not bound to a state
// let guessAttemptHandlers = {
//     'TooHigh': function (val) {
//         this.emit(':ask', val.toString() + ' is too high.', 'Try saying a smaller number.');
//     },
//     'TooLow': function (val) {
//         this.emit(':ask', val.toString() + ' is too low.', 'Try saying a larger number.');
//     },
//     'JustRight': function (callback) {
//         this.handler.state = states.STARTMODE;
//         this.attributes['gamesPlayed']++;
//         callback();
//     },
//     'NotANum': function () {
//         this.emit(':ask', 'Sorry, I didn\'t get that. Try saying a number.', 'Try saying a number.');
//     }
// };

function getSavedGameNames() {
    return this.attributes.savedGames.map(item => {
        return item.name;
    }).join(', ');
}

function saveGame() {
    if (this.attributes.gameInProgress && Object.keys(this.attributes.gameInProgress).length !== 0) {
        let gameAlreadySaved = this.attributes.savedGames.findIndex(item => {
            return item.id === this.attributes.gameInProgress.id;
        });
        if (gameAlreadySaved === -1) {
            this.attributes.savedGames.push(this.attributes.gameInProgress);
        } else {
            this.attributes.savedGames[gameAlreadySaved] = this.attributes.gameInProgress;
        }
        this.attributes.gameInProgress = {};
    }
    console.log(JSON.stringify(this.attributes.savedGames));
}

function getSessionIdIfExists(gameId) {
    let savedGame = this.attributes.savedGames.find(item => {
        return item.id === gameId;
    });
    if (savedGame && savedGame.sessionId) {
        return savedGame.sessionId;
    } else {
        return uuidV1();
    }
}