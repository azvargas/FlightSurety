const FlightSuretyApp = artifacts.require("FlightSuretyApp");
const FlightSuretyData = artifacts.require("FlightSuretyData");
var BigNumber = require('bignumber.js');
const fs = require('fs');

module.exports = function(deployer, network, accounts) {

    let firstAirline = accounts[1];
    let secondAirline = accounts[2];
    let timestampFlight = 1638871200;
    var flightSuretyData, flightSuretyApp;

    deployer.deploy(FlightSuretyData, firstAirline)
    .then(() => {
        return FlightSuretyData.deployed();
    }).then((instance) => {
        flightSuretyData = instance;
        let dataContractAddress = FlightSuretyData.address;
        return deployer.deploy(FlightSuretyApp, dataContractAddress)
                .then(() => {
                    return FlightSuretyApp.deployed();
                }).then((instance) => {
                    flightSuretyApp = instance;
                    
                    // Setup data contract
                    // Authorize caller
                    flightSuretyData.authorizeCaller(FlightSuretyApp.address);
                    
                    // Register and fund airlines
                    let fundAmount = new BigNumber(web3.utils.toWei("10", "ether"));
                    flightSuretyData.fund({from: firstAirline, value: fundAmount});
                    flightSuretyApp.registerAirline(secondAirline, {from: firstAirline});
                    flightSuretyData.fund({from: secondAirline, value: fundAmount});
        
                    // Register 6 flights
                    flightSuretyApp.registerFlight("VIV4006", timestampFlight, {from: firstAirline});
                    flightSuretyApp.registerFlight("VIV4120", timestampFlight, {from: firstAirline});
                    flightSuretyApp.registerFlight("VIV1126", timestampFlight, {from: firstAirline});
                    flightSuretyApp.registerFlight("VOI576", timestampFlight, {from: secondAirline});
                    flightSuretyApp.registerFlight("VOI229", timestampFlight, {from: secondAirline});
                    flightSuretyApp.registerFlight("VOI875", timestampFlight, {from: secondAirline});

                    let price = new BigNumber(web3.utils.toWei("1", "ether"));
                    flightSuretyApp.buyInsurance(firstAirline, "VIV4006", timestampFlight, {from: accounts[7], value: price});

                    let config = {
                        localhost: {
                            url: 'http://localhost:7545',
                            dataAddress: FlightSuretyData.address,
                            appAddress: FlightSuretyApp.address
                        }
                    }
                    fs.writeFileSync(__dirname + '/../src/dapp/config.json',JSON.stringify(config, null, '\t'), 'utf-8');
                    fs.writeFileSync(__dirname + '/../src/server/config.json',JSON.stringify(config, null, '\t'), 'utf-8');
                });
    });
}