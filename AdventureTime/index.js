"use strict";
var APP_ID = "amzn1.ask.skill.dafe7cda-1771-452b-944a-b2c6169c9384";  // TODO replace with your app ID (OPTIONAL).

var GAME_STATES = {
    ADVENTURE: "_ADVENTUREMODE", // Asking trivia questions.
    START: "_STARTMODE", // Entry point, start the game.
    HELP: "_HELPMODE" // The user is asking for help.
};
var adventures = require("./gamesRepo");

/**
 * When editing your questions pay attention to your punctuation. Make sure you use question marks or periods.
 * Make sure the first answer is the correct one. Set at least ANSWER_COUNT answers, any extras will be shuffled in.
 */
var languageString = {
    "en-US": {
        "translation": {
            "GAME_NAME": "Adventure Time", // Be sure to change this for your skill.
            "SELECT_ADVENTURE": "Please select an adventure to play",
            "HELP_MESSAGE": "I will read you a scenario for %s. Respond with the action you think you should take. " +
            "For example, say go left or run. To start a new game at any time, say, start game. ",
            "REPEAT_OUTCOME_MESSAGE": "To repeat the last outcome, say, repeat. ",
            "ASK_MESSAGE_START": "Would you like to start playing?",
            "HELP_REPROMPT": "To give an action, respond with the action you would take. ",
            "STOP_MESSAGE": "Would you like to keep playing?",
            "CANCEL_MESSAGE": "Ok, let\'s play again soon.",
            "NO_MESSAGE": "Ok, we\'ll play another time. Goodbye!",
            "ACTION_UNHANDLED": "Action not recognized",
            "HELP_UNHANDLED": "Say yes to continue, or no to end the game.",
            "START_UNHANDLED": "Please specify the adventure to embark.",
            "NEW_GAME_MESSAGE": "Welcome to %s. ",
            "SELECT_ADVENTURE_MESSAGE": "Please select one of the following adventures %s",
            "WELCOME_MESSAGE": "I will read you a scenario. You must specify what actions you would take depending on the circumstances.",
            "ACTION_OUTCOME": "%s",
            "TELL_SCENARIO": "%s",
            "GAME_OVER_MESSAGE": "Your fight is over!"
        }
    }
};

var Alexa = require("alexa-sdk");

exports.handler = function (event, context, callback) {
    var alexa = Alexa.handler(event, context);
    alexa.appId = APP_ID;
    // To enable string internationalization (i18n) features, set a resources object.
    alexa.resources = languageString;
    //alexa.registerHandlers(newSessionHandlers, selectGameHandlers, startStateHandlers, triviaStateHandlers, helpStateHandlers);
    alexa.registerHandlers(gameHandlers);
    alexa.execute();
};

var gameHandlers = {
    "HomeIntent": function () {
        adventures.getGames(function (games, alexaCb) {
            var adventureNames = "";
            games.forEach(function (element) {
                adventureNames += element.name + ", ";
            });
            var speechOutput = alexaCb.t("NEW_GAME_MESSAGE", alexaCb.t("GAME_NAME")) + alexaCb.t("SELECT_ADVENTURE_MESSAGE", adventureNames);
            alexaCb.emit(":ask", speechOutput, speechOutput);
        }, this);
    },
    "SelectGameIntent": function () {
        var inputAdventure = this.event.request.intent.slots.Game.value;
        console.log(inputAdventure);
        adventures["GAMES"].forEach(function (element) {
            if (element.title === inputAdventure) {
                this.emit(":ask", element.scenarios[0].scene, element.scenarios[0].scene);
            }
        }, this);
        //this.emit(":ask", speechOutput, speechOutput);
    },
    "Unhandled": function () {
        var speechOutput = this.t("START_UNHANDLED");
        this.emit(":ask", speechOutput, speechOutput);
    }
};

