"use strict";

var gasPrice, gasAmount, web3, Web3, metaMask, host, localhost = false, adminAddress, networkName;

var account ;
var publicTokenName;
var tokenSymbol;
var tokenVersion;
var capped;
var initialSupply;
var decimalUnits;

var multisigETH;
var tokensForTeam;
var minContributionETH;
var maxContributionETH;
var maxCap;
var minCap;
var tokenPriceWei;
var campaignDurationDays;
var firstPeriod;
var secondPeriod;
var thirdPeriod;
var firstBonus;
var secondBonus;
var thirdBonus;
var form = $('#jsonForm');

function init() {



    setTimeout(function () {

        if (typeof window.web3 === 'undefined') {
            showTimeNotification("top", "right", "Please enable metamask.")
        } else if (window.web3.eth.defaultAccount == undefined) {
            showTimeNotification("top", "right", "Please unlock metamask.")

        } else if (web3.currentProvider.isMetaMask === true) {
            if (web3.eth.defaultAccount == undefined) {
                web3.eth.defaultAccount = window.web3.eth.defaultAccount
                adminAddress = web3.eth.defaultAccount;
            }

            // web3.eth.getAccounts( accounts => console.log(accounts[0]))
        } else {

            // Checks Web3 support
            if (typeof web3 !== 'undefined' && typeof Web3 !== 'undefined') {
                // If there's a web3 library loaded, then make your own web3
                web3 = new Web3(web3.currentProvider);
            } else if (typeof Web3 !== 'undefined') {
                // If there isn't then set a provider
                //var Method = require('./web3/methods/personal');
                web3 = new Web3(new Web3.providers.HttpProvider(connectionString));

                if (!web3.isConnected()) {

                    $("#alert-danger-span").text(" Problem with connection to the newtwork. Please contact " + supportEmail + " abut it. ");
                    $("#alert-danger").show();
                    return;
                }
            } else if (typeof web3 == 'undefined' && typeof Web3 == 'undefined') {

                Web3 = require('web3');
                web3 = new Web3();
                web3.setProvider(new web3.providers.HttpProvider(onnectionString));
            }

        }

        // var ICOContradct = web3.eth.contract(ICOABI);
        // var ICOHandle = ICOContradct.at(ICOAddress);

        //gasPrice = web3.eth.gasPrice;
        gasPrice = 20000000000;
        gasAmount = 4000000;


        if (localhost) host = "http://localhost:8181";
        else host = "https://node2.coinlaunch.co/";

        whichNetwork();
        retrieveData();

    }, 1000);
}
function determineStatus() {

    if (checkMetamaskStatus()) {

        // var ICOContract = web3.eth.contract(ICOABI);

        var ICOContract = web3.eth.contract(ICOABI);


        var ICOHandle = ICOContract.at($.cookie("ico"));

        ICOHandle.determineStatus(
            function (error, result) {

                if (!error) {
                    if (result == 1)
                        showTimeNotification("top", "right", "Crowdsale has been already finalized.");
                    else if (result == 2)
                        showTimeNotification("top", "right", "Crowdsale is still in progress.");
                    else if (result == 3)
                        showTimeNotification("top", "right", "Crowdsale didn't reach the minimum and currently refunds are in progress.");
                    else if (result == 4)
                        showTimeNotification("top", "right", "Crowdsale hasn't been started yet.");
                    else
                        finalize();

                } else {
                    console.error(error);
                }
            });
    }


}

function whichNetwork() {

           web3.version.getNetwork((err, netId) => {

            switch (netId) {
                    case "1":
                           networkName = "www";
                           break;
                       case "2":
                           networkName = "morden";
                            break;
                       case "3":
                           networkName = "ropsten";
                          break;
                      case "4":
                          networkName = "rinkeby";
                           break;
                       case "42":
                            networkName = "kovan";
                           break;
                      default:
                          networkName = "Unknown";
            }

                console.log(networkName);

            return (networkName);
        })
}

