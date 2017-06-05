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
        playModeHandlers, resetModeHandlers);
    alexa.execute();
};

let states = {
    PLAYMODE: '_PLAYMODE', // User has started playing a game
    STARTMODE: '_STARTMODE', // Prompt the user to start or restart the game.
    RESETMODE: '_RESETMODE' //Promt the user if he wants to reset game
};

let genericHandlers = {
    'NewSession': function () {
        console.log('new session');
        if (Object.keys(this.attributes).length === 0) {
            this.attributes.endedSessionCount = 0;
            this.attributes.gameInProgress = {};
            this.attributes.gameToReset = undefined;
            this.attributes.savedGames = []; //savedGames = [{ id: gameId, name: gameName, session: sessionId }]
        }
        console.log('saved games: ' + JSON.stringify(this.attributes.savedGames));
        this.attributes.gameInProgress = {};
        this.handler.state = states.STARTMODE;
        this.emitWithState('Welcome');
    },
    'AMAZON.HelpIntent': function () {
        saveGame.call(this);
        var message = 'If you don\'t know what games are available, say "list games", or "list saved games". ' +
            'If you want to play a game, say "play" and the game name. ' +
            'You can always stop or cancel, your game progress will be automatically saved. ' +
            'If you want to reset a game, say "reset progress for" and the game name.';
        this.emit(':ask', message, message);
    },
    "AMAZON.StopIntent": function () {
        console.log('StopIntent');
        saveGame.call(this);
        this.attributes.gameInProgress = {};
        this.emit(':tell', "Goodbye!");
    },
    "AMAZON.CancelIntent": function () {
        console.log('CancelIntent');
        saveGame.call(this);
        this.attributes.gameInProgress = {};
        this.emit(':tell', "Goodbye!");
    },
    'AMAZON.YesIntent': function () {
        console.log('yes intent -> not supported without playmode or resetmode');
        this.emitWithState('Unhandled');
    },
    'AMAZON.NoIntent': function () {
        console.log('no intent -> not supported without playmode or resetmode');
        this.emitWithState('Unhandled');
    },
    'SessionEndedRequest': function () {
        console.log('session ended!');
        saveGame.call(this);
        this.attributes.gameInProgress = {};
        this.emit(':saveState', true);
    },
    'Unhandled': function () {
        console.log("UNHANDLED");
        let message = 'Sorry, I didn\'t get that. Ask for help if you don\'t know what to do.';
        this.emit(':ask', message, message);
    }
};

