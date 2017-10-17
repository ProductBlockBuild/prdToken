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

    var origin = req.headers.origin;

    if (allowedOrigins.indexOf(origin) > -1) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    
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





app.post('/compile_deploy', function (req, result) {

   // const web3 = new Web3();
   // web3.setProvider(new web3.providers.HttpProvider("http://127.0.0.1:8545"));

    var web3 = new Web3(
        new Web3.providers.HttpProvider('http://localhost:8545/')
       //new Web3.providers.HttpProvider('https://ropsten.infura.io/')
    );

    //const web3 = new Web3.providers.HttpProvider("http://localhost:8545");

    const tokenName = req.body.tokenName;
    const tokenSymbol = req.body.tokenSymbol;
    const tokenVersion = req.body.tokenVersion;
    const decimalUnits = req.body.decimalUnits;
    const initialSupply = req.body.initialSupply;
    const multisigETH = req.body.multisigETH;
    const tokensForTeam = req.body.tokensForTeam;
    const minContributionETH = req.body.minContributionETH;
    const maxCap = req.body.maxCap;
    const minCap = req.body.minCap;
    const tokenPriceWei = req.body.tokenPriceWei;
    const campaignDurationDays = req.body.campaignDurationDays;
    const firstPeriod = req.body.firstPeriod;
    const secondPeriod = req.body.secondPeriod;
    const thirdPeriod = req.body.thirdPeriod;
    const firstBonus = req.body.firstBonus;
    const secondBonus = req.body.secondBonus;
    const thirdBonus = req.body.thirddBonus;
    const ownerAccount = req.body.ownerAddress;
    const adminAccount = web3.eth.accounts[0];
    var crowdsaleAddress;
    



    const contractCrowdsaleInput = fs.readFileSync('ICO.sol');
    const outputCrowdsale = solc.compile(contractCrowdsaleInput.toString(), 1);

    // console.log(outputCrowdsale);
    const bytecodeCrowdsale = outputCrowdsale.contracts[':Crowdsale'].bytecode;
    const abiCrowdsale = JSON.parse(outputCrowdsale.contracts[':Crowdsale'].interface);

    const contractCrowdsale = web3.eth.contract(abiCrowdsale);

    const contractCrowdsaleInstance = contractCrowdsale.new(decimalUnits, 
        multisigETH,
        tokensForTeam,
        minContributionETH,
        maxCap,
        minCap,
        tokenPriceWei,
        campaignDurationDays,
        firstPeriod,
        secondPeriod,
        thirdPeriod,
        firstBonus,
        secondBonus,
        thirdBonus, {
            data: '0x' + bytecodeCrowdsale,
            from: adminAccount,
            gas: 1000000 * 2
        }, (err, res) => {
            if (err) {
                console.log("from line 117:"  + err );
                return;
            }

            // Log the tx, you can explore status with eth.getTransaction()
            console.log(res.transactionHash);

            // waitBlock();
            ownerAccount
            // If we have an address property, the contract was deployed
            if (res.address) {
                crowdsaleAddress = res.address;
                console.log("Your contract has been deployed at http://ropsten.etherscan.io/address/" + res.address);
                console.log("Note that it might take 30 - 90 sceonds for the block to propagate befor it's visible in etherscan.io");

                // create Token contract
                const contractTokenInput = fs.readFileSync('ICO.sol');
                const outputToken = solc.compile(contractTokenInput.toString(), 1);

                // console.log(outputCrowdsale);
                const bytecodeToken = outputToken.contracts[':Token'].bytecode;
                const abiToken = JSON.parse(outputToken.contracts[':Token'].interface);

                const contractToken = web3.eth.contract(abiToken);

                const contractTokenInstance = contractToken.new(initialSupply, tokenName, decimalUnits, tokenSymbol, tokenVersion, crowdsaleAddress, multisigETH, {
                    data: '0x' + bytecodeToken,
                    from: adminAccount,
                    gas: 1000000 * 2
                }, (err, res1) => {
                    if (err) {
                        console.log("from line 147:" + err);
                        return;
                    }

                    // Log the tx, you can explore status with eth.getTransaction()
                    // console.log(res.transactionHash);

                    // waitBlock();

                    // If we have an address property, the contract was deployed
                if (res1.address) {
                        console.log("Your contract has been deployed at http://ropsten.etherscan.io/address/" + res1.address);
                        console.log("Note that it might take 30 - 90 sceonds for the block to propagate befor it's visible in etherscan.io");

                        var crowdsaleHandle = contractCrowdsale.at(crowdsaleAddress);          
                        
                        console.log("Crowdsale address:" + res1.address + " OnwerAddress: " + ownerAccount);

                        var value = crowdsaleHandle.updateTokenAddressAndOwner(res1.address, ownerAccount,  {
                            from: adminAccount,
                            gas: 1000000
                        }, function (err, res) {
                            if (err) {
                                console.log("from line 169 :" +  + err)
                                result.end(err);
                            }

                            console.log("Updating token address in Crowdsale contract at http://ropsten.etherscan.io/tx/" + res);

                            result.end(JSON.stringify({
                                tokenAddress: res1.address,
                                crowdsaleAddress: crowdsaleAddress
                            }));

                        });
                    } else
                        console.log("Waiting for a mined block to include your contract... currently in block " + web3.eth.blockNumber);
                });
            } else
                console.log("Waiting for a mined block to include your contract... currently in block " + web3.eth.blockNumber);
        });









})






var server = app.listen(8080, function () {

    var host = server.address().address
    var port = server.address().port

    console.log("App listening at http://%s:%s", host, port)

})



