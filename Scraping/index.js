var http = require('http');

function callGame(game, sessionId, answer)
{
  var result;
  //The url we want is: 'www.random.org/integers/?num=1&min=1&max=10&col=1&base=10&format=plain&rnd=new'
  var options = {
    host: 'www.web-adventures.org',
    path: '/cgi-bin/webfrotz?s=' + game + '&x=' + sessionId + '&a=' + encodeURIComponent(answer)
  };
  //console.log("path=" , options.path);


  callback = function(response, callback) {
    var str = '';

    //another chunk of data has been recieved, so append it to `str`
    response.on('data', function (chunk) {
      str += chunk;
    });

    //the whole response has been recieved, so we just print it out here
    response.on('end', function () {
      result = str;

      //console.log(result);

      prseResponse(str,answer);
    });
  }

  http.request(options, callback).end();

}

function prseResponse(str, answer)
{
  var result='';

  //console.log(str.length);

  if (answer)
  {
    result = str.substr(str.lastIndexOf(answer)
    +answer.length
    ,str.length);
  }
  else
  {
    result = str.substr(str.lastIndexOf('<td width="80%" valign="top">'),str.length);
  }
  //console.log(res2);

  result = result.substr(0,result.indexOf("</td>"));

  var regex = /(<([^>]+)>)/ig
,   body = result
,   res2 = body.replace(regex, "");

  console.log(res2);

  //result =

}


callGame("905","123567",'');
