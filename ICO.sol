pragma solidity ^ 0.4.11;


contract SafeMath {
    function safeMul(uint a, uint b) internal returns(uint) {
        uint c = a * b;
        assert(a == 0 || c / a == b);
        return c;
    }

    function safeDiv(uint a, uint b) internal returns(uint) {
        assert(b > 0);
        
        uint c = a / b;
        assert(a == b * c + a % b);
        return c;
    }

    function safeSub(uint a, uint b) internal returns(uint) {
        assert(b <= a);
        return a - b;
    }
    
    function safeAdd(uint a, uint b) internal returns(uint) {
        uint c = a + b;
        assert(c >= a && c >= b);
        return c;
    }

}


contract ERC20 {
    uint public totalSupply;

    function balanceOf(address who) constant returns(uint);

    function allowance(address owner, address spender) constant returns(uint);

    function transfer(address to, uint value) returns(bool ok);

    function transferFrom(address from, address to, uint value) returns(bool ok);

    function approve(address spender, uint value) returns(bool ok);

    event Transfer(address indexed from, address indexed to, uint value);
    event Approval(address indexed owner, address indexed spender, uint value);
}


contract Ownable {
    address public owner;

    function Ownable() {
        owner = msg.sender;
    }

    function transferOwnership(address newOwner) onlyOwner {
        if (newOwner != address(0)) 
            owner = newOwner;
    }

    function kill() {
        if (msg.sender == owner) 
            selfdestruct(owner);
    }

    modifier onlyOwner() {
        if (msg.sender == owner)
        _;
    }
}


contract Pausable is Ownable {
    bool public stopped;

    event StoppedInEmergency(bool stoppedCampaign);
    event StartedFromEmergency(bool startedCampaign);

    modifier stopInEmergency {
        if (stopped) {
            revert();
        }
        _;
    }

    modifier onlyInEmergency {
        if (!stopped) {
            revert();
        }
        _;
    }

    // Called by the owner in emergency, triggers stopped state
    function emergencyStop() external onlyOwner {
        stopped = true;
        StoppedInEmergency(true);
    }

    // Called by the owner to end of emergency, returns to normal state
    function release() external onlyOwner onlyInEmergency {
        stopped = false;
        StartedFromEmergency(true);
    }
}



// Base contract supporting async send for pull payments.
// Inherit from this contract and use asyncSend instead of send.
contract PullPayment {
    mapping(address => uint) public payments;

    event RefundETH(address to, uint value);

    // Store sent amount as credit to be pulled, called by payer

    function asyncSend(address dest, uint amount) internal {

        payments[dest] += amount;
    }
    // TODO: check
    // Withdraw accumulated balance, called by payee
    function withdrawPayments() internal returns (bool) {
        address payee = msg.sender;
        uint payment = payments[payee];

        if (payment == 0) {
            revert();
        }

        if (this.balance < payment) {
            revert();
        }

        payments[payee] = 0;

        if (!payee.send(payment)) {
            revert();
        }
        RefundETH(payee, payment);
        return true;
    }
}


// The  token
contract Token is ERC20, SafeMath, Ownable {
    // Public variables of the token
    string public name;
    string public symbol;
    uint public decimals; // How many decimals to show.
    string public version = "v0.1";
    uint public totalSupply;
    bool public locked;
    address public crowdSaleAddress;
           


    mapping(address => uint) balances;
    mapping(address => mapping(address => uint)) allowed;
    

    // Lock transfer during the ICO
    modifier onlyUnlocked() {
        if (msg.sender != crowdSaleAddress && locked && msg.sender != owner) 
            revert();
        _;
    }

    modifier onlyAuthorized() {
        if ( msg.sender != crowdSaleAddress && msg.sender != owner) 
            revert();
        _;
    }

    // The Token constructor

     
    function Token(uint _initialSupply,
            string _tokenName,
            uint _decimalUnits,
            string _tokenSymbol,
            string _version,
            address _crowdSaleAddress) {      
        locked = true;  // Lock the transfer of tokens during the crowdsale
        totalSupply = _initialSupply * (10**_decimalUnits);     
                                        
        name = _tokenName; // Set the name for display purposes
        symbol = _tokenSymbol; // Set the symbol for display purposes
        decimals = _decimalUnits; // Amount of decimals for display purposes
        version = _version;
        crowdSaleAddress = _crowdSaleAddress;       
        balances[owner] = 100000 * (10**_decimalUnits);
        balances[crowdSaleAddress] = totalSupply - balances[owner];   
    }


    

    function resetCrowdSaleAddress(address _newCrowdSaleAddress) onlyAuthorized() {
            crowdSaleAddress = _newCrowdSaleAddress;
    }

    

    function unlock() onlyAuthorized {
        locked = false;
    }

      function lock() onlyAuthorized {
        locked = true;
    }

    function burn( address _member, uint256 _value) onlyAuthorized returns(bool) {
        balances[_member] = safeSub(balances[_member], _value);
        totalSupply = safeSub(totalSupply, _value);
        Transfer(_member, 0x0, _value);
        return true;
    }

    function transfer(address _to, uint _value) onlyUnlocked returns(bool) {
        balances[msg.sender] = safeSub(balances[msg.sender], _value);
        balances[_to] = safeAdd(balances[_to], _value);
        Transfer(msg.sender, _to, _value);
        return true;
    }

    /* A contract attempts to get the coins */
    function transferFrom(address _from, address _to, uint256 _value) onlyUnlocked returns(bool success) {
        if (balances[_from] < _value) 
            revert(); // Check if the sender has enough
        if (_value > allowed[_from][msg.sender]) 
            revert(); // Check allowance
        balances[_from] = safeSub(balances[_from], _value); // Subtract from the sender
        balances[_to] = safeAdd(balances[_to], _value); // Add the same to the recipient
        allowed[_from][msg.sender] = safeSub(allowed[_from][msg.sender], _value);
        Transfer(_from, _to, _value);
        return true;
    }

    function balanceOf(address _owner) constant returns(uint balance) {
        return balances[_owner];
    }

    function approve(address _spender, uint _value) returns(bool) {
        allowed[msg.sender][_spender] = _value;
        Approval(msg.sender, _spender, _value);
        return true;
    }


    function allowance(address _owner, address _spender) constant returns(uint remaining) {
        return allowed[_owner][_spender];
    }
}