function retrieveData() {

    var blockEnd, startDate, endDate, tokenPrice;



    var ICOContract = web3.eth.contract(ICOABI);
    var ICOHandle = ICOContract.at($.cookie("ico"));



    ICOHandle.returnWebsiteData(function (error, websiteData) {

        var endBlock = websiteData[1];
        var startBlock = websiteData[0];

        var durationInBlocks = endBlock - startBlock;

        // assumption is that 2.5 blocks will be created in one minute on averge
        var durationMinutes = Math.round(durationInBlocks / 2.5);

        web3.eth.getBlock(Number(startBlock), function (error, res) {

            var startingTimeStamp = res.timestamp;

            var startDate = convertTimestamp(startingTimeStamp, false);
            var startDateObject = new Date(startDate);

            // add duration of campaign in minutes to determine the date of campaign end.
            startDateObject.setMinutes(startDateObject.getMinutes() + durationMinutes);


            var numberOfContributors = websiteData[2];
            var ethReceived = Number(websiteData[3]) / Math.pow(10, 18);
            var maxCap = Number(websiteData[4]) / Math.pow(10, 10);
            var minCap = Number(websiteData[5]) / Math.pow(10, 10);
            var tokensSold = Number(websiteData[6]) / Math.pow(10, 10);
            var tokenPriceWei = Number(websiteData[7])/ Math.pow(10, 18);
            var minContribution = Number(websiteData[8]);
            var maxContribution = Number(websiteData[9]);
            var contractStopped = websiteData[10] ? "Yes" : "No";
            var presaleClosed = websiteData[11] ? "Yes" : "No";



            $("#number-participants").html(formatNumber(numberOfContributors));
            $("#ico-start").html(new Date(convertTimestamp(startingTimeStamp, false)));
            $("#ico-end").html(startDateObject);
            $("#ether-raised").html(ethReceived + " Eth");
            $("#tokens-sold").html(formatNumber(tokensSold));
            $("#token-price").html(tokenPriceWei + " Eth");
            $("#min-investment").html(minContribution + " ETH");
            $("#max-investment").html(maxContribution + " ETH");

            $("#contract-stoppped").html(contractStopped);
            $("#presale-closed").html(presaleClosed);

            $("#min-cap").html(formatNumber(minCap) + " Tokens");
            $("#max-cap").html(formatNumber(maxCap) + " Tokens");

        })
    });
}

function convertTimestamp(timestamp, onlyDate) {
    var d = new Date(timestamp * 1000), // Convert the passed timestamp to milliseconds
        yyyy = d.getFullYear(),
        mm = ('0' + (d.getMonth() + 1)).slice(-2), // Months are zero based. Add leading 0.
        dd = ('0' + d.getDate()).slice(-2), // Add leading 0.
        hh = d.getHours(),
        h = hh,
        min = ('0' + d.getMinutes()).slice(-2), // Add leading 0.
        sec = d.getSeconds(),
        ampm = 'AM',
        time;


    yyyy = ('' + yyyy).slice(-2);

    if (hh > 12) {
        h = hh - 12;
        ampm = 'PM';
    } else if (hh === 12) {
        h = 12;
        ampm = 'PM';
    } else if (hh == 0) {
        h = 12;
    }

    if (onlyDate) {
        time = mm + '/' + dd + '/' + yyyy;

    } else {
        // ie: 2013-02-18, 8:35 AM
        time = yyyy + '-' + mm + '-' + dd + ', ' + h + ':' + min + ' ' + ampm;
        time = mm + '/' + dd + '/' + yyyy + '  ' + h + ':' + min + ':' + sec + ' ' + ampm;
    }

    return time;
}


function formatNumber(number) {
    number = number.toFixed(0) + '';
    var x = number.split('.');
    var x1 = x[0];
    var x2 = x.length > 1 ? '.' + x[1] : '';
    var rgx = /(\d+)(\d{3})/;
    while (rgx.test(x1)) {
        x1 = x1.replace(rgx, '$1' + ',' + '$2');
    }
    return x1 + x2;
}

function transferTokens() {

    var addressFrom, addressTo, value;

    if (checkMetamaskStatus()) {

        var tokenContract = web3.eth.contract(tokenABI);
        var tokenHandle = tokenContract.at($.cookie("token"));
        var toAddress = $("#to-address").val();
        var amount = $("#amount-to-transffer").val();

    //    var toAddress = "0x6C88e6C76C1Eb3b130612D5686BE9c0A0C78925B";
      //  var amount = 100;


        tokenHandle.transfer(toAddress, amount, {
            from: adminAddress,
            gasPrice: gasPrice,
            gas: gasAmount
        }, function (error, result) {

            if (!error) {
                progressActionsBefore();
                console.log(result)
                var logStarted = tokenHandle.Transfer({
                    from: addressFrom,
                    to: addressTo,
                    value: value
                });

                logStarted.watch(function (error, res) {
                    var message = "Tokens have been transfered. (" + res.args.value + " tokens)";
                    progressActionsAfter(message, true);
                });
            } else {
                console.error(error);
            }
        });

    }

}

