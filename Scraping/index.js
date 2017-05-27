var http = require('http');
const uuidV1 = require('uuid/v1');

function callGame(game, sessionId, answer) {
  var result;
  //The url we want is: 'www.random.org/integers/?num=1&min=1&max=10&col=1&base=10&format=plain&rnd=new'
  var options = {
    host: 'www.web-adventures.org',
    path: '/cgi-bin/webfrotz?s=' + game + '&x=' + sessionId + '&a=' + encodeURIComponent(answer)
  };
  //console.log("path=" , options.path);


  callback = function (response, callback) {
    var str = '';

    //another chunk of data has been recieved, so append it to `str`
    response.on('data', function (chunk) {
      str += chunk;
    });

    //the whole response has been recieved, so we just print it out here
    response.on('end', function () {
      result = str;

      //console.log(result);

      prseResponse(str, answer);
    });
  }

  http.request(options, callback).end();

}

function prseResponse(str, answer) {
  var result = '';

  //console.log(str.length);

  if (answer) {
    result = str.substr(str.lastIndexOf(answer) +
      answer.length, str.length);
  } else {
    result = str.substr(str.lastIndexOf('<td width="80%" valign="top">'), str.length);
  }
  //console.log(res2);

  result = result.substr(0, result.indexOf("</td>"));
  result = result.replace(/<p class="status">.*<\/p>/, '' );

  var regex = /(<([^>]+)>)/ig,
    body = result,
    res2 = body.replace(regex, "");

  res2 = cleanUp(res2);

  //console.log(res2);

  //result =

}

function cleanUp(str)
{
  var result = str;

  //console.log(str.indexOf('----'));

  result = str.replace(/-----[\s\S]*?[\s\S]-----/, '' );

  result = result.replace(/LARS[\s\S]*?[\s\S]6\/11/, '' );

  result = result.replace(/THE ACORN[\s\S]*?[\s\S]1\.0/, '' );
  
  result = result.replace(/ADVENTURE[\s\S]*?[\s\S]6\/11 S/, '' );

  result = result.replace(/A BEAR\'S[\s\S]*?[\s\S] 6\/7/, '' );
  
  result = result.replace(/Copyright[\s\S]*?[\s\S] 6\/10/, '' );

  result = result.replace(/Copyright[\s\S]*?[\s\S]interpreter 1\.0/, '' );
  
  result = result.replace(/The Interactive[\s\S]*?[\s\S]interpreter 1\.0/, '' );

  result = result.replace(/Copyright[\s\S]*?[\s\S]840726/, '' );

  result = result.replace(/Copyright[\s\S]*?[\s\S]840904/, '' );

  result = result.replace(/Copyright[\s\S]*?[\s\S]840727/, '' );

  result = result.replace(/Release[\s\S]*?[\s\S] 6\/7/, '' );
  

  console.log(result);

  //if (str.indexOf('----') > -1)
  //{
  //  part1 =  str.substr(0,str.indexOf('----'));//  str.substr(str.indexOf('----')+4,str.lastIndexOf('----'));
  //
  //}
  return result;

}


callGame("Galatea", uuidV1(), '');