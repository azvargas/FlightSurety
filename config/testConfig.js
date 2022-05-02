
var FlightSuretyApp = artifacts.require("FlightSuretyApp");
var FlightSuretyData = artifacts.require("FlightSuretyData");
var BigNumber = require('bignumber.js');

var Config = async function(accounts) {
    
    // These test addresses are useful when you need to add
    // multiple users in test scripts
    let testAddresses = [
        "0x3B5a9c1d994e584e48eeF0410278F7e94C4A67e3",
        "0xBE2a1C87c96067737EDd950a27902F50A2A44030",
        "0x2650CEEDC13a4D1e2D5AE9Df5Dfdaa54fB12c983",
        "0x1A1E8c55F607AD3Ea8e4Ec426937C23EC1D39209",
        "0x65E4dF8090Ed5C60AE119398c16Fbc75CA840Ed1",
        "0x950209De7D1E527fa587959E540f20bad459f428",
        "0xaD966176e931215674a81628A376da5c7A26e73D",
        "0xC59528D154a3378c672829ef544519996CE8A1E4",
        "0xAe69aDa3d97878748FFEb72de2eaCDBFF6eD0Bb3"
    ];


    let owner = accounts[0];
    let firstAirline = accounts[1];

    let flightSuretyData = await FlightSuretyData.new(firstAirline);
    let flightSuretyApp = await FlightSuretyApp.new(flightSuretyData.address);

    
    return {
        owner: owner,
        firstAirline: firstAirline,
        weiMultiple: (new BigNumber(10)).pow(18),
        testAddresses: testAddresses,
        flightSuretyData: flightSuretyData,
        flightSuretyApp: flightSuretyApp
    }
}

module.exports = {
    Config: Config
};