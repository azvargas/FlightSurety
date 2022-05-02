
import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';


(async() => {

    let result = null;

    let contract = new Contract('localhost', () => {

        // Read transaction
        contract.isOperational((error, result) => {
            console.log(error,result);
            display('Operational Status', 'Check if contract is operational', [ { label: 'Operational Status', error: error, value: result} ]);
        });
    

        // User-submitted transaction
        var oracleButton = DOM.elid('submit-oracle');
        if(oracleButton != null) {
           DOM.elid('submit-oracle').addEventListener('click', () => {
                let flight = DOM.elid('flight-number').value;
                // Write transaction
                contract.fetchFlightStatus(flight, (error, result) => {
                    display('Oracles', 'Trigger oracles', [ { label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp} ]);
                });
            })
        }

        // Buy insurance button
        var buyInsuranceButton = DOM.elid("buy-insurance");
        if(buyInsuranceButton != null) {
            buyInsuranceButton.addEventListener('click', () => {
                let airline = DOM.elid('airline-address').value;
                let flightNumber = DOM.elid('flight-number').value;
                let amount = DOM.elid('amount-insurance').value;
                contract.buyInsurance(airline, flightNumber, amount, (error, result) => {
                    display('Buy insurance', 'Buying an insurance', [ { value: result, error: error }]);
                });
            });
        }

        // Display airlines addresses
        let infoDiv = DOM.elid("display-info");
        infoDiv.appendChild(DOM.div("Airline 1: " + contract.airlines[0] + " - Flights: VIV4006, VIV4120, VIV1126"));
        infoDiv.appendChild(DOM.div("Airline 2: " + contract.airlines[1] + " - Flights: VOI576, VOI229, VOI875"));
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