function startICO() {

    var blockEnd, startDate, endDate, tokenPrice;


    if (checkMetamaskStatus()) {

        var ICOContract = web3.eth.contract(ICOABI);
        var ICOHandle = ICOContract.at($.cookie("ico"));
        setTimeout(function () {

            ICOHandle.start({
                from: adminAddress,
                gasPrice: gasPrice,
                gas: gasAmount
            }, function (error, result) {

                if (!error) {
                    progressActionsBefore();
                    console.log(result)
                    var logStarted = ICOHandle.Started({
                        startBlock: startDate
                    }, {
                        endBlock: endDate
                    });

                    logStarted.watch(function (error, res) {
                        var message = "ICO contract has been started.";
                        progressActionsAfter(message, true);
                    });
                } else {
                    console.error(error);
                }
            });
        }, 10);
    }
}

function stopInEmergency() {

    var stopped, started;



    if (checkMetamaskStatus()) {
        var ICOContradct = web3.eth.contract(ICOABI);
        var ICOHandle = ICOContradct.at($.cookie("ico"));
        setTimeout(function () {

            ICOHandle.emergencyStop({
                from: adminAddress,
                gasPrice: gasPrice,
                gas: gasAmount
            }, function (error, result) {

                if (!error) {
                    progressActionsBefore();
                    console.log(result)
                    var log = ICOHandle.StoppedInEmergency({
                        stopped: stopped
                    });

                    log.watch(function (error, res) {
                        var message = "ICO has been stopped in emergency.";
                        progressActionsAfter(message, true);
                    });
                } else {
                    //displayExecutionError(error);
                    console.error(error);
                }
            });
        }, 10);
    }
}

function restartFromEmergency() {

    var stopped, started;

    if (checkMetamaskStatus()) {

        var ICOContradct = web3.eth.contract(ICOABI);
        var ICOHandle = ICOContradct.at($.cookie("ico"));
        setTimeout(function () {

            ICOHandle.release({
                from: adminAddress,
                gasPrice: gasPrice,
                gas: gasAmount
            }, function (error, result) {

                if (!error) {
                    progressActionsBefore();
                     console.log(result)
                    var log = ICOHandle.StartedFromEmergency({
                        stopped: stopped
                    });

                    log.watch(function (error, res) {
                        var message = "ICO has been restarted from emergency.";
                        progressActionsAfter(message, true);
                    });
                } else {
                    //displayExecutionError(error);
                    console.error(error);
                }
            });
        }, 10);
    }
}

function finalize() {

    var finalized;
    if (checkMetamaskStatus()) {

        var ICOContradct = web3.eth.contract(ICOABI);
        var ICOHandle = ICOContradct.at($.cookie("ico"));
        setTimeout(function () {

            ICOHandle.finalize({
                from: adminAddress,
                gasPrice: gasPrice,
                gas: gasAmount
            }, function (error, result) {

                if (!error) {
                    progressActionsBefore();
                    console.log(result)
                    var log = ICOHandle.Finalized({
                        success: finalized
                    });

                    log.watch(function (error, res) {
                        var message = "ICO has been finalized.";
                        progressActionsAfter(message, true);
                    });
                } else {
                    // displayExecutionError(error);
                    console.error(error);
                }
            });
        }, 10);
    }
}

function contribute() {

    var amount = $("#contributed-amount").val();
    var amountWei = Number(web3.toWei(amount, "ether"));
    var addressTo = $.cookie("ico");


    web3.eth.sendTransaction({
        to: addressTo,
        value: amountWei,
        gasPrice: gasPrice,
        gas: 130000
    }, function (error, txn) {

        progressActionsBefore();

        if (!error) {

            var interval = setInterval(function () {
                web3.eth.getTransactionReceipt(txn, function (error, receipt) {
                    if (receipt && receipt.logs) {

                        web3.eth.getBlock(receipt.blockNumber, true, function (error, block) {
                            var transactionsNo = block.transactions.length;
                            var flag = false;
                            for (var i = 0; i < transactionsNo; i++) {
                                if (Number(block.transactions[i].value) == amountWei && block.transactions[i].from == web3.eth.defaultAccount) {
                                    var flag = true;
                                    var message = "Ether has been sent but various condition can cause that transaction could be rejected. Check block explorer for details. ";
                                    break;
                                }
                                else {
                                    var message = "Ether hasn't been sent."
                                    var flag =false;
                                }
                            }
                            progressActionsAfter(message, flag);
                            clearInterval(interval);
                        });
                    }
                })
            }, 10000);
            //  progressActionsAfter("Your payment has been received and tokens sent to your address", true);
        } else
            console.error(error);
    })
}