var selectGameHandlers = Alexa.CreateStateHandler(GAME_STATES.SELECT_ADVENTURE, {
    "SelectGame": function (newGame) {
        // var adventureNames="";
        // adventures["GAMES"].forEach(function(element) {
        //     adventureNames=adventureNames+" "+element
        // }, this);
        var speechOutput = newGame ? this.t("NEW_GAME_MESSAGE", this.t("GAME_NAME")) + this.t("SELECT_ADVENTURE_MESSAGE", "adventureNames") : "";
        this.emit(":ask", speechOutput, speechOutput);
    },
    "Unhandled": function () {
        var speechOutput = this.t("START_UNHANDLED");
        this.emit(":ask", speechOutput, speechOutput);
    }
}
);

// var startStateHandlers = Alexa.CreateStateHandler(GAME_STATES.START, {
//     "StartGame": function (newGame) {
//         var speechOutput = newGame ? this.t("NEW_GAME_MESSAGE", this.t("GAME_NAME")) + this.t("WELCOME_MESSAGE", GAME_LENGTH.toString()) : "";
//         // Select GAME_LENGTH questions for the game
//         var translatedQuestions = this.t("GAMES");
//         var gameQuestions = populateGames(translatedQuestions);
//         // Generate a random index for the correct answer, from 0 to 3
//         var correctAnswerIndex = Math.floor(Math.random() * (ANSWER_COUNT));
//         // Select and shuffle the answers for each question
//         var roundAnswers = populateRoundAnswers(gameQuestions, 0, correctAnswerIndex, translatedQuestions);
//         var currentQuestionIndex = 0;
//         var spokenQuestion = Object.keys(translatedQuestions[gameQuestions[currentQuestionIndex]])[0];
//         var repromptText = this.t("TELL_QUESTION_MESSAGE", "1", spokenQuestion);

//         for (var i = 0; i < ANSWER_COUNT; i++) {
//             repromptText += (i + 1).toString() + ". " + roundAnswers[i] + ". ";
//         }

//         speechOutput += repromptText;

//         Object.assign(this.attributes, {
//             "speechOutput": repromptText,
//             "repromptText": repromptText,
//             "currentQuestionIndex": currentQuestionIndex,
//             "correctAnswerIndex": correctAnswerIndex + 1,
//             "questions": gameQuestions,
//             "score": 0,
//             "correctAnswerText": translatedQuestions[gameQuestions[currentQuestionIndex]][Object.keys(translatedQuestions[gameQuestions[currentQuestionIndex]])[0]][0]
//         });

//         // Set the current state to trivia mode. The skill will now use handlers defined in triviaStateHandlers
//         this.handler.state = GAME_STATES.TRIVIA;
//         this.emit(":askWithCard", speechOutput, repromptText, this.t("GAME_NAME"), repromptText);
//     }
// });

// var triviaStateHandlers = Alexa.CreateStateHandler(GAME_STATES.TRIVIA, {
//     "AnswerIntent": function () {
//         handleUserGuess.call(this, false);
//     },
//     "DontKnowIntent": function () {
//         handleUserGuess.call(this, true);
//     },
//     "AMAZON.StartOverIntent": function () {
//         this.handler.state = GAME_STATES.START;
//         this.emitWithState("StartGame", false);
//     },
//     "AMAZON.RepeatIntent": function () {
//         this.emit(":ask", this.attributes["speechOutput"], this.attributes["repromptText"]);
//     },
//     "AMAZON.HelpIntent": function () {
//         this.handler.state = GAME_STATES.HELP;
//         this.emitWithState("helpTheUser", false);
//     },
//     "AMAZON.StopIntent": function () {
//         this.handler.state = GAME_STATES.HELP;
//         var speechOutput = this.t("STOP_MESSAGE");
//         this.emit(":ask", speechOutput, speechOutput);
//     },
//     "AMAZON.CancelIntent": function () {
//         this.emit(":tell", this.t("CANCEL_MESSAGE"));
//     },
//     "Unhandled": function () {
//         var speechOutput = this.t("TRIVIA_UNHANDLED", ANSWER_COUNT.toString());
//         this.emit(":ask", speechOutput, speechOutput);
//     },
//     "SessionEndedRequest": function () {
//         console.log("Session ended in trivia state: " + this.event.request.reason);
//     }
// });

