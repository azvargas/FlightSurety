
import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';


(async() => {

    const STATUS_CODE_ON_TIME = "10";
    const STATUS_CODE_LATE_AIRLINE = "20";
    const STATUS_CODE_LATE_WEATHER = "30";
    const STATUS_CODE_LATE_TECHNICAL = "40";
    const STATUS_CODE_LATE_OTHER = "50";
    
    let result = null;

    let contract = new Contract('localhost', () => {

        // Read transaction
        contract.isOperational((error, result) => {
            console.log(error,result);
            display('Operational Status', 'Check if contract is operational', [ { label: 'Operational Status', error: error, value: result} ]);
        });
    
        // Register to the FlightStatusInfo event
        contract.flightSuretyApp.events.FlightStatusInfo({fromblock: 0},
            function(error, event) {
                var values = event.returnValues;
                var statusFlight;
                switch(values.status)
                {
                    case STATUS_CODE_ON_TIME:
                        statusFlight = "On time";
                        break;
                    case STATUS_CODE_LATE_AIRLINE:
                        statusFlight = "Late airline";
                        break;
                    case STATUS_CODE_LATE_WEATHER:
                        statusFlight = "Late weather";
                        break;
                    case STATUS_CODE_LATE_TECHNICAL:
                        statusFlight = "Late technical";
                        break;
                    case STATUS_CODE_LATE_OTHER:
                        statusFlight = "Late other";
                        break;
                    default:
                        statusFlight = "Undefined";
                }
                display('Flight Status Info', 'Status info returned by oracles', [{label: 'Flight status', error: error, value: statusFlight}]);
            });

        // User-submitted transaction
        var oracleButton = DOM.elid('submit-oracle');
        if(oracleButton != null) {
           DOM.elid('submit-oracle').addEventListener('click', () => {
                let airline = DOM.elid('airline-address').value.trim();
                let flight = DOM.elid('flight-number').value;
                // Write transaction
                contract.fetchFlightStatus(airline, flight, (error, result) => {
                    display('Oracles', 'Trigger oracles', [ { label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp} ]);
                });
            })
        }

        // Buy insurance button
        var buyInsuranceButton = DOM.elid("buy-insurance");
        if(buyInsuranceButton != null) {
            buyInsuranceButton.addEventListener('click', () => {
                let airline = DOM.elid('airline-address').value.trim();
                let flightNumber = DOM.elid('flight-number').value.trim();
                let amount = DOM.elid('amount-insurance').value.trim();
                contract.buyInsurance(airline, flightNumber, amount, (error, result) => {
                    display('Buy insurance', 'Attempt to buy insurance', [{ label: 'Tx status', error: error, value: result}]);
                });
            });
        }

        // Credit insurees button
        var creditInsureeButton = DOM.elid("credit-insuree");
        if(creditInsureeButton != null) {
            creditInsureeButton.addEventListener('click', () => {
                contract.creditInsurees((error, result) => {
                    display('Credit Insuree', 'Check if the insuree has amount', [{ label: 'Tx status:', error: error, value: result}]);
                });
            });
        }

        var insurancePayoutButton = DOM.elid("insurance-payout");
        if(insurancePayoutButton != null) {
            insurancePayoutButton.addEventListener('click', () => {
                contract.insurancePayout((error, result) => {
                    display('Insurance Payout', 'Pay the insurance amount', [{ label: 'Tx status', error: error, value: result}]);
                });
            });
        }

        // Display airlines addresses
        let infoDiv = DOM.elid("display-info");
        infoDiv.appendChild(DOM.div("Airline 1: " + contract.airlines[0] + " - Flights: VIV4006, VIV4120, VIV1126"));
        infoDiv.appendChild(DOM.div("Airline 2: " + contract.airlines[1] + " - Flights: VOI576, VOI229, VOI875"));

        contract.web3.eth.getStorageAt(contract.config.dataAddress)
    });
    

})();


function display(title, description, results) {
    let displayDiv = DOM.elid("display-wrapper");
    let section = DOM.section();
    section.appendChild(DOM.h2(title));
    section.appendChild(DOM.h5(description));
    results.map((result) => {
        let row = section.appendChild(DOM.div({className:'row'}));
        row.appendChild(DOM.div({className: 'col-sm-4 field'}, result.label));
        row.appendChild(DOM.div({className: 'col-sm-8 field-value'}, result.error ? String(result.error) : String(result.value)));
        section.appendChild(row);
    })
    displayDiv.append(section);

}