function updateTokenAddress(tokenAddress) {

    var updated;

    if (checkMetamaskStatus()) {

        var ICOContract = web3.eth.contract(ICOABI);
        var ICOHandle = ICOContract.at($.cookie("ico"));


        setTimeout(function () {

            progressDeployment(8);

            ICOHandle.updateTokenAddress(tokenAddress, {
                from: adminAddress,
                gasPrice: gasPrice,
                gas: gasAmount
            }, function (error, result) {

                if (!error) {
                    console.log(result)
                    var log = ICOHandle.ContractUpdated({
                        done: updated
                    });

                    log.watch(function (error, res) {
                        var message = "Token addrss has been updated.";
                        progressDeployment(9);
                    });
                } else {
                    console.error(error);
                }
            });
        }, 10);

    }

}

function deployCrowdSale(abi, bytecode) {

    return new Promise(function (resolve, reject) {



        var clientAddress = web3.eth.defaultAccount;
        var contractCrowdsale = web3.eth.contract(abi);


        progressDeployment(2);
        var contractCrowdsaleInstance = contractCrowdsale.new(decimalUnits,
            multisigETH,
            tokensForTeam,
            minContributionETH,
            maxContributionETH,
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
                data: '0x' + bytecode,
                from: clientAddress,
                gas: 1000000 * 2
            }, (err, res) => {
            if (err) {
                console.log(err);
                reject(err);
                return;
            }



            // Log the tx, you can explore status with eth.getTransaction()
            console.log(res.transactionHash);

        // waitBlock();

        // If we have an address property, the contract was deployed
        if (res.address) {
            var crowdsaleAddress = res.address;
            console.log("Your contract has been deployed at http://" + networkName + ".etherscan.io/address/" + res.address);
            console.log("Note that it might take 30 - 90 sceonds for the block to propagate befor it's visible in etherscan.io");
            progressDeployment(4, res.address);
            resolve(res.address);
        } else {
            // console.log("Waiting for a mined block to include your contract... currently in block " + web3.eth.blockNumber);
            console.log("Waiting for a mined block to include your contract... currently in block ");
            progressDeployment(3);
        }
    });
    })
}

function deployToken(abi, bytecode, crowdsaleAddress) {

    return new Promise(function (resolve, reject) {


        var clientAddress = web3.eth.defaultAccount;

        var contractToken = web3.eth.contract(abi);

        progressDeployment(5);
        var contractTokenInstance = contractToken.new(
            initialSupply,
            publicTokenName,
            decimalUnits,
            tokenSymbol,
            tokenVersion,
            crowdsaleAddress, {
                data: '0x' + bytecode,
                from: clientAddress,
                gas: 1000000 * 2
            }, (err, res) => {
            if (err) {
                console.log(err);
                reject(err);
                return;
            }
            console.log(res.transactionHash);

        // If we have an address property, the contract was deployed
        if (res.address) {
            console.log("Your contract has been deployed at http://" + networkName + ".etherscan.io/address/" + res.address);
            console.log("Note that it might take 30 - 90 sceonds for the block to propagate befor it's visible in etherscan.io");

            $.cookie("token", res.address);
            $.cookie("ico", crowdsaleAddress);
            $("#CrowdSaleAddress").html($.cookie("ico"));



            progressDeployment(7, crowdsaleAddress, res.address);

            resolve(res.address);
        } else {
            // console.log("Waiting for a mined block to include your contract... currently in block " + web3.eth.blockNumber);
            console.log("Waiting for a mined block to include your contract... currently in block ");
            progressDeployment(6, crowdsaleAddress);
        }
    });
    });


}

