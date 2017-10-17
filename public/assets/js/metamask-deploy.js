"use strict";

var gasPrice, gasAmount, web3, Web3, metaMask, host, localhost = false,
    adminAddress;



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


        if (localhost) host = "http://localhost:8181"
        else host = "https://node2.coinlaunch.co/"

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

function transferTokens() {

    var addressFrom, addressTo, value;

    if (checkMetamaskStatus()) {

        var tokenContract = web3.eth.contract(tokenABI);
        var tokenHandle = tokenContract.at($.cookie("token"));
        var toAddress = $("#to-address").val();
        var amount = $("#amount-to-transffer").val();


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


function updateTokenAddress(tokenAddress) {

    var updated;

    if (checkMetamaskStatus()) {

        var ICOContradct = web3.eth.contract(ICOABI);
        var ICOHandle = ICOContradct.at($.cookie("ico"));

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

        var decimalUnits = $("#number-of-decimal").val();
        var multisigETH = $("#multisig-ETH").val();
        var tokensForTeam = $("#tokens-for-team").val();
        var minContributionETH = $("#min-contribution-ETH").val();
        var maxCap = $("#max-cap").val();
        var minCap = $("#min-cap").val();
        var tokenPriceWei = $("#token-price-wei").val();
        var campaignDurationDays = $("#campaign-duration-days").val();
        var firstPeriod = $("#first-period").val();
        var secondPeriod = $("#second-period").val();
        var thirdPeriod = $("#third-period").val();
        var firstBonus = $("#first-bonus").val();
        var secondBonus = $("#second-bonus").val();
        var thirdBonus = $("#third-bonus").val();
        var clientAddress = web3.eth.defaultAccount;

        var contractCrowdsale = web3.eth.contract(abi);

        progressDeployment(2);
        var contractCrowdsaleInstance = contractCrowdsale.new(decimalUnits,
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
                    console.log("Your contract has been deployed at http://ropsten.etherscan.io/address/" + res.address);
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

        var publicTokenName = $("#public-token-name").val();
        var tokenSymbol = $("#token-symbol").val();
        var tokenVersion = $("#token-version").val();
        var initialSupply = $("#initial-supply").val();
        var decimalUnits = $("#number-of-decimal").val();

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
                    console.log("Your contract has been deployed at http://ropsten.etherscan.io/address/" + res.address);
                    console.log("Note that it might take 30 - 90 sceonds for the block to propagate befor it's visible in etherscan.io");
                    $.cookie("token", res.address);
                    $.cookie("ico", crowdsaleAddress);
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
                'Crowdsael contract has been deployed  <a href=http://ropsten.etherscan.io/address/' + arg1 + '>here.' +
                '</a><i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i>';
            break;
        case 5:
            message = 'Compiling contract:  <i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>' +
                'Deploying Crowdsale contract: <i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>' +
                'Waiting for a mined block to include your contract. <i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>' +
                'Crowdsael contract has been deployed  <a href=http://ropsten.etherscan.io/address/' + arg1 + '>here.' +
                '</a><i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>' +
                'Deploying Token cotnract: <i class="fa fa-spinner fa-spin" style="font-size:28px;color:green"> </i>';
            break
        case 6:
            message = 'Compiling contract:  <i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>' +
                'Deploying Crowdsale contract: <i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>' +
                'Waiting for a mined block to include your contract. <i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>' +
                'Crowdsael contract has been deployed  <a href=http://ropsten.etherscan.io/address/' + arg1 + '>here.' +
                '</a><i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>' +
                'Deploying Token cotnract: <i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>' +
                'Waiting for a mined block to include your contract. <i class="fa fa-spinner fa-spin" style="font-size:28px;color:green"></i>';
            break;
        case 7:
            message = 'Compiling contract:  <i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>' +
                'Deploying Crowdsale contract: <i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>' +
                'Waiting for a mined block to include your contract. <i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>' +
                'Crowdsael contract has been deployed <a href=http://ropsten.etherscan.io/address/' + arg1 + '>here.' +
                '</a><i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>' +
                'Deploying Token cotnract: <i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>' +
                'Waiting for a mined block to include your contract. <i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>' +
                'Token contract has been deployed : <a href=http://ropsten.etherscan.io/address/' + arg2 + '>here.' +
                '</a><i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>'
            break;
        case 8:
            message = 'Compiling contract:  <i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>' +
                'Deploying Crowdsale contract: <i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>' +
                'Waiting for a mined block to include your contract. <i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>' +
                'Crowdsael contract has been deployed <a href=http://ropsten.etherscan.io/address/' + $.cookie("ico") + '>here.' +
                '</a><i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>' +
                'Deploying Token cotnract: <i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>' +
                'Waiting for a mined block to include your contract. <i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>' +
                'Token contract has been deployed : <a href=http://ropsten.etherscan.io/address/' + $.cookie("token") + '>here.' +
                '</a><i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>' +
                'Updating token contract address in ICO contract: <i class="fa fa-spinner fa-spin" style="font-size:28px;color:green"></i><br>'
            break;
        case 9:
            message = 'Compiling contract:  <i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>' +
                'Deploying Crowdsale contract: <i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>' +
                'Waiting for a mined block to include your contract. <i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>' +
                'Crowdsael contract has been deployed <a href=http://ropsten.etherscan.io/address/' + $.cookie("ico") + '>here.' +
                '</a><i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>' +
                'Deploying Token cotnract: <i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>' +
                'Waiting for a mined block to include your contract. <i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>' +
                'Token contract has been deployed : <a href=http://ropsten.etherscan.io/address/' + $.cookie("token") + '>here.' +
                '</a><i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>' +
                'Updating token contract address in ICO contract: <i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>' +
                'Token contract address in ICO contract has been updated: <i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>' +
                'Processing Done. <i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i> ';


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
        $("#message-status-title").html("Contract executed...<img src='../dist/img/no.png' height='40' width='43'>");
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



$(document).ready(function () {


    $("#transfer").click(function () {
        transferTokens();
    });




    $("#start").click(function () {
        startICO();
    });




    $("#emergency-stop").click(function () {
        stopInEmergency();
    });

    $("#emergency-restart").click(function () {
        restartFromEmergency();
    });

    $("#finalize").click(function () {
        determineStatus();
    });


    $("#save").click(function () {



        if (checkMetamaskStatus()) {

            //  progressActionsBefore();

            progressDeployment(1);

            $.post(host + "compile", {

                },
                function (data, status) {

                    if (data != "" && status == "success") {
                        var myObj = JSON.parse(data);


                        /**  $("#result").html("Token contract has been deployed at this address: <a href=http://ropsten.etherscan.io/address/" +
                              myObj.tokenAddress + ">http://ropsten.etherscan.io/address/" + myObj.tokenAddress + "</a><br>" +
                              "Crowdsale contract has been deployed at this address: <a href=http://ropsten.etherscan.io/address/" +
                              myObj.crowdsaleAddress + ">http://ropsten.etherscan.io/address/" + myObj.crowdsaleAddress + "</a>");*/



                        var message = "Bytecode: " + myObj.bytecodeCrowdsale + "<br>" +
                            "CrowdSaleAbi:" + myObj.abiCrowdsale;

                        deployCrowdSale(myObj.abiCrowdsale, myObj.bytecodeCrowdsale).
                        then(function (crowdsaleAddress, err) {
                            deployToken(myObj.abiToken, myObj.bytecodeToken, crowdsaleAddress)
                                .then(function (tokenAddress, error) {
                                    updateTokenAddress(tokenAddress);
                                })
                        })

                    }
                });
        }
    });


});