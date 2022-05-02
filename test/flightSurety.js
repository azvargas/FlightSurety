
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');
var FlightSuretyApp = artifacts.require("FlightSuretyApp");
var FlightSuretyData = artifacts.require("FlightSuretyData");

contract('Flight Surety Tests', async (accounts) => {

  var config;
  before('setup contract', async () => {
    config = await Test.Config(accounts);
    await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address);
  });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

  it(`(multiparty) has correct initial isOperational() value`, async function () {

    // Get operating status
    let status = await config.flightSuretyData.isOperational.call();
    assert.equal(status, true, "Incorrect initial operating status value");

  });

  it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {

      // Ensure that access is denied for non-Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, true, "Access not restricted to Contract Owner");
            
  });

  it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {

      // Ensure that access is allowed for Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false);
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, false, "Access not restricted to Contract Owner");
      
  });

  it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {

      await config.flightSuretyData.setOperatingStatus(false);

      let reverted = false;
      try 
      {
          await config.flightSurety.setTestingMode(true);
      }
      catch(e) {
          reverted = true;
      }
      assert.equal(reverted, true, "Access not blocked for requireIsOperational");      

      // Set it back for other tests to work
      await config.flightSuretyData.setOperatingStatus(true);

  });

  it('(airline) first airline is registered when deployed', async () => {
    // ACT
    let result = await config.flightSuretyData.isAirline.call(config.firstAirline);

    // ASSERT
    assert.equal(result, true, "First airline should be registered when the contract is deployed");
  });

  it('(airline) cannot register an Airline using registerAirline() if it is not funded', async () => {
    
    // ARRANGE
    let newAirline = accounts[2];

    // ACT
    try {
        await config.flightSuretyApp.registerAirline(newAirline, {from: config.firstAirline});
    }
    catch(e) {

    }
    let result = await config.flightSuretyData.isAirline.call(newAirline); 

    // ASSERT
    assert.equal(result, false, "Airline should not be able to register another airline if it hasn't provided funding");

  });
 
    it('(airline) Only existing airline may register a new airline until there are at least four airline registered', async () => {
        let newAirline2 = accounts[2];
        let newAirline3 = accounts[3];
        let newAirline4 = accounts[4];
        let newAirline5 = accounts[5];

        let fundAmount = new BigNumber(web3.utils.toWei("10", "ether"));

        // First airline send fund amount and add a new airline
        try {
            await config.flightSuretyData.fund({from: config.firstAirline, value: fundAmount});
            await config.flightSuretyApp.registerAirline(newAirline2, {from: config.firstAirline});
        }
        catch(e) {
            
        }
        let resultNewAirline2 = await config.flightSuretyData.isAirline.call(newAirline2);

        // Second airline send fund amount and add a new airline
        try {
            await config.flightSuretyData.fund({from: newAirline2, value: fundAmount});
            await config.flightSuretyApp.registerAirline(newAirline3, {from: newAirline2});
        }
        catch(e) {

        }
        let resultNewAirline3 = await config.flightSuretyData.isAirline.call(newAirline3);

        // Third airline send fund amount and add a new airline
        try {
            await config.flightSuretyData.fund({from: newAirline3, value: fundAmount});
            await config.flightSuretyApp.registerAirline(newAirline4, {from: newAirline3});
        }
        catch(e) {

        }
        let resultNewAirline4 = await config.flightSuretyData.isAirline.call(newAirline4);

        // Fourth airline send fund amount and add a new airline
        try {
            await config.flightSuretyData.fund({from: newAirline4, value: fundAmount});
            await config.flightSuretyApp.registerAirline(newAirline5, {from: newAirline4});
        }
        catch(e) {

        }
        let resultNewAirline5 = await config.flightSuretyData.isAirline.call(newAirline5);

        assert.equal(resultNewAirline2, true, "The second airline could be registered by the first one");
        assert.equal(resultNewAirline3, true, "The third airline could be registered by the second one");
        assert.equal(resultNewAirline4, true, "The fourth airline could be registered by the third one");
        assert.equal(resultNewAirline5, false, "Fourth airline cannot register a fifth airline");
    });

    it("(airline) Registration of fifth and subsecuent airlines requires multi-party consensus of 50% of registered airlines", async () => {
        // ARRANGE
        let airline2 = accounts[2]; // Already registered at the last test
        let airline3 = accounts[3]; // Already registered at the last test
        let airline4 = accounts[4]; // Already registered at the last test
        let newAirline5 = accounts[5];  // Already has 1 vote from the fourth airline at the last test
        let newAirline6 = accounts[6];  // Brand new airline;

        // ACT
        // Airline 4 has already voted; the vote does not count
        try {
            await config.flightSuretyApp.registerAirline(newAirline5, {from: airline4});
        }
        catch(e) {

        }
        let resultAfterFirstVote = await config.flightSuretyData.isAirline.call(newAirline5);

        // Airline 5 requires 2 votes
        try {
            await config.flightSuretyApp.registerAirline(newAirline5, {from: airline3});
        }
        catch(e) {

        }
        let resultAfterSecondVote = await config.flightSuretyData.isAirline.call(newAirline5);

        // Airline 6 requires 3 votes;
        await config.flightSuretyApp.registerAirline(newAirline6, {from: airline2});
        let resultAfterFirstTwoVotes = await config.flightSuretyData.isAirline.call(newAirline6);
        await config.flightSuretyApp.registerAirline(newAirline6, {from: airline3});
        resultAfterFirstTwoVotes = resultAfterFirstTwoVotes && await config.flightSuretyData.isAirline.call(newAirline6);
        await config.flightSuretyApp.registerAirline(newAirline6, {from: airline4});
        let resultAirline6 = await config.flightSuretyData.isAirline.call(newAirline6);

        // ASSERT
        assert.equal(resultAfterFirstVote, false, "The fifth airline could not be registered");
        assert.equal(resultAfterSecondVote, true, "The fifth airline could be registered");
        assert.equal(resultAfterFirstTwoVotes, false, "The sixth airline could not be registered with two votes");
        assert.equal(resultAirline6, true, "The sixth airline could be registered");
    });

    it('(airline) Airline can register flight', async () => {
        let airline1 = accounts[1];
        let flightNumber = "VIV4006";
        let timestamp = 1638871200;

        try {
            await config.flightSuretyApp.registerFlight(flightNumber, timestamp, {from: airline1});
        } 
        catch(e) {
            
        }

        let flightRegistered = await config.flightSuretyApp.isFlightRegistered(airline1, flightNumber, timestamp);

        assert.equal(flightRegistered, true, "The flight could be registered");
    });

    it('(passenger) Passenger can buy insurance', async () => {
        let airline1 = accounts[1];
        let passengerAddress = accounts[7];
        let flightNumber = "VIV4006";   // Previously registered flight
        let timestamp = 1638871200;
        let price = new BigNumber(web3.utils.toWei("1", "ether"));

        var eventEmitted = false;
        config.flightSuretyApp.InsuranceBought({}, function(err, res) {
            eventEmitted = true;
        });

        await config.flightSuretyApp.buyInsurance(airline1, flightNumber, timestamp, {from: passengerAddress, value: price});

        assert.equal(eventEmitted, true, "Insurance could be bought");
    });

});