let startGameHandlers = Alexa.CreateStateHandler(states.STARTMODE, {
    'NewSession': function () {
        console.log('startmode new session');
        this.handler.state = undefined;
        this.emit('NewSession');
    },
    'Welcome': function () {
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
                console.log('call play game with null');
                this.emitWithState('PlayGame', null);
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
    'ResetGameIntent': function () {
        console.log('startmode reset game');
        this.handler.state = states.RESETMODE;
        this.emitWithState('ResetGameIntent');
    },
    'AMAZON.YesIntent': function () {
        console.log('startmode yes intent -> not supported');
        this.emitWithState('Unhandled');
    },
    'AMAZON.NoIntent': function () {
        console.log('startmode no intent -> not supported');
        this.emitWithState('Unhandled');
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
        console.log("SESSIONENDEDREQUEST in startmode");
        this.attributes.endedSessionCount += 1;
        this.handler.state = undefined;
        saveGame.call(this);
        this.attributes.gameInProgress = {};
        this.emit(':saveState', true);
    },
    'Unhandled': function () {
        console.log("UNHANDLED in startmode");
        let message = 'Please select a game to play.';
        this.emit(':ask', message, message);
    }
});

let playModeHandlers = Alexa.CreateStateHandler(states.PLAYMODE, {
    'NewSession': function () {
        console.log('playmode new session');
        this.handler.state = undefined;
        this.emit('NewSession');
    },
    'PlayGameIntent': function () {
        console.log('playmode play game intent');
        if (this.attributes.gameInProgress) {
            let textSlot = this.event.request.intent.slots.Text;
            if (textSlot) {
                let userAnswerValue = textSlot.value;
                console.log("User answer: " + userAnswerValue);
                this.emitWithState('PlayGame', userAnswerValue);
            } else {
                this.emit(':ask', 'I\'m not sure what you said. Please try again.',
                    'Can you try again please?');
            }
        } else {
            console.log('no game in progress');
            let message = 'Something went wrong. There is no game in progress. Please select a game to play first.';
            this.emit(':ask', message, message);
        }
    },
    'PlayGame': function (userAnswerValue) {
        console.log('play game intent with playmode state');
        games.callGame(this.attributes.gameInProgress.id, this.attributes.gameInProgress.sessionId, userAnswerValue, (result) => {
            console.log("Result was received: " + result);
            this.emit(':ask', result, result);
        });
    },
    //if we are in playmode and user says yes/no, it means it is part of the game, so call play game
    'AMAZON.YesIntent': function () {
        console.log('playmode yes intent -> call play game');
        this.emitWithState('PlayGame', 'yes');
    },
    'AMAZON.NoIntent': function () {
        console.log('playmode no intent -> call play game');
        this.emitWithState('PlayGame', 'no');
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
    'ResetGameIntent': function () {
        console.log('playmode reset game');
        this.handler.state = states.RESETMODE;
        this.emitWithState('ResetGameIntent');
    },
    'AMAZON.HelpIntent': function () {
        this.handler.state = states.STARTMODE;
        this.emit('AMAZON.HelpIntent');
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
        this.attributes.endedSessionCount += 1;
        saveGame.call(this);
        this.handler.state = undefined;
        this.attributes.gameInProgress = {};
        this.emit(':saveState', true);
    },
    'Unhandled': function () {
        console.log("UNHANDLED in playmode");
        saveGame.call(this);
        this.emit(':ask', 'Sorry, I didn\'t get that.', 'Sorry, I didn\'t get that.');
    }
});

let resetModeHandlers = Alexa.CreateStateHandler(states.RESETMODE, {
    'NewSession': function () {
        console.log('resetmode new session');
        this.handler.state = undefined;
        this.emit('NewSession');
    },
    'ResetGameIntent': function () {
        console.log('resetmode reset game intent');
        saveGame.call(this);
        let gameSlot = this.event.request.intent.slots.GameToReset;
        if (gameSlot) {
            let game = gameSlot.value;
            if (game) {
                console.log('game to reset: ' + game);
                let selectedGame = games.findGame(game);
                if (selectedGame) {
                    this.attributes.gameToReset = selectedGame;
                    let question = 'Are you sure you want to reset progress for game ' + game + '?';
                    this.emit(':ask', question, question);
                } else {
                    this.emitWithState('Unhandled');
                }
            } else {
                this.emitWithState('Unhandled');
            }
        } else {
            this.emitWithState('Unhandled');
        }
    },
    'AMAZON.YesIntent': function () {
        console.log('resetmode: user confirmed game reset');
        let gameReset = resetGame.call(this);
        let message = '';
        if (gameReset) {
            message = 'Ok, game progress was reset. What do you want to do next?';
        } else {
            message = 'You do not have a saved session for game ' + this.attributes.gameToReset.name + '.';
        }
        this.attributes.gameToReset = undefined;
        this.handler.state = states.STARTMODE;
        this.emit(':ask', message, message);
    },
    'AMAZON.NoIntent': function () {
        console.log('resetmode: user denied game reset');
        this.attributes.gameToReset = undefined;
        this.handler.state = states.STARTMODE;
        let message = 'Great! Your progress is safe with me! What do you want to do next?';
        this.emit(':ask', message, message);
    },
    'SessionEndedRequest': function () {
        console.log("SESSIONENDEDREQUEST in resetmode");
        this.attributes.endedSessionCount += 1;
        saveGame.call(this);
        this.handler.state = undefined;
        this.attributes.gameInProgress = {};
        this.attributes.gameToReset = undefined;
        this.emit(':saveState', true);
    },
    'Unhandled': function () {
        console.log("UNHANDLED in resetmode");
        this.attributes.gameToReset = undefined;
        this.handler.state = states.STARTMODE;
        this.emit(':ask', 'Sorry, I didn\'t get that.', 'Sorry, I didn\'t get that.');
    }
});

// Utilitaries ------------------------------

function getSavedGameNames() {
    return this.attributes.savedGames.map(item => {
        return item.name;
    }).join(', ');
}

function saveGame() {
    if (this.attributes.gameInProgress && Object.keys(this.attributes.gameInProgress).length !== 0) {
        let gameAlreadySavedIndex = this.attributes.savedGames.findIndex(item => {
            return item.id === this.attributes.gameInProgress.id;
        });
        if (gameAlreadySavedIndex === -1) {
            this.attributes.savedGames.push(this.attributes.gameInProgress);
        } else {
            this.attributes.savedGames[gameAlreadySavedIndex] = this.attributes.gameInProgress;
        }
        this.attributes.gameInProgress = {};
    }
    console.log(JSON.stringify(this.attributes.savedGames));
}

function resetGame() {
    if (this.attributes.gameToReset && Object.keys(this.attributes.gameToReset).length !== 0) {
        let savedGameIndex = this.attributes.savedGames.findIndex(item => {
            return item.id === this.attributes.gameToReset.id;
        });
        if (savedGameIndex === -1) {
            console.log('could not reset game because it was not saved');
            return undefined;
        } else {
            let removedGame = this.attributes.savedGames.splice(savedGameIndex, 1);
            console.log(JSON.stringify(this.attributes.savedGames));
            return removedGame;
        }
    }
    return undefined;
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