// var helpStateHandlers = Alexa.CreateStateHandler(GAME_STATES.HELP, {
//     "helpTheUser": function (newGame) {
//         var askMessage = newGame ? this.t("ASK_MESSAGE_START") : this.t("REPEAT_QUESTION_MESSAGE") + this.t("STOP_MESSAGE");
//         var speechOutput = this.t("HELP_MESSAGE", GAME_LENGTH) + askMessage;
//         var repromptText = this.t("HELP_REPROMPT") + askMessage;
//         this.emit(":ask", speechOutput, repromptText);
//     },
//     "AMAZON.StartOverIntent": function () {
//         this.handler.state = GAME_STATES.START;
//         this.emitWithState("StartGame", false);
//     },
//     "AMAZON.RepeatIntent": function () {
//         var newGame = (this.attributes["speechOutput"] && this.attributes["repromptText"]) ? false : true;
//         this.emitWithState("helpTheUser", newGame);
//     },
//     "AMAZON.HelpIntent": function () {
//         var newGame = (this.attributes["speechOutput"] && this.attributes["repromptText"]) ? false : true;
//         this.emitWithState("helpTheUser", newGame);
//     },
//     "AMAZON.YesIntent": function () {
//         if (this.attributes["speechOutput"] && this.attributes["repromptText"]) {
//             this.handler.state = GAME_STATES.TRIVIA;
//             this.emitWithState("AMAZON.RepeatIntent");
//         } else {
//             this.handler.state = GAME_STATES.START;
//             this.emitWithState("StartGame", false);
//         }
//     },
//     "AMAZON.NoIntent": function () {
//         var speechOutput = this.t("NO_MESSAGE");
//         this.emit(":tell", speechOutput);
//     },
//     "AMAZON.StopIntent": function () {
//         var speechOutput = this.t("STOP_MESSAGE");
//         this.emit(":ask", speechOutput, speechOutput);
//     },
//     "AMAZON.CancelIntent": function () {
//         this.emit(":tell", this.t("CANCEL_MESSAGE"));
//     },
//     "Unhandled": function () {
//         var speechOutput = this.t("HELP_UNHANDLED");
//         this.emit(":ask", speechOutput, speechOutput);
//     },
//     "SessionEndedRequest": function () {
//         console.log("Session ended in help state: " + this.event.request.reason);
//     }
// });

// function handleUserGuess(userGaveUp) {
//     var answerSlotValid = isAnswerSlotValid(this.event.request.intent);
//     var speechOutput = "";
//     var speechOutputAnalysis = "";
//     var gameQuestions = this.attributes.questions;
//     var correctAnswerIndex = parseInt(this.attributes.correctAnswerIndex);
//     var currentScore = parseInt(this.attributes.score);
//     var currentQuestionIndex = parseInt(this.attributes.currentQuestionIndex);
//     var correctAnswerText = this.attributes.correctAnswerText;
//     var translatedQuestions = this.t("QUESTIONS");

//     if (answerSlotValid && parseInt(this.event.request.intent.slots.Answer.value) == this.attributes["correctAnswerIndex"]) {
//         currentScore++;
//         speechOutputAnalysis = this.t("ANSWER_CORRECT_MESSAGE");
//     } else {
//         if (!userGaveUp) {
//             speechOutputAnalysis = this.t("ANSWER_WRONG_MESSAGE");
//         }

//         speechOutputAnalysis += this.t("CORRECT_ANSWER_MESSAGE", correctAnswerIndex, correctAnswerText);
//     }

//     // Check if we can exit the game session after GAME_LENGTH questions (zero-indexed)
//     if (this.attributes["currentQuestionIndex"] == GAME_LENGTH - 1) {
//         speechOutput = userGaveUp ? "" : this.t("ANSWER_IS_MESSAGE");
//         speechOutput += speechOutputAnalysis + this.t("GAME_OVER_MESSAGE", currentScore.toString(), GAME_LENGTH.toString());

