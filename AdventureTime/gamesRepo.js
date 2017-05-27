'use strict';
var https = require('https');
module.exports = {
    getGames: function (callback,alexa) {
        var options = {
            host: 'wrapapi.com',
            path: '/use/raulfiru/endpoints/games/latest?wrapAPIKey=4bgBkwkb3PyVnuM8gggKfq251AQq2tuo',
        }
        https.get(options, function (res) {
            var str = '';
            res.on('data', function (chunk) {
                str += chunk;
            });
            res.on('end', function () {
                var data=JSON.parse(str).data;
                callback(data.output[0].games,alexa);
            });


        }).on('error', function (e) {
            console.log("Error message: " + e.message);
        });
    },
};
