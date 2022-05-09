import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';
import express from 'express';

let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
web3.eth.defaultAccount = web3.eth.accounts[0];
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);

// Account 0 is the owner account
// Accounts 1-5 are airline accounts
// Accounts 6-10 are passengers account
// Accounts 11-30 are oracle accounts
const FIRST_ORACLE = 11;
const LAST_ORACLE = 30;

const STATUS_CODE_ON_TIME = 10;
const STATUS_CODE_LATE_AIRLINE = 20;
const STATUS_CODE_LATE_WEATHER = 30;
const STATUS_CODE_LATE_TECHNICAL = 40;
const STATUS_CODE_LATE_OTHER = 50;

var amountRegistration = web3.utils.toWei("1", "ether");
//var listAccounts;
var oracles = new Array();

// Register oracles
web3.eth.getAccounts()
  .then(function(accounts) {
    if(accounts)
    {
      for(var i = FIRST_ORACLE; i <= LAST_ORACLE; i++) 
      {
        flightSuretyApp.methods.registerOracle()
          .send({from:accounts[i], value:amountRegistration, gas:"9999999"})
          .then(function(receipt) {
            console.log("Oracle " + receipt.from + " registered with Tx " + receipt.transactionHash);
            flightSuretyApp.methods.getMyIndexes()
            .call({from:receipt.from})
            .then(function(result) {
              console.log("Indices gotten for oracle " + result[0] + ":" + result[1]);
              var oracleInfo = {
                address: result[0],
                indices: result[1]
              };
              oracles.push(oracleInfo);
            });
          });
      }
      //listAccounts = accounts;
    } 
    else 
    {
      console.log("Accounts not retrieved");
    }
  });

flightSuretyApp.events.OracleRequest({
    fromBlock: 0
  }, function (error, event) {
    // Get the index of the flight
    
    var indexRequested = event.returnValues[0];
    var airline = event.returnValues[1];
    var flight = event.returnValues[2];
    var timeStamp = event.returnValues[3];
    console.log("Request received. Preparing status for flight " + flight + " with index " + indexRequested);
    console.log("Oracles registered:" + oracles.length);

    // Iterate through the oracles
    //for(var i = FIRST_ORACLE; i <= LAST_ORACLE; i++) {
    for(var i = 0; i < oracles.length; i++) {
      //console.log("Getting indices for oracle " + listAccounts[i]);
      //flightSuretyApp.methods.getMyIndexes()
      //  .call({from:listAccounts[i]})
      //  .then(function(result) {
          var currentOracle = oracles[i].address;
          var oracleIndices = oracles[i].indices;
          console.log("Indices gotten for oracle " + currentOracle + ":" + oracleIndices);

          // If the current oracle has the index...
          if(indexRequested == oracleIndices[0] || indexRequested == oracleIndices[1] || indexRequested == oracleIndices[2])
          {
            console.log("Generating status from oracle " + currentOracle);
            // Generate a random status.
            var statusSent;
            var r = Math.random();
            var numStatus = Math.floor((r * 4) + 1);
            console.log("Number generated " + numStatus);
            switch(numStatus) {
              case 1: 
                statusSent = STATUS_CODE_ON_TIME;
                break;
              case 2: 
                statusSent = STATUS_CODE_LATE_AIRLINE;
                break;
              case 3: 
                statusSent = STATUS_CODE_LATE_WEATHER;
                break;
              case 4: 
                statusSent = STATUS_CODE_LATE_TECHNICAL;
                break;
              case 5: 
                statusSent = STATUS_CODE_LATE_OTHER;
                break;
            }
    
            // Send the status to the contract
            console.log("Sending status " + statusSent);
            flightSuretyApp.methods.submitOracleResponse(indexRequested, airline, flight, timeStamp, statusSent)
              .send({from:currentOracle, gas:"9999999"})
              .then(function(result) {
                console.log("Status registered");
              });
          }
    
        //});
    }

    // if (error) console.log(error)
    // console.log(event)
});

const app = express();
app.get('/api', (req, res) => {
    res.send({
      message: 'An API for use with your Dapp!'
    })
})

export default app;