//         this.emit(":tell", speechOutput)
//     } else {
//         currentQuestionIndex += 1;
//         correctAnswerIndex = Math.floor(Math.random() * (ANSWER_COUNT));
//         var spokenQuestion = Object.keys(translatedQuestions[gameQuestions[currentQuestionIndex]])[0];
//         var roundAnswers = populateRoundAnswers.call(this, gameQuestions, currentQuestionIndex, correctAnswerIndex, translatedQuestions);
//         var questionIndexForSpeech = currentQuestionIndex + 1;
//         var repromptText = this.t("TELL_QUESTION_MESSAGE", questionIndexForSpeech.toString(), spokenQuestion);

//         for (var i = 0; i < ANSWER_COUNT; i++) {
//             repromptText += (i + 1).toString() + ". " + roundAnswers[i] + ". "
//         }

//         speechOutput += userGaveUp ? "" : this.t("ANSWER_IS_MESSAGE");
//         speechOutput += speechOutputAnalysis + this.t("SCORE_IS_MESSAGE", currentScore.toString()) + repromptText;

//         Object.assign(this.attributes, {
//             "speechOutput": repromptText,
//             "repromptText": repromptText,
//             "currentQuestionIndex": currentQuestionIndex,
//             "correctAnswerIndex": correctAnswerIndex + 1,
//             "questions": gameQuestions,
//             "score": currentScore,
//             "correctAnswerText": translatedQuestions[gameQuestions[currentQuestionIndex]][Object.keys(translatedQuestions[gameQuestions[currentQuestionIndex]])[0]][0]
//         });

//         this.emit(":askWithCard", speechOutput, repromptText, this.t("GAME_NAME"), repromptText);
//     }
// }

// function populateGameQuestions(translatedQuestions) {
//     var gameQuestions = [];
//     var indexList = [];
//     var index = translatedQuestions.length;

//     if (GAME_LENGTH > index) {
//         throw new Error("Invalid Game Length.");
//     }

//     for (var i = 0; i < translatedQuestions.length; i++) {
//         indexList.push(i);
//     }

//     // Pick GAME_LENGTH random questions from the list to ask the user, make sure there are no repeats.
//     for (var j = 0; j < GAME_LENGTH; j++) {
//         var rand = Math.floor(Math.random() * index);
//         index -= 1;

//         var temp = indexList[index];
//         indexList[index] = indexList[rand];
//         indexList[rand] = temp;
//         gameQuestions.push(indexList[index]);
//     }

//     return gameQuestions;
// }

// /**
//  * Get the answers for a given question, and place the correct answer at the spot marked by the
//  * correctAnswerTargetLocation variable. Note that you can have as many answers as you want but
//  * only ANSWER_COUNT will be selected.
//  * */
// function populateRoundAnswers(gameQuestionIndexes, correctAnswerIndex, correctAnswerTargetLocation, translatedQuestions) {
//     var answers = [];
//     var answersCopy = translatedQuestions[gameQuestionIndexes[correctAnswerIndex]][Object.keys(translatedQuestions[gameQuestionIndexes[correctAnswerIndex]])[0]].slice();
//     var index = answersCopy.length;

//     if (index < ANSWER_COUNT) {
//         throw new Error("Not enough answers for question.");
//     }

//     // Shuffle the answers, excluding the first element which is the correct answer.
//     for (var j = 1; j < answersCopy.length; j++) {
//         var rand = Math.floor(Math.random() * (index - 1)) + 1;
//         index -= 1;

//         var temp = answersCopy[index];
//         answersCopy[index] = answersCopy[rand];
//         answersCopy[rand] = temp;
//     }

//     // Swap the correct answer into the target location
//     for (var i = 0; i < ANSWER_COUNT; i++) {
//         answers[i] = answersCopy[i];
//     }
//     temp = answers[0];
//     answers[0] = answers[correctAnswerTargetLocation];
//     answers[correctAnswerTargetLocation] = temp;
//     return answers;
// }

// function isAnswerSlotValid(intent) {
//     var answerSlotFilled = intent && intent.slots && intent.slots.Answer && intent.slots.Answer.value;
//     var answerSlotIsInt = answerSlotFilled && !isNaN(parseInt(intent.slots.Answer.value));
//     return answerSlotIsInt && parseInt(intent.slots.Answer.value) < (ANSWER_COUNT + 1) && parseInt(intent.slots.Answer.value) > 0;
// }