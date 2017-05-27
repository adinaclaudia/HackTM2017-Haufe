/*jshint esversion: 6 */
let games = [{
        name: "9:05",
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
        id: "Zork1&amp;t=Y"

    },
    {
        name: "Zork two",
        url: "http://www.web-adventures.org/cgi-bin/webfrotz?s=Zork2&t=Y",
        id: "Zork2&amp;t=Y"

    },
    {
        name: "Zork three",
        url: "http://www.web-adventures.org/cgi-bin/webfrotz?s=Zork3&t=Y",
        id: "Zork3&amp;t=Y"

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

let adventureNames = "";
games.forEach(function (element) {
    adventureNames += element.name + ", ";
});

module.exports={
    games: games,
    adventureNames: adventureNames
};