contract Crowdsale is SafeMath {

    //FIELDS

    //CONSTANTS
    //Time limits
    uint public constant STAGE_ONE_TIME_END = 31 days;
    uint public constant STAGE_TWO_TIME_END = 28 days;
    uint public constant STAGE_THREE_TIME_END = 30 days;
    uint public constant STAGE_FOUR_TIME_END = 15 days;
    //Prices of token (USD)
    uint public constant PRICE_STAGE_ONE =750000;
    uint public constant PRICE_STAGE_TWO = 850000;
    uint public constant PRICE_STAGE_THREE = 900000;
    uint public constant PRICE_STAGE_FOUR = 1000000;
    //Token Limits
    uint public constant MAX_SUPPLY_STAGE_ONE =        5000000;
    uint public constant MAX_SUPPLY_STAGE_TWO =        5000000;
    uint public constant MAX_SUPPLY_STAGE_THREE =       10000000;
    uint public constant MAX_SUPPLY_STAGE_FOUR =        20000000;
    uint public constant ALLOC_CROWDSALE =    5000000;

    //ASSIGNED IN INITIALIZATION
    //Start and end times
    uint public publicStartTime; //Time in seconds public crowd fund starts.
    uint public publicEndTime; //Time in seconds crowdsale ends
    //Special Addresses    
    address public multisigAddress; //Address to which all ether flows.
    address public ownerAddress; //Address of the contract owner. Can halt the crowdsale.
    //Contracts
    Token public token; //External token contract hollding the token
    //Running totals
    uint public etherRaised; //Total Ether raised.
    uint public gupSold; //Total token created
    uint public btcsPortionTotal; //Total of Tokens purchased by BTC Suisse. Not to exceed BTCS_PORTION_MAX.
    //booleans
    bool public halted; //halts the crowd sale if true.

    //FUNCTION MODIFIERS

    //Is currently the crowdfund period
    modifier is_crowdfund_period() {
        if (now < publicStartTime || now >= publicEndTime) throw;
        _;
    }

    //May only be called by the owner address
    modifier only_owner() {
        if (msg.sender != ownerAddress) throw;
        _;
    }

    //May only be called if the crowdfund has not been halted
    modifier is_not_halted() {
        if (halted) throw;
        _;
    }

    // EVENTS

    event PreBuy(uint _amount);
    event Buy(address indexed _recipient, uint _amount);


    // FUNCTIONS

    //Initialization function. Deploys GUPToken contract assigns values, to all remaining fields, creates first entitlements in the GUP Token contract.
    function Crowdsale(
        address _multisig,
        uint _publicStartTime
    ) {
        ownerAddress = msg.sender;
        publicStartTime = _publicStartTime;
        publicEndTime = _publicStartTime + 134 days;
        multisigAddress = _multisig;
    }

    //May be used by owner of contract to halt crowdsale and no longer except ether.
    function toggleHalt(bool _halted)
        only_owner
    {
        halted = _halted;
    }

    //constant function returns the current GUP price.
    function getPriceRate()
        constant
        returns (uint o_rate)
    {
        if (now <= publicStartTime + STAGE_ONE_TIME_END) return PRICE_STAGE_ONE;
        if (now <= publicStartTime + STAGE_TWO_TIME_END) return PRICE_STAGE_TWO;
        if (now <= publicStartTime + STAGE_THREE_TIME_END) return PRICE_STAGE_THREE;
        if (now <= publicStartTime + STAGE_FOUR_TIME_END) return PRICE_STAGE_FOUR;
        else return 0;
    }

    // Given the rate of a purchase and the remaining tokens in this tranche, it
    // will throw if the sale would take it past the limit of the tranche.
    // It executes the purchase for the appropriate amount of tokens, which
    // involves adding it to the total, minting GUP tokens and stashing the
    // ether.
    // Returns `amount` in scope as the number of GUP tokens that it will
    // purchase.
    function processPurchase(uint _rate, uint _remaining)
        internal
        returns (uint o_amount)
    {
        o_amount = safeDiv(safeMul(msg.value, _rate), 1 ether);
        if (o_amount > _remaining) throw;
        if (!multisigAddress.send(msg.value)) throw;
        gupSold += o_amount;
    }

    //Default function called by sending Ether to this address with no arguments.
    //Results in creation of new GUP Tokens if transaction would not exceed hard limit of GUP Token.
    function()
        payable
        is_crowdfund_period
        is_not_halted
    {
        uint amount = processPurchase(getPriceRate(), ALLOC_CROWDSALE - gupSold);
        Buy(msg.sender, amount);
    }

    //failsafe drain
    function drain()
        only_owner
    {
        if (!ownerAddress.send(this.balance)) throw;
    }
}
