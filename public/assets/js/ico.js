"use strict";

var gasPrice, gasAmount, web3, Web3, metaMask, host, localhost = false;



function init() {






    if (web3.currentProvider.isMetaMask === true) {
        metaMask = true;
        adminAddress = web3.eth.defaultAccount;
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


   if (localhost) host = "http://localhost:8545"
   else host = "https://node2.coinlaunch.co/"


}


function startICO() {

    var blockEnd, startDate, endDate, tokenPrice;



    var ICOContradct = web3.eth.contract(ICOABI);
    var ICOHandle = ICOContradct.at($.cookie("ico"));
    setTimeout(function () {

        ICOHandle.start(10, {
            from: adminAddress,
            gasPrice: gasPrice,
            gas: gasAmount
        }, function (error, result) {
            progressActionsBefore();
            if (!error) {
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
                displayExecutionError(error);
                console.error(error);
            }
        });
    }, 10);
}

function stopInEmergency() {

    var stopped, started;




    var ICOContradct = web3.eth.contract(ICOABI);
    var ICOHandle = ICOContradct.at($.cookie("ico"));
    setTimeout(function () {

        ICOHandle.emergencyStop({
            from: adminAddress,
            gasPrice: gasPrice,
            gas: gasAmount
        }, function (error, result) {
            progressActionsBefore();
            if (!error) {
                console.log(result)
                var log = ICOHandle.StoppedInEmergency({
                    stopped: stopped
                });

                log.watch(function (error, res) {
                    var message = "ICO has been stopped in emergency.";
                    progressActionsAfter(message, true);
                });
            } else {
                displayExecutionError(error);
                console.error(error);
            }
        });
    }, 10);
}



function restartFromEmergency() {

    var stopped, started;




    var ICOContradct = web3.eth.contract(ICOABI);
    var ICOHandle = ICOContradct.at($.cookie("ico"));
    setTimeout(function () {

        ICOHandle.release({
            from: adminAddress,
            gasPrice: gasPrice,
            gas: gasAmount
        }, function (error, result) {
            progressActionsBefore();
            if (!error) {
                console.log(result)
                var log = ICOHandle.StartedFromEmergency({
                    stopped: stopped
                });

                log.watch(function (error, res) {
                    var message = "ICO has been restarted from emergency.";
                    progressActionsAfter(message, true);
                });
            } else {
                displayExecutionError(error);
                console.error(error);
            }
        });
    }, 10);
}


function finalize() {

    var finalized;


    var ICOContradct = web3.eth.contract(ICOABI);
    var ICOHandle = ICOContradct.at($.cookie("ico"));
    setTimeout(function () {

        ICOHandle.finalize({
            from: adminAddress,
            gasPrice: gasPrice,
            gas: gasAmount
        }, function (error, result) {
            progressActionsBefore();
            if (!error) {
                console.log(result)
                var log = ICOHandle.Finalized({
                    success: finalized
                });

                log.watch(function (error, res) {
                    var message = "ICO has been finalized.";
                    progressActionsAfter(message, true);
                });
            } else {
                displayExecutionError(error);
                console.error(error);
            }
        });
    }, 10);
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
        $("#message-status-title").html('Executing contract..<i class="fa fa-spinner fa-spin" style="font-size:28px;color:green"></i>');
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
        message: text

    }, {
        type: type[color],
        timer: 30000,
        placement: {
            from: from,
            align: align
        }
    });
}


$(document).ready(function () {


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
        finalize();
    });


    $("#save").click(function () {

        progressActionsBefore();


        var account = $("#beneficiary-account").val();
        var publicTokenName = $("#public-token-name").val();
        var tokenSymbol = $("#token-symbol").val();
        var tokenVersion = $("#token-version").val();
        var initialSupply = $("#initial-supply").val();
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
        var thirddBonus = $("#third-bonus").val();

        $.post(host + "compile_deploy", {
                initialSupply: initialSupply,
                tokenName: publicTokenName,
                decimalUnits: decimalUnits,
                tokenSymbol: tokenSymbol,
                tokenVersion: tokenVersion,
                multisigETH: multisigETH,
                tokensForTeam: tokensForTeam,
                minContributionETH: minContributionETH,
                maxCap: maxCap,
                minCap: minCap,
                tokenPriceWei: tokenPriceWei,
                campaignDurationDays: campaignDurationDays,
                firstPeriod: firstPeriod,
                secondPeriod: secondPeriod,
                thirdPeriod: thirdPeriod,
                firstBonus: firstBonus,
                secondBonus: secondBonus,
                thirddBonus: thirddBonus,
                ownerAddress: adminAddress
            },
            function (data, status) {

                if (data != "" && status == "success") {
                    var myObj = JSON.parse(data);

                    myObj.tokenAddress;
                    myObj.crowdsaleAddress

                    /**  $("#result").html("Token contract has been deployed at this address: <a href=http://ropsten.etherscan.io/address/" +
                          myObj.tokenAddress + ">http://ropsten.etherscan.io/address/" + myObj.tokenAddress + "</a><br>" +
                          "Crowdsale contract has been deployed at this address: <a href=http://ropsten.etherscan.io/address/" +
                          myObj.crowdsaleAddress + ">http://ropsten.etherscan.io/address/" + myObj.crowdsaleAddress + "</a>");*/

                    $.cookie("token", myObj.tokenAddress);
                    $.cookie("ico", myObj.crowdsaleAddress);

                    var message = "Token contract has been deployed at this address: <a href=http://ropsten.etherscan.io/address/" +
                        myObj.tokenAddress + ">http://ropsten.etherscan.io/address/" + myObj.tokenAddress + "</a><br>" +
                        "Crowdsale contract has been deployed at this address: <a href=http://ropsten.etherscan.io/address/" +
                        myObj.crowdsaleAddress + ">http://ropsten.etherscan.io/address/" + myObj.crowdsaleAddress + "</a>"

                    progressActionsAfter(message, true);

                }
            });

    });

});