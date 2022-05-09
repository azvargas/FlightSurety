pragma solidity ^0.4.24;

// It's important to avoid vulnerabilities due to numeric overflow bugs
// OpenZeppelin's SafeMath library, when used correctly, protects agains such bugs
// More info: https://www.nccgroup.trust/us/about-us/newsroom-and-events/blog/2018/november/smart-contract-insecurity-bad-arithmetic/

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

/************************************************** */
/* Interface for Smart Contract data                */
/************************************************** */
contract FlightSuretyData {
    uint256 public airlinesCount;
    function isOperational() public view returns(bool);
    function numAirlines() external view returns(uint256);
    function registerAirline(address newAirline) external;
    function isAirline (address airlineToCheck) external view returns(bool);
    function hasAirlineFundedContract (address airlineToCheck) external view returns(bool);
    function isFlightRegistered (bytes32 flightKey) external view returns(bool);
    function registerFlight(address airline, string flightNumber, uint256 timestamp) external;
    function updateFlightStatus(bytes32 flightKey, uint8 newStatus) external;
    function buy(address passenger, bytes32 flightKey, uint price) external returns(uint);
    function creditInsurees(address p_passenger) external returns(uint256 totalAmountToPay);
    function pay(address p_passenger) external returns(uint256);
}

/************************************************** */
/* FlightSurety Smart Contract                      */
/************************************************** */
contract FlightSuretyApp {
    using SafeMath for uint256; // Allow SafeMath functions to be called for all uint256 types (similar to "prototype" in Javascript)

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    // Flight status codees
    uint8 private constant STATUS_CODE_UNKNOWN = 0;
    uint8 private constant STATUS_CODE_ON_TIME = 10;
    uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
    uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
    uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
    uint8 private constant STATUS_CODE_LATE_OTHER = 50;

    uint public constant INSURANCE_AMOUNT = 1 ether;

    FlightSuretyData dataContract;

    address private contractOwner;          // Account used to deploy contract

    mapping(address => address[]) private newAirlineVotes;

    event InsuranceBought(uint InsuranceId);

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
         // Modify to call data contract's status
        require(dataContract.isOperational(), "Contract is currently not operational");  
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    /********************************************************************************************/
    /*                                       CONSTRUCTOR                                        */
    /********************************************************************************************/

    /**
    * @dev Contract constructor
    *
    */
    constructor
                                (
                                    address dataContractAddress
                                ) 
                                public 
    {
        contractOwner = msg.sender;
        dataContract = FlightSuretyData(dataContractAddress);
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    function isOperational() 
                            public 
                            view
                            returns(bool) 
    {
        return dataContract.isOperational();  // Modify to call data contract's status
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

  
   /**
    * @dev Add an airline to the registration queue
    *
    */   
    function registerAirline
                            (
                                address newAirline
                            )
                            external
                            requireIsOperational
                            returns(bool success, uint256 votes)
    {
        // Check if the caller is an existing airline
        require(dataContract.isAirline(msg.sender), "The caller is not a registered airline");
        require(dataContract.hasAirlineFundedContract(msg.sender), "The airline has not fund the contract");

        // Check how many airlines do we have
        uint256 countAirlines = dataContract.airlinesCount();

        // If there are less than 5 airlines add the new airline
        if(countAirlines < 4)
        {
            dataContract.registerAirline(newAirline);
        }
        else
        {
            bool hasVoted = false;

            // If there are 4 airlines the consensus must be of 50%
            // Check if the airline has voted before
            if (newAirlineVotes[newAirline].length != 0)
            {
                for(uint i = 0; i < newAirlineVotes[newAirline].length; i++)
                {
                    if(newAirlineVotes[newAirline][i] == msg.sender)
                    {
                        hasVoted = true;
                        break;
                    }
                }

                require(!hasVoted, "Cannot vote more than one time");
            }
            else
            {
                newAirlineVotes[newAirline] = new address[](0);
            }
            // If not, add a new vote to the proposed airline
            newAirlineVotes[newAirline].push(msg.sender);

            // If the consensus is reached, add the airline
            votes = newAirlineVotes[newAirline].length;
            uint256 votesNeeded = countAirlines.div(2);
            if (votes == votesNeeded)
            {
                dataContract.registerAirline(newAirline);
                success = true;
                delete newAirlineVotes[newAirline];
            }
        }

        return (success, votes);
    }


   /**
    * @dev Register a future flight for insuring.
    *
    */  
    function registerFlight
                                (
                                    string flightNumber,
                                    uint256 timestamp
                                )
                                requireIsOperational
                                external
    {
        // Only a registered arline can register its flights
        require(dataContract.isAirline(msg.sender), "The caller is not a registered airline");

        // if the airline has not funded the contract cannot register a flight
        require(dataContract.hasAirlineFundedContract(msg.sender), "The airline has not fund the contract");

        dataContract.registerFlight(msg.sender, flightNumber, timestamp);
    }
    
    function isFlightRegistered
                                (
                                    address airline,
                                    string flightNumber,
                                    uint256 timestamp
                                )
                                requireIsOperational
                                external
                                view returns(bool)
    {
        bytes32 flightKey = getFlightKey(airline, flightNumber, timestamp);
        return dataContract.isFlightRegistered(flightKey);
    }

    function buyInsurance
                            (
                                address airline,
                                string flightNumber,
                                uint256 timestamp
                            )
                            requireIsOperational
                            external
                            payable
    {
        require(msg.value <= INSURANCE_AMOUNT, "The insurance amount should be less or equal than 1 ether");
        bytes32 flightKey = getFlightKey(airline, flightNumber, timestamp);
        require(dataContract.isFlightRegistered(flightKey), "The flight is not registered");
        uint amount = msg.value;
        uint InsuranceId = dataContract.buy(msg.sender, flightKey, amount);
        airline.transfer(amount);
        emit InsuranceBought(InsuranceId);
    }

   /**
    * @dev Function to check if there are insurances elegible for payment
    *
    */  
    function creditInsurees
                                (

                                )
                                external 
                                requireIsOperational
                                returns(uint256 totalAmountToPay)
    {
        totalAmountToPay = dataContract.creditInsurees(msg.sender);
        return totalAmountToPay;
    }


   /**
    * @dev Function to payout the amount to insurees
    *
    */  
    function insurancePayout
                                (

                                )
                                external 
                                requireIsOperational
                                returns(uint256 amountPayed)
    {
        amountPayed = dataContract.pay(msg.sender);
    }


   /**
    * @dev Called after oracle has updated flight status
    *
    */  
    function processFlightStatus
                                (
                                    address airline,
                                    string memory flight,
                                    uint256 timestamp,
                                    uint8 statusCode
                                )
                                internal
    {
        bytes32 flightKey = getFlightKey(airline, flight, timestamp);
        dataContract.updateFlightStatus(flightKey, statusCode);
    }


    // Generate a request for oracles to fetch flight information
    function fetchFlightStatus
                        (
                            address airline,
                            string flight,
                            uint256 timestamp                            
                        )
                        external
    {
        uint8 index = getRandomIndex(msg.sender);

        // Generate a unique key for storing the request
        bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp));
        oracleResponses[key] = ResponseInfo({
                                                requester: msg.sender,
                                                isOpen: true
                                            });

        emit OracleRequest(index, airline, flight, timestamp);
    } 


// region ORACLE MANAGEMENT

    // Incremented to add pseudo-randomness at various points
    uint8 private nonce = 0;    

    // Fee to be paid when registering oracle
    uint256 public constant REGISTRATION_FEE = 1 ether;

    // Number of oracles that must respond for valid status
    uint256 private constant MIN_RESPONSES = 3;


    struct Oracle {
        bool isRegistered;
        uint8[3] indexes;        
    }

    // Track all registered oracles
    mapping(address => Oracle) private oracles;

    // Model for responses from oracles
    struct ResponseInfo {
        address requester;                              // Account that requested status
        bool isOpen;                                    // If open, oracle responses are accepted
        mapping(uint8 => address[]) responses;          // Mapping key is the status code reported
                                                        // This lets us group responses and identify
                                                        // the response that majority of the oracles
    }

    // Track all oracle responses
    // Key = hash(index, flight, timestamp)
    mapping(bytes32 => ResponseInfo) private oracleResponses;

    // Event fired each time an oracle submits a response
    event FlightStatusInfo(address airline, string flight, uint256 timestamp, uint8 status);

    event OracleReport(address airline, string flight, uint256 timestamp, uint8 status);

    // Event fired when flight status request is submitted
    // Oracles track this and if they have a matching index
    // they fetch data and submit a response
    event OracleRequest(uint8 index, address airline, string flight, uint256 timestamp);


    // Register an oracle with the contract
    function registerOracle
                            (
                            )
                            external
                            payable
    {
        // Require registration fee
        require(msg.value >= REGISTRATION_FEE, "Registration fee is required");

        uint8[3] memory indexes = generateIndexes(msg.sender);

        oracles[msg.sender] = Oracle({
                                        isRegistered: true,
                                        indexes: indexes
                                    });
    }

    function getMyIndexes
                            (
                            )
                            view
                            external
                            returns(address, uint8[3])
    {
        require(oracles[msg.sender].isRegistered, "Not registered as an oracle");

        return (msg.sender, oracles[msg.sender].indexes);
    }




    // Called by oracle when a response is available to an outstanding request
    // For the response to be accepted, there must be a pending request that is open
    // and matches one of the three Indexes randomly assigned to the oracle at the
    // time of registration (i.e. uninvited oracles are not welcome)
    function submitOracleResponse
                        (
                            uint8 index,
                            address airline,
                            string flight,
                            uint256 timestamp,
                            uint8 statusCode
                        )
                        external
    {
        require((oracles[msg.sender].indexes[0] == index) || (oracles[msg.sender].indexes[1] == index) || (oracles[msg.sender].indexes[2] == index), "Index does not match oracle request");


        bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp)); 
        require(oracleResponses[key].isOpen, "Flight or timestamp do not match oracle request");

        oracleResponses[key].responses[statusCode].push(msg.sender);

        // Information isn't considered verified until at least MIN_RESPONSES
        // oracles respond with the *** same *** information
        emit OracleReport(airline, flight, timestamp, statusCode);
        if (oracleResponses[key].responses[statusCode].length >= MIN_RESPONSES) {

            emit FlightStatusInfo(airline, flight, timestamp, statusCode);

            // Handle flight status as appropriate
            processFlightStatus(airline, flight, timestamp, statusCode);
        }
    }

    function getFlightKey
                        (
                            address airline,
                            string flight,
                            uint256 timestamp
                        )
                        pure
                        internal
                        returns(bytes32) 
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    // Returns array of three non-duplicating integers from 0-9
    function generateIndexes
                            (                       
                                address account         
                            )
                            internal
                            returns(uint8[3])
    {
        uint8[3] memory indexes;
        indexes[0] = getRandomIndex(account);
        
        indexes[1] = indexes[0];
        while(indexes[1] == indexes[0]) {
            indexes[1] = getRandomIndex(account);
        }

        indexes[2] = indexes[1];
        while((indexes[2] == indexes[0]) || (indexes[2] == indexes[1])) {
            indexes[2] = getRandomIndex(account);
        }

        return indexes;
    }

    // Returns array of three non-duplicating integers from 0-9
    function getRandomIndex
                            (
                                address account
                            )
                            internal
                            returns (uint8)
    {
        uint8 maxValue = 10;

        // Pseudo random number...the incrementing nonce adds variation
        uint8 random = uint8(uint256(keccak256(abi.encodePacked(blockhash(block.number - nonce++), account))) % maxValue);

        if (nonce > 250) {
            nonce = 0;  // Can only fetch blockhashes for last 256 blocks so we adapt
        }

        return random;
    }

// endregion

}   
