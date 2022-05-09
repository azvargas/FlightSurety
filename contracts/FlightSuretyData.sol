pragma solidity ^0.4.24;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    struct AirlineProfile
    {
        bool isRegistered;
        bool isAmountFundSent;
    }

    struct Flight {
        bool isRegistered;
        address airline;
        string flightNumber;
        uint8 statusCode;
        uint256 timestamp;        
    }

    struct Insurance 
    {
        bytes32 flightKey;
        uint price;
        uint8 insuranceStatus;
        uint amountToPay;
    }

    uint256 public constant FUND_AMOUNT = 10 ether;

    uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;

    // Status for the insurances
    uint8 private constant INSURANCE_BOUGHT = 10;
    uint8 private constant INSURANCE_ACCREDITED = 20;
    uint8 private constant INSURANCE_PAYED = 30;

    address private contractOwner;                                      // Account used to deploy contract
    bool private operational = true;                                    // Blocks all state changes throughout the contract if false
    
    uint256 public airlinesCount = 0;
    uint256 private insurancesCount = 0;

    /*
    mapping(address => uint8) private authorizedContracts;
    mapping(address => AirlineProfile) private airlines;
    mapping(bytes32 => Flight) private flights;
    mapping(uint => Insurance) private insurancesSold;
    mapping(address => uint[]) private passengerInsurances;
    */

    mapping(address => uint8) authorizedContracts;
    mapping(address => AirlineProfile) airlines;
    mapping(bytes32 => Flight) flights;
    mapping(uint => Insurance) insurancesSold;
    mapping(address => uint[]) passengerInsurances;

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/


    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor
                                (
                                    address firstAirline
                                ) 
                                public 
    {
        contractOwner = msg.sender;

        // Register the first airline;
        airlines[firstAirline] = AirlineProfile({isRegistered: true, isAmountFundSent: false});
        airlinesCount = airlinesCount.add(1);
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in 
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational() 
    {
        require(operational, "D01 - Contract is currently not operational");
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "D02 - Caller is not contract owner");
        _;
    }

    modifier isCallerAuthorized()
    {
        require(authorizedContracts[msg.sender] == 1, "D03 - Caller is not an authorized contract");
        _;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */      
    function isOperational() 
                            public 
                            view 
                            returns(bool) 
    {
        return operational;
    }

    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */    
    function setOperatingStatus
                            (
                                bool mode
                            ) 
                            external
                            requireContractOwner 
    {
        operational = mode;
    }

    /**
    * @dev Authorize a contract to make calls
    *
    * 
    */      
    function authorizeCaller(address authorizedContract) requireContractOwner external
    {
        authorizedContracts[authorizedContract] = 1;
    }

    /**
    * @dev De-authorize a contract to make calls
    *
    * 
    */      
    function deauthorizeCaller(address deauthorizedContract) requireContractOwner external
    {
        delete authorizedContracts[deauthorizedContract];
    }

    /**
    * @dev Tells if an airline is registered
    *
    * @return Boolean that indicates if an airline is registered
    */      
    function isAirline (
                        address airlineToCheck
                       ) 
                       external 
                       view returns(bool)
    {
        return airlines[airlineToCheck].isRegistered;
    }

    /**
    * @dev Tells if an airline has sent its fund
    *
    * @return Boolean that indicates if an airline has sent its funds
    */      
    function hasAirlineFundedContract (
                        address airlineToCheck
                       ) 
                       external 
                       view returns(bool)
    {
        return airlines[airlineToCheck].isAmountFundSent;
    }

    function isFlightRegistered 
                            (
                                bytes32 flightKey
                            )
                            external
                            view returns(bool)
    {
        return flights[flightKey].isRegistered;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

   /**
    * @dev OK - Add an airline to the registration queue
    *      OK - Can only be called from FlightSuretyApp contract
    *
    */   
    function registerAirline
                            (
                                address newAirline
                            )
                            external
                            isCallerAuthorized
                            requireIsOperational
    {
        airlines[newAirline] = AirlineProfile({isRegistered: true, isAmountFundSent: false});
        airlinesCount = airlinesCount.add(1);
    }


    function registerFlight
                                (
                                    address airline,
                                    string flightNumber,
                                    uint256 timestamp
                                )
                                isCallerAuthorized
                                requireIsOperational
                                external
    {
        bytes32 flightKey = getFlightKey(airline, flightNumber, timestamp);
        flights[flightKey] = Flight({isRegistered: true, flightNumber: flightNumber, statusCode: 0, timestamp: timestamp, airline: airline});
    }

    function updateFlightStatus
                                (
                                    bytes32 flightKey,
                                    uint8 newStatus
                                )
                                external
                                isCallerAuthorized
                                requireIsOperational
    {
        flights[flightKey].statusCode = newStatus;
    }
    
   /**
    * @dev Buy insurance for a flight
    *
    */   
    function buy
                            (
                                address p_passenger,
                                bytes32 p_flightKey,
                                uint p_price
                            )
                            requireIsOperational
                            isCallerAuthorized
                            external
                            returns (uint insuranceId)
    {
        // Check if the passenger has bought an insurance
        bool existInsurance = false;
        uint j = 0;
        if(passengerInsurances[p_passenger].length != 0)
        {
            for(uint i = 0; i < passengerInsurances[p_passenger].length; i++)
            {
                j = passengerInsurances[p_passenger][i];
                if(insurancesSold[j].flightKey == p_flightKey)
                {
                    uint8 status = insurancesSold[j].insuranceStatus; 
                    if(status == INSURANCE_BOUGHT || status == INSURANCE_ACCREDITED)
                    {
                        existInsurance = true;
                        break;
                    }
                }
            }
        }
        else
        {
            passengerInsurances[p_passenger] = new uint[](0);
        }
        require(!existInsurance, "D04 - The passenger has already bought an insurance for that flight");
        insuranceId = ++insurancesCount; 
        Insurance storage newInsurance = insurancesSold[insuranceId];
        newInsurance.flightKey = p_flightKey;
        newInsurance.price = p_price;
        newInsurance.insuranceStatus = INSURANCE_BOUGHT;
        newInsurance.amountToPay = 0;
        passengerInsurances[p_passenger].push(insuranceId);
    }

    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsurees
                                (
                                    address p_passenger
                                )
                                external
                                requireIsOperational
                                isCallerAuthorized
                                returns(uint256 totalAmountToPay)
    {
        totalAmountToPay = 0;
        uint amountToPay = 0;
        uint j = 0;
        // Contract will iterate through insurances that has status of bought.
        if (passengerInsurances[p_passenger].length != 0)
        {
            for(uint i = 0; i < passengerInsurances[p_passenger].length; i++)
            {
                j = passengerInsurances[p_passenger][i];
                if(insurancesSold[j].insuranceStatus == INSURANCE_BOUGHT)
                {
                    // Contract will check the flight status for which the passenger bought an insurance
                    // If there is a delayed flight caused by the airline, contract will calculate the payout.
                    if(flights[insurancesSold[j].flightKey].statusCode == STATUS_CODE_LATE_AIRLINE)
                    {
                        amountToPay = insurancesSold[j].price;
                        amountToPay = amountToPay.add(amountToPay.div(2));
                        insurancesSold[j].amountToPay = amountToPay;
                        // The status of the insurance will be able to pay.
                        insurancesSold[j].insuranceStatus = INSURANCE_ACCREDITED;
                        // The contract will return total amount of insurances.
                        totalAmountToPay = totalAmountToPay.add(amountToPay);
                    }
                }
            }
        }
        return totalAmountToPay;
    }
    

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function pay
                            (
                                address p_passenger
                            )
                            external
                            isCallerAuthorized
                            requireIsOperational
                            returns(uint256)
    {
        uint amountToPay = 0;
        uint j = 0;
        if (passengerInsurances[p_passenger].length != 0)
        {
            for(uint i = 0; i < passengerInsurances[p_passenger].length; i++)
            {
                j = passengerInsurances[p_passenger][i];
                if(insurancesSold[j].insuranceStatus == INSURANCE_ACCREDITED)
                {
                    // Change status of the insurance
                    insurancesSold[j].insuranceStatus = INSURANCE_PAYED;

                    // Get the amount to be paid
                    amountToPay = amountToPay.add(insurancesSold[j].amountToPay);

                    // Change tne amount to 0
                    insurancesSold[j].amountToPay = 0;
                }
            }
            require(amountToPay > 0, 'D05 - The insuree has no balance');
            
            // Pay the amount
            p_passenger.transfer(amountToPay);
            return(amountToPay);
        }
    }

   /**
    * @dev Initial funding for the insurance. Unless there are too many delayed flights
    *      resulting in insurance payouts, the contract should be self-sustaining
    *
    */   
    function fund
                            (   
                            )
                            public
                            payable
    {
        require(msg.value == FUND_AMOUNT, 'D06 - The amount of the fund is not the correct amount');
        require(airlines[msg.sender].isRegistered, 'D07 - The airline is not registered');
        airlines[msg.sender].isAmountFundSent = true;
    }

    function getFlightKey
                        (
                            address airline,
                            string memory flight,
                            uint256 timestamp
                        )
                        pure
                        internal
                        returns(bytes32) 
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /**
    * @dev Fallback function for funding smart contract.
    *
    */
    function() 
                            external 
                            payable 
    {
        fund();
    }


}

