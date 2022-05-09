import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';

export default class Contract {
    constructor(network, callback) {

        let config = Config[network];
        //this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
        this.web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
        //this.web3 = this.initweb3(callback);
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
        this.initialize(callback);
        this.owner = null;
        this.airlines = [];
        this.passengers = [];
        this.timeStamp = 1638871200;
    }

    initweb3(callback) {
        /// Find or Inject Web3 Provider
        /// Modern dapp browsers...
        var web3Provider;

        if (window.ethereum) {
            web3Provider = window.ethereum;
            try {
                // Request account access
                window.ethereum.enable();
            } catch (error) {
                // User denied account access...
                console.error("User denied account access")
            }
        }
        // Legacy dapp browsers...
        else if (window.web3) {
            web3Provider = window.web3.currentProvider;
        }
        // If no injected web3 instance is detected, fall back to Ganache
        else {
            web3Provider = new Web3.providers.HttpProvider(Config.url);
        }

        return new Web3(web3Provider);
    }

    initialize(callback) {
        let self = this;
        self.web3.eth.getAccounts((error, accts) => {
           
            self.owner = accts[0];

            let counter = 1;
            
            while(self.airlines.length < 5) {
                self.airlines.push(accts[counter++]);
            }

            while(self.passengers.length < 5) {
                self.passengers.push(accts[counter++]);
            }

            callback();
        });
    }

    isOperational(callback) {
       let self = this;
       self.flightSuretyApp.methods
            .isOperational()
            .call({from: self.owner}, callback);
    }

    fetchFlightStatus(p_airline, p_flight, callback) {
        let self = this;
        let payload = {
            airline: p_airline,
            flight: p_flight,
            timestamp: self.timeStamp
        } 
        self.flightSuretyApp.methods
            .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
            .send({from: self.owner}, (error, result) => {
                callback(error, payload);
            });
    }

    buyInsurance(airline, flightNumber, price, callback) {
        let self = this;
        let payload = {
            airline: airline,
            flightNumber: flightNumber,
            timestamp: self.timeStamp
        }
        let amount = Web3.utils.toWei(price, "ether");
        self.flightSuretyApp.methods
            .buyInsurance(payload.airline, payload.flightNumber, payload.timestamp)
            .send({from:self.passengers[0], value:amount, gas:"999999"}, (error, result) => {
                callback(error, result);
            });
    }

    creditInsurees(callback) {
        let self = this;
        self.flightSuretyApp.methods
            .creditInsurees().send({from:self.passengers[0], gas:"999999"}, (error, result) => {
                callback(error, result);
            });
    }

    insurancePayout(callback) {
        let self = this;
        self.flightSuretyApp.methods
            .insurancePayout().send({from:self.passengers[0], gas:"999999"}, (error, result) => {
                callback(error, result);
            });
    }
}