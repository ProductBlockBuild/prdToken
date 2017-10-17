var express = require('express');
var bodyParser = require('body-parser');
var app = express();

const fs = require('fs');
const solc = require('solc');
const Web3 = require('web3');



app.use(express.static('public'));

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({
    extended: false
}));

// parse application/json
app.use(bodyParser.json());

// Add headers
app.use(function (req, res, next) {

    var allowedOrigins = ['https://node2.coinlaunch.co', 'http://node2.coinlaunch.co', 'http://138.197.152.121', 'http://localhost:8081'];


    var origin = req.headers.origin;

    if (allowedOrigins.indexOf(origin) > -1) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }

    // Website you wish to allow to connect
    //res.setHeader('Access-Control-Allow-Origin', 'https://node2.coinlaunch.co');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
});





app.post('/compile', function (req, result) {

   // const web3 = new Web3();
   // web3.setProvider(new web3.providers.HttpProvider("http://127.0.0.1:8545"));

 //   var web3 = new Web3(
  //      new Web3.providers.HttpProvider('http://localhost:8545/')
       //new Web3.providers.HttpProvider('https://ropsten.infura.io/')
  //  );

    //const web3 = new Web3.providers.HttpProvider("http://localhost:8545");

    console.log("Start compiling code." + new Date());

    const contractCrowdsaleInput = fs.readFileSync('ICO.sol');
    const output = solc.compile(contractCrowdsaleInput.toString(), 1);

    const bytecodeCrowdsale = output.contracts[':Crowdsale'].bytecode;
    const abiCrowdsale = JSON.parse(output.contracts[':Crowdsale'].interface);
    const bytecodeToken = output.contracts[':Token'].bytecode;
    const abiToken = JSON.parse(output.contracts[':Token'].interface);
    console.log("End compiling code." + new Date());

    result.end(JSON.stringify({
        bytecodeCrowdsale: bytecodeCrowdsale,
        abiCrowdsale: abiCrowdsale,
        bytecodeToken: bytecodeToken,
        abiToken: abiToken
    }));
})






var server = app.listen(8181, function () {

    var host = server.address().address
    var port = server.address().port

    console.log("App listening at http://%s:%s", host, port)

})