function progressDeployment(step, arg1, arg2) {

    $("#message-status-title").html("");
    $("#message-status-body").html("");
    var message;

    switch (step) {

        case 1:
            message = 'Compiling contract: <i class="fa fa-spinner fa-spin" style="font-size:28px;color:green"></i>';
            break;
        case 2:
            message = 'Compiling contract:  <i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>' +
                'Deploying Crowdsale contract: <i class="fa fa-spinner fa-spin" style="font-size:28px;color:green"></i>';
            break;
        case 3:
            message = 'Compiling contract:  <i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>' +
                'Deploying Crowdsale contract: <i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>' +
                'Waiting for a mined block to include your contract. <i class="fa fa-spinner fa-spin" style="font-size:28px;color:green"></i>';
            break;
        case 4:
            message = 'Compiling contract:  <i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>' +
                'Deploying Crowdsale contract: <i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>' +
                'Waiting for a mined block to include your contract. <i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>' +
                'Crowdsale contract has been deployed  <a href=http://' + networkName + '.etherscan.io/address/' + arg1 + '   onclick="window.open(this.href, \'mywin\',\'left=20,top=20,width=1024,height=768,toolbar=1,resizable=0\'); return false;">here.' +
                '</a><i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i>';
            break;
        case 5:
            message = 'Compiling contract:  <i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>' +
                'Deploying Crowdsale contract: <i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>' +
                'Waiting for a mined block to include your contract. <i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>' +
                'Crowdsale contract has been deployed  <a href=http://' + networkName + '.etherscan.io/address/' + arg1 + '   onclick="window.open(this.href, \'mywin\',\'left=20,top=20,width=1024,height=768,toolbar=1,resizable=0\'); return false;">here.' +
                '</a><i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>' +
                'Deploying Token contract: <i class="fa fa-spinner fa-spin" style="font-size:28px;color:green"> </i>';
            break;
        case 6:
            message = 'Compiling contract:  <i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>' +
                'Deploying Crowdsale contract: <i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>' +
                'Waiting for a mined block to include your contract. <i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>' +
                'Crowdsale contract has been deployed  <a href=http://' + networkName + '.etherscan.io/address/' + arg1 + '   onclick="window.open(this.href, \'mywin\',\'left=20,top=20,width=1024,height=768,toolbar=1,resizable=0\'); return false;">here.' +
                '</a><i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>' +
                'Deploying Token contract: <i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>' +
                'Waiting for a mined block to include your contract. <i class="fa fa-spinner fa-spin" style="font-size:28px;color:green"></i>';
            break;
        case 7:
            message = 'Compiling contract:  <i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>' +
                'Deploying Crowdsale contract: <i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>' +
                'Waiting for a mined block to include your contract. <i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>' +
                'Crowdsale contract has been deployed <a href=http://' + networkName + '.etherscan.io/address/' + arg1 + '   onclick="window.open(this.href, \'mywin\',\'left=20,top=20,width=1024,height=768,toolbar=1,resizable=0\'); return false;">here.' +
                '</a><i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>' +
                'Deploying Token contract: <i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>' +
                'Waiting for a mined block to include your contract. <i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>' +
                'Token contract has been deployed : <a href=http://' + networkName + '.etherscan.io/address/' + arg2 + '   onclick="window.open(this.href, \'mywin\',\'left=20,top=20,width=1024,height=768,toolbar=1,resizable=0\'); return false;">here.' +
                '</a><i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>'
            break;

        case 8:
            message = 'Compiling contract:  <i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>' +
                'Deploying Crowdsale contract: <i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>' +
                'Waiting for a mined block to include your contract. <i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>' +
                'Crowdsale contract has been deployed <a href=http://' + networkName + '.etherscan.io/address/' + $.cookie("ico") + '  onclick="window.open(this.href, \'mywin\',\'left=20,top=20,width=1024,height=768,toolbar=1,resizable=0\'); return false;">here.' +
                '</a><i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>' +
                'Deploying Token contract: <i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>' +
                'Waiting for a mined block to include your contract. <i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>' +
                'Token contract has been deployed : <a href=http://' + networkName + '.etherscan.io/address/' + $.cookie("token") + '  onclick="window.open(this.href, \'mywin\',\'left=20,top=20,width=1024,height=768,toolbar=1,resizable=0\'); return false;">here.' +
                '</a><i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>' +
                'Updating token contract address in ICO contract: <i class="fa fa-spinner fa-spin" style="font-size:28px;color:green"></i><br>'
            break;
        case 9:
            message = 'Compiling contract:  <i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>' +
                'Deploying Crowdsale contract: <i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>' +
                'Waiting for a mined block to include your contract. <i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>' +
                'Crowdsale contract has been deployed <a href=http://' + networkName + '.etherscan.io/address/' + $.cookie("ico") + '   onclick="window.open(this.href, \'mywin\',\'left=20,top=20,width=1024,height=768,toolbar=1,resizable=0\'); return false;">here.' +
                '</a><i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>' +
                'Deploying Token contract: <i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>' +
                'Waiting for a mined block to include your contract. <i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>' +
                'Token contract has been deployed : <a href=http://' + networkName + '.etherscan.io/address/' + $.cookie("token") + '   onclick="window.open(this.href, \'mywin\',\'left=20,top=20,width=1024,height=768,toolbar=1,resizable=0\'); return false;">here.' +
                '</a><i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>' +
                'Updating token contract address in ICO contract: <i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>' +
                'Token contract address in ICO contract has been updated: <i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>' +
                'Processing Done. <i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i> '+
                '<br><br>Final CrowdSale Address: '+$.cookie("ico");

    }

    $("#message-status-body").html(message);
    $("#progress").modal();

}

