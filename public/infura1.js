var Web3 = require('web3');
var util = require('ethereumjs-util');
var tx = require('ethereumjs-tx');
var lightwallet = require('eth-lightwallet');
var txutils = lightwallet.txutils;

var web3 = new Web3(
   // new Web3.providers.HttpProvider('http://localhost:8545/')
    new Web3.providers.HttpProvider('https://ropsten.infura.io/')
);

//var address = '0x6c88e6c76c1eb3b130612d5686be9c0a0c78925b';
//var address = '0x353599f73beac96d26a25fe9cc333fb607f291c4';

var address = web3.eth.coinbase;

console.log("ether balance: " + web3.eth.getBalance(address))
//var key = '9e5e6a5cb14243366028835508af6c29c3ec16a2051e9510e363bd7a4190eadc';
var key = '0dd868082fbba45ed37ec476e798b3bf0694e13080b2d2ba6ed72a3fc77cb4c1';

var bytecode ="6060604052341561000c57fe5b5b60a68061001b6000396000f30060606040526000357c0100000000000000000000000000000000000000000000000000000000900463ffffffff16806339ec021c14603a575bfe5b3415604157fe5b6058600480803560ff16906020019091905050605a565b005b6000600082600a0a60ff16629896800262ffffff1691508190505b5050505600a165627a7a723058201aa083f84301acc104a3de0151822aa682702844181a821c16490689e05d729e0029";


var interface = [{"constant":false,"inputs":[{"name":"i","type":"uint8"}],"name":"test1","outputs":[],"payable":false,"type":"function"}];


function sendRaw(rawTx) {
    var privateKey = new Buffer(key, 'hex');
    var transaction = new tx(rawTx);
    transaction.sign(privateKey);
    var serializedTx = transaction.serialize().toString('hex');
    web3.eth.sendRawTransaction(
    '0x' + serializedTx, function(err, result) {
        if(err) {
            console.log(err );
        } else {
            console.log(result);
        }
    });
}



var rawTx = {
    nonce: web3.toHex(web3.eth.getTransactionCount(address)),    
    gasLimit: web3.toHex(3000000),   
    gasPrice: web3.toHex(20000000000),    
    value: '0x00', 
    data: '0x' + bytecode   
};


sendRaw(rawTx);