function checkMetamaskStatus() {

    if (typeof window.web3 === 'undefined') {
        showTimeNotification("top", "right", "Please enable metamask.")
        return false;
    } else if (window.web3.eth.defaultAccount == undefined) {
        showTimeNotification("top", "right", "Please unlock metamask.")
        return false;

    }
    web3.eth.defaultAccount = window.web3.eth.defaultAccount;
    return true;
}


function progressActionsAfter(message, success) {

    if (success) {
        $("#message-status-title").html("Contract executed...<img src='../assets/img/checkmark.gif' height='40' width='43'>");
    } else {
        $("#message-status-title").html("Contract executed...<img src='../assets/img/no.png' height='40' width='43'>");
    }

    $("#message-status-body").html("<BR>" + message);

}


function progressActionsBefore() {


    $("#message-status-title").html("");
    $("#message-status-body").html("");
    $("#progress").modal();
    $("#message-status-title").html('Verifying contract... <i class="fa fa-refresh fa-spin" style="font-size:28px;color:red"></i>');
    setTimeout(function () {
        $("#message-status-title").html('Executing contract call..<i class="fa fa-spinner fa-spin" style="font-size:28px;color:green"></i>');
    }, 1000);

}

function displayExecutionError(err) {


    showTimeNotification('top', 'right', err)
    setTimeout(function () {
        //   location.replace('index.html');
    }, 2000);
}


function showTimeNotification(from, align, text) {

    var type = ['', 'info', 'success', 'warning', 'danger', 'rose', 'primary'];

    var color = Math.floor((Math.random() * 6) + 1);

    $.notify({
        icon: "notifications",
        message: text,
        allow_dismiss: true

    }, {
        type: type[color],
        timer: 300,
        placement: {
            from: from,
            align: align
        }
    });
}

function checkRequiredFields(){

    var content = '';
    form.find(".required").each(function(){


        if($(this).val()==''){
            if(!$(this).hasClass('error-block'))
                $(this).addClass('error-block');
            if($(this).attr('id').substring(0,3)!='sum')
                content = content + "<div class='col-md-7' style='font-size: 20px; color:red'>"+$(this).attr('id')+"</div><div class='col-md-5'> Required  Invalid </div>";

        }else{

            if($(this).hasClass('error-block'))
                    $(this).removeClass('error-block');

            if($(this).attr('id') == 'tokenName' && $(this).val().length>15){
                if(!$(this).hasClass('error-block'))
                    $(this).addClass('error-block');
                content = content + "<div class='col-md-7' style='font-size: 20px; color:red'>"+$(this).attr('id')+"</div><div class='col-md-5'>  Max Length Invalid </div>";
            }

        }
    });

    return content;
}

$(document).ready(function () {

    //var account, publicTokenName, tokenSymbol, tokenVersion, capped, initialSupply, decimalPoints;

    if($.cookie("publicTokenName") != "undefined")
        $("#tokenName").val($.cookie("publicTokenName"));
    if($.cookie("tokenSymbol") != "undefined")
        $("#symbol").val($.cookie("tokenSymbol"));
    if($.cookie("tokenVersion") != "undefined")
        $("#tokenVersion").val($.cookie("tokenVersion"));
    if($.cookie("initialSupply") != "undefined")
        $("#initialSupply").val($.cookie("initialSupply"));
    if($.cookie("capped") != "undefined")
        $('#isDecimalPoint').val($.cookie("capped"));
    if($.cookie("decimalPoints") != "undefined")
        $("#numberOfDecimalPoints").val($.cookie("decimalPoints"));
    if($.cookie("multisigETH") != "undefined")
        $("#multiSigEth").val($.cookie("multisigETH"));
    if($.cookie("tokensForTeam") != "undefined")
        $("#tokensForTeam").val($.cookie("tokensForTeam"));
    if($.cookie("minContributionETH") != "undefined")
        $("#minContributionEth").val($.cookie("minContributionETH"));
    if($.cookie("maxContributionETH") != "undefined")
        $("#maxContributionEth").val($.cookie("maxContributionETH"));
    if($.cookie("maxCap") != "undefined")
        $("#maxCap").val($.cookie("maxCap"));
    if($.cookie("minCap") != "undefined")
        $("#minCap").val($.cookie("minCap"));
    if($.cookie("tokenPriceWei") != "undefined")
        $("#tokenPriceWei").val($.cookie("tokenPriceWei"));
    if($.cookie("campaignDurationDays") != "undefined")
        $("#campaignDurationDays").val($.cookie("campaignDurationDays"));
    if($.cookie("firstPeriod") != "undefined")
        $("#firstPeriod").val($.cookie("firstPeriod"));
    if($.cookie("secondPeriod") != "undefined")
        $("#secondPeriod").val($.cookie("secondPeriod"));
    if($.cookie("thirdPeriod") != "undefined")
        $("#thirdPeriod").val($.cookie("thirdPeriod"));
    if($.cookie("firstBonus") != "undefined")
        $("#firstBonus").val($.cookie("firstBonus"));
    if($.cookie("secondBonus") != "undefined")
        $("#secondBonus").val( $.cookie("secondBonus"));
    if($.cookie("thirdBonus") != "undefined")
        $("#thirdBonus").val($.cookie("thirdBonus"));

    if($.cookie("ico") != "undefined")
        $("#CrowdSaleAddress").html($.cookie("ico"));


    $("#btnStartICO").click(function () {
        startICO();
    });


    $("#btnEmergencyStop").unbind('click').bind('click',function () {
        stopInEmergency();
    });

    $("#btnEmergencyRestart").unbind('click').bind('click',function () {
        restartFromEmergency();
    });

    $("#btnFinalize").unbind('click').bind('click',function () {
        determineStatus();
    });

    $("#btnTransferTokens").unbind('click').bind('click',function () {
        transferTokens();
    });

   $("#load-contract").click(function () {
        $.cookie("ico", $("#loaded-contract").val());
        showTimeNotification("top", "right", "Contract " + $("#loaded-contract").val() + " loaded.");
   });

   $("#contribute").click(function () {
        showTimeNotification("top", "right", "Please send your payment.");
        contribute();
   });

    $('#btnSaveChanges').unbind('click').bind('click', function () {
        publicTokenName = $("#tokenName").val();
        tokenSymbol = $("#symbol").val();
        tokenVersion = $("#tokenVersion").val();
        initialSupply = $("#initialSupply").val();
        capped = $('#isDecimalPoint').val();
        decimalUnits = $("#numberOfDecimalPoints").val();

        multisigETH = $("#multiSigEth").val();
        tokensForTeam = $("#tokensForTeam").val();
        minContributionETH = $("#minContributionEth").val();
        maxContributionETH = $("#maxContributionEth").val();
        maxCap = $("#maxCap").val();
        minCap = $("#minCap").val();
        tokenPriceWei = $("#tokenPriceWei").val();
        campaignDurationDays =  $("#campaignDurationDays").val();
        firstPeriod = $("#firstPeriod").val();
        secondPeriod = $("#secondPeriod").val();
        thirdPeriod =  $("#thirdPeriod").val();
        firstBonus = $("#firstBonus").val();
        secondBonus = $("#secondBonus").val();
        thirdBonus = $("#thirdBonus").val();

        $.cookie("publicTokenName",publicTokenName);
        $.cookie("tokenSymbol",tokenSymbol);
        $.cookie("tokenVersion",tokenVersion);
        $.cookie("capped",capped);
        $.cookie("initialSupply",initialSupply);
        $.cookie("decimalPoints",decimalUnits);

        $.cookie("multisigETH",multisigETH);
        $.cookie("tokensForTeam",tokensForTeam);
        $.cookie("minContributionETH",minContributionETH);
        $.cookie("maxContributionETH",maxContributionETH);
        $.cookie("maxCap",maxCap);
        $.cookie("minCap",minCap);
        $.cookie("tokenPriceWei",tokenPriceWei);
        $.cookie("campaignDurationDays",campaignDurationDays);
        $.cookie("firstPeriod",firstPeriod);
        $.cookie("secondPeriod",secondPeriod);
        $.cookie("thirdPeriod",thirdPeriod);
        $.cookie("firstBonus",firstBonus);
        $.cookie("secondBonus",secondBonus);
        $.cookie("thirdBonus",thirdBonus);

        if(checkRequiredFields()!=''){

            $("#validation-content").html(checkRequiredFields());
            $("#validation-modal").modal('show');

            return 0;
        }


        if (checkMetamaskStatus()) {

            //  progressActionsBefore();

            progressDeployment(1);

            $.post(host + "compile", {

                },
                function (data, status) {

                    if (data != "" && status == "success") {
                        var myObj = JSON.parse(data);

                        var message = "Bytecode: " + myObj.bytecodeCrowdsale + "<br>" +
                            "CrowdSaleAbi:" + myObj.abiCrowdsale;

                        deployCrowdSale(myObj.abiCrowdsale, myObj.bytecodeCrowdsale).then(function (crowdsaresultleAddress, err) {
                            deployToken(myObj.abiToken, myObj.bytecodeToken, crowdsaresultleAddress)
                                .then(function (tokenAddress, error) {
                                    updateTokenAddress(tokenAddress);
                                })

                        })

                    }
                });
        }
    });



    $(".required").on("change",function(){

        if($(this).val()!=''){
            if($(this).hasClass('error-block'))
                $(this).removeClass('error-block');
        }else{
            if(!$(this).hasClass('error-block'))
                $(this).addClass('error-block');
        }

        if($(this).attr('id') == 'tokenName' && $(this).val().length>15) {
            if (!$(this).hasClass('error-block'))
                $(this).addClass('error-block');
        }


    });

    $('#tab_summary').on('click',function(){


        $("#sum_tokenName").val($("#tokenName").val());
        $("#sum_symbol").val($("#symbol").val());
        $("#sum_tokenVersion").val($("#tokenVersion").val());
        $('#sum_isDecimalPoint').val($('#isDecimalPoint').val());

        $("#sum_initialSupply").val($("#initialSupply").val());
        $("#sum_numberOfDecimalPoints").val($("#numberOfDecimalPoints").val());
        $("#sum_multiSigEth").val($("#multiSigEth").val());
        $("#sum_tokensForTeam").val($("#tokensForTeam").val());
        $("#sum_minContributionEth").val($("#minContributionEth").val());
        $("#sum_maxContributionEth").val($("#maxContributionEth").val());
        $("#sum_maxCap").val($("#maxCap").val());
        $("#sum_minCap").val($("#minCap").val());
        $("#sum_tokenPriceWei").val($("#tokenPriceWei").val());
        $("#sum_campaignDurationDays").val($("#campaignDurationDays").val());
        $("#sum_firstPeriod").val($("#firstPeriod").val());
        $("#sum_secondPeriod").val($("#secondPeriod").val());
        $("#sum_thirdPeriod").val($("#thirdPeriod").val());
        $("#sum_firstBonus").val($("#firstBonus").val());
        $("#sum_secondBonus").val($("#secondBonus").val());
        $("#sum_thirdBonus").val($("#thirdBonus").val());
        $("#sum_percentageFee").val($("#percentageFee").val());

        $("#tab6_7").find(".required").each(function(){

            if($(this).val()!=''){
                if($(this).hasClass('error-block'))
                    $(this).removeClass('error-block');
            }else{
                if(!$(this).hasClass('error-block'))
                    $(this).addClass('error-block');
            }

            if($(this).attr('id') == 'sum_tokenName' && $(this).val().length>15) {
                if (!$(this).hasClass('error-block'))
                    $(this).addClass('error-block');
            }
        });

    });

    $("#btn_reset").on("click",function(){

        form.find("input").val("");
        $('#description').val('');
        $("#CrowdSaleAddress").html("");

        form.find(".required").each(function(){

            if($(this).hasClass('error-block'))
                $(this).removeClass('error-block');
        });

    });

    $("#terms_content").on("scroll",function(){

        if($(this).scrollTop()>=($(this).get(0).scrollHeight-$(this).height()-100)){
            $("#btnSaveChanges").prop("disabled","");
       }
    });
});