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

    event StoppedInEmergency(bool stopped);
    event StartedFromEmergency(bool started);

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


/*****
    * @title The Crowd Sale Contract
    */
contract TokenSale is Ownable {
    using SafeMath for uint256;
    // Instance of the Real Token
    Token public token;
    // Received funds are transferred to the beneficiary
    address public beneficiary;
    // Number of Tokens/ETH in PreSale
    uint256 public tokenPerEthPreSale;
    // Number of Tokens/ETH in ICO
    uint256 public tokenPerEthICO_1;
    uint256 public tokenPerEthICO_2;
    uint256 public tokenPerEthICO_3;
    uint256 public tokenPerEthICO_4;
    // Start Timestamp of Pre Sale
    uint256 public presaleStartTimestamp;
    // End Timestamp of Pre Sale
    uint256 public presaleEndTimestamp;
    // Start Timestamp for the ICO
    uint256 public icoStartTimestamp_1;
    uint256 public icoStartTimestamp_2;
    uint256 public icoStartTimestamp_3;
    uint256 public icoStartTimestamp_4;
    // End Timestamp for the ICO
    uint256 public icoEndTimestamp_1;
    uint256 public icoEndTimestamp_2;
    uint256 public icoEndTimestamp_3;
    uint256 public icoEndTimestamp_4;
    // Amount of tokens available for sale in Pre Sale Period
    uint256 public presaleTokenLimit;
    // Amount of tokens available for sale in ICO Period
    uint256 public icoTokenLimit_1;
    uint256 public icoTokenLimit_2;
    uint256 public icoTokenLimit_3;
    uint256 public icoTokenLimit_4;
    // Total Tokens Sold in Pre Sale Period
    uint256 public presaleTokenRaised;
    // Total Tokens Sold in ICO Period
    uint256 public icoTokenRaised_1;
    uint256 public icoTokenRaised_2;
    uint256 public icoTokenRaised_3;
    uint256 public icoTokenRaised_4;
    // Max Cap for Pre Sale
    uint256 public presaleMaxEthCap;
    // Min Cap for ICO
    uint256 public icoMinEthCap_1;
    uint256 public icoMinEthCap_2;
    uint256 public icoMinEthCap_3;
    uint256 public icoMinEthCap_4;
    // Max Cap for ICO
    uint256 public icoMaxEthCap_1;
    uint256 public icoMaxEthCap_2;
    uint256 public icoMaxEthCap_3;
    uint256 public icoMaxEthCap_4;
    // Different number of Investors
    uint256 public investorCount;
    /*****
        * State machine
        *   - Unknown:      Default Initial State of the Contract
        *   - Preparing:    All contract initialization calls
        *   - PreSale:      We are into PreSale Period
        *   - ICO:          The real Sale of Tokens, after Pre Sale
        *   - Success:      Minimum funding goal reached
        *   - Failure:      Minimum funding goal not reached
        *   - Finalized:    The ICO has been concluded
        *   - Refunding:    Refunds are loaded on the contract for reclaim.
        */
    enum State{Unknown, Preparing, PreSale, ICO_1, ICO_2, ICO_3, ICO_4, Success, Failure, PresaleFinalized, ICO1Finalized, ICO2Finalized, ICO3Finalized, ICO4Finalized}
    State public crowdSaleState;
    /*****
        * @dev Modifier to check that amount transferred is not 0
        */
    modifier nonZero() {
        require(msg.value != 0);
        _;
    }
    /*****
        * @dev The constructor function to initialize the token related properties
        * @param _token             address     Specifies the address of the Token Contract
        * @param _presaleRate       uint256     Specifies the amount of tokens that can be bought per ETH during Pre Sale
        * @param _icoRate           uint256     Specifies the amount of tokens that can be bought per ETH during ICO
        * @param _presaleStartTime  uint256     Specifies the Start Date of the Pre Sale
        * @param _presaleDays       uint256     Specifies the duration of the Pre Sale
        * @param _icoStartTime      uint256     Specifies the Start Date for the ICO
        * @param _icoDays           uint256     Specifies the duration of the ICO
        * @param _maxPreSaleEthCap  uint256     Maximum amount of ETHs to raise in Pre Sale
        * @param _minICOEthCap      uint256     Minimum amount of ETHs to raise in ICO
        * @param _maxICOEthCap      uint256     Maximum amount of ETHs to raise in ICO
        */
    function TokenSale(
        address _token,
        uint256 _presaleRate,
        uint256 _icoRate_1,
        uint256 _icoRate_2,
        uint256 _icoRate_3,
        uint256 _icoRate_4,
        uint256 _presaleStartTime,
        uint256 _presaleDays,
        uint256 _icoStartTime_1,
        uint256 _icoStartTime_2,
        uint256 _icoStartTime_3,
        uint256 _icoStartTime_4,
        uint256 _icoDays_1,
        uint256 _icoDays_2,
        uint256 _icoDays_3,
        uint256 _icoDays_4,
        uint256 _maxPreSaleEthCap,
        uint256 _minICOEthCap_1,
        uint256 _minICOEthCap_2,
        uint256 _minICOEthCap_3,
        uint256 _minICOEthCap_4,
        uint256 _maxICOEthCap_1,
        uint256 _maxICOEthCap_2,
        uint256 _maxICOEthCap_3,
        uint256 _maxICOEthCap_4){
            require(_token != address(0));
            require(_presaleRate != 0);
            require(_icoRate_1 != 0);
            require(_icoRate_2 != 0);
            require(_icoRate_3 != 0);
            require(_icoRate_4 != 0);
            require(_presaleStartTime > now);
            require(_icoStartTime_1 > _presaleStartTime);
            require(_icoStartTime_2 > _icoStartTime_1);
            require(_icoStartTime_3 > _icoStartTime_2);
            require(_icoStartTime_4 > _icoStartTime_3);
            require(_minICOEthCap_1 <= _maxICOEthCap_1);
            require(_minICOEthCap_2 <= _maxICOEthCap_2);
            require(_minICOEthCap_3 <= _maxICOEthCap_3);
            require(_minICOEthCap_4 <= _maxICOEthCap_4);
            token = Token(_token);
            tokenPerEthPreSale = _presaleRate;
            tokenPerEthICO_1 = _icoRate_1;
            tokenPerEthICO_2 = _icoRate_2;
            tokenPerEthICO_3 = _icoRate_3;
            tokenPerEthICO_4 = _icoRate_4;
            presaleStartTimestamp = _presaleStartTime;
            presaleEndTimestamp = presaleEndTimestamp + _presaleDays * 1 days;
            icoStartTimestamp_1 = _icoStartTime_1;
            icoStartTimestamp_2 = _icoStartTime_2;
            icoStartTimestamp_3 = _icoStartTime_3;
            icoStartTimestamp_4 = _icoStartTime_4;
            icoEndTimestamp_1 = _icoStartTime_1 + _icoDays * 1 days;
            icoEndTimestamp_2 = _icoStartTime_2 + _icoDays * 1 days;
            icoEndTimestamp_3 = _icoStartTime_3 + _icoDays * 1 days;
            icoEndTimestamp_4 = _icoStartTime_4 + _icoDays * 1 days;
            presaleMaxEthCap = _maxPreSaleEthCap;
            icoMinEthCap_1 = _minICOEthCap_1;
            icoMinEthCap_2 = _minICOEthCap_2;
            icoMinEthCap_3 = _minICOEthCap_3;
            icoMinEthCap_4 = _minICOEthCap_4;
            icoMaxEthCap_1 = _maxICOEthCap_1;
            icoMaxEthCap_2 = _maxICOEthCap_2;
            icoMaxEthCap_3 = _maxICOEthCap_3;
            icoMaxEthCap_4 = _maxICOEthCap_4;
            presaleTokenLimit = _maxPreSaleEthCap.div(_presaleRate);
            icoTokenLimit_1 = _maxICOEthCap_1.div(_icoRate_1);
            icoTokenLimit_2 = _maxICOEthCap_2.div(_icoRate_2);
            icoTokenLimit_3 = _maxICOEthCap_3.div(_icoRate_3);
            icoTokenLimit_4 = _maxICOEthCap_4.div(_icoRate_4);
            assert(token.totalSupply() >= presaleTokenLimit.add(icoTokenLimit_1));
            crowdSaleState = State.Preparing;
    }
    /*****
        * @dev Fallback Function to buy the tokens
        */
    function () nonZero payable {
        if(isPreSalePeriod()) {
            if(crowdSaleState == State.Preparing) {
                crowdSaleState = State.PreSale;
            }
            buyTokens(msg.sender, msg.value);
        } else if (isICOPeriod_1()) {
            if(crowdSaleState == State.PresaleFinalized) {
                crowdSaleState = State.ICO_1;
            }
            buyTokens(msg.sender, msg.value);
        } else if (isICOPeriod_2()) {
            if(crowdSaleState == State.ICO1Finalized) {
                crowdSaleState = State.ICO_2;
            }
            buyTokens(msg.sender, msg.value);
        } else if (isICOPeriod_3()) {
            if(crowdSaleState == State.ICO2Finalized) {
                crowdSaleState = State.ICO_3;
            }
            buyTokens(msg.sender, msg.value);
        } else if (isICOPeriod_4()) {
            if(crowdSaleState == State.ICO3Finalized) {
                crowdSaleState = State.ICO_4;
            }
            buyTokens(msg.sender, msg.value);
        } else {
            revert();
        }
    }
    /*****
        * @dev Internal function to execute the token transfer to the Recipient
        * @param _recipient     address     The address who will receives the tokens
        * @param _value         uint256     The amount invested by the recipient
        * @return success       bool        Returns true if executed successfully
        */
    function buyTokens(address _recipient, uint256 _value) internal returns (bool success) {
        uint256 boughtTokens = calculateTokens(_value);
        require(boughtTokens != 0);
        if(token.balanceOf(_recipient) == 0) {
            investorCount++;
        }
        if(isCrowdSaleStatePreSale()) {
            token.transferTokens(_recipient, boughtTokens, tokenPerEthPreSale);
            presaleTokenRaised = presaleTokenRaised.add(_value);
            return true;
        } else if (isCrowdSaleStateICO()) {
            token.transferTokens(_recipient, boughtTokens, tokenPerEthICO);
            icoTokenRaised = icoTokenRaised.add(_value);
            return true;
        }
    }
    /*****
        * @dev Calculates the number of tokens that can be bought for the amount of WEIs transferred
        * @param _amount    uint256     The amount of money invested by the investor
        * @return tokens    uint256     The number of tokens
        */
    function calculateTokens(uint256 _amount) returns (uint256 tokens){
        if(isCrowdSaleStatePreSale()) {
            tokens = _amount.mul(tokenPerEthPreSale);
        } else if (isCrowdSaleStateICO()) {
            tokens = _amount.mul(tokenPerEthICO);
        } else {
            tokens = 0;
        }
    }
    /*****
        * @dev Check the state of the Contract, if in Pre Sale
        * @return bool  Return true if the contract is in Pre Sale
        */
    function isCrowdSaleStatePreSale() constant returns (bool) {
        return crowdSaleState == State.PreSale;
    }
    /*****
        * @dev Check the state of the Contract, if in ICO
        * @return bool  Return true if the contract is in ICO
        */
    function isCrowdSaleStateICO() constant returns (bool) {
        return crowdSaleState == State.ICO;
    }
    /*****
        * @dev Check if the Pre Sale Period is still ON
        * @return bool  Return true if the contract is in Pre Sale Period
        */
    function isPreSalePeriod() constant returns (bool) {
        if(presaleTokenRaised > presaleMaxEthCap || now >= presaleEndTimestamp) {
            crowdSaleState = State.PresaleFinalized;
            return false;
        } else {
            return now > presaleStartTimestamp;
        }
    }
    /*****
        * @dev Check if the ICO is in the Sale period or not
        * @return bool  Return true if the contract is in ICO Period
        */
    function isICOPeriod_1() constant returns (bool) {
        if (icoTokenRaised_1 > icoMaxEthCap_1 || now >= icoEndTimestamp_1){
            crowdSaleState = State.ICO1Finalized;
            return false;
        } else {
            return now > icoStartTimestamp_1;
        }
    }
    function isICOPeriod_2() constant returns (bool) {
        if (icoTokenRaised_2 > icoMaxEthCap_2 || now >= icoEndTimestamp_2){
            crowdSaleState = State.ICO2Finalized;
            return false;
        } else {
            return now > icoStartTimestamp_2;
        }
    }
    function isICOPeriod_3() constant returns (bool) {
        if (icoTokenRaised_3 > icoMaxEthCap_3 || now >= icoEndTimestamp_3){
            crowdSaleState = State.ICO3Finalized;
            return false;
        } else {
            return now > icoStartTimestamp_3;
        }
    }
    function isICOPeriod_4() constant returns (bool) {
        if (icoTokenRaised_4 > icoMaxEthCap_4 || now >= icoEndTimestamp_4){
            crowdSaleState = State.ICO4Finalized;
            return false;
        } else {
            return now > icoStartTimestamp_4;
        }
    }
    /*****
        * @dev Called by the owner of the contract to close the Sale
        */
    function endCrowdSale() onlyOwner {
        require(now >= icoEndTimestamp || icoTokenRaised >= icoMaxEthCap);
        if(icoTokenRaised >= icoMinEthCap){
            crowdSaleState = State.Success;
            beneficiary.transfer(icoTokenRaised);
            beneficiary.transfer(presaleTokenRaised);
        } else {
            crowdSaleState = State.Failure;
        }
    }
    /*****
        * @dev Allow investors to take their mmoney back after a failure in ICO
        * @param _recipient     address     The caller of the function who is looking for refund
        * @return               bool        Return true, if executed successfully
        */
    function getRefund(address _recipient) returns (bool){
        require(crowdSaleState == State.Failure);
        uint256 amount = token.balanceOf(_recipient);
        require(token.refundedAmount(_recipient));
        _recipient.transfer(amount);
        return true;
    }
    /*****
        * Fetch some statistics about the ICO
        */
    /*****
        * @dev Fetch the count of different Investors
        * @return   bool    Returns the total number of different investors
        */
    function getInvestorCount() constant returns (uint256) {
        return investorCount;
    }
    /*****
        * @dev Fetch the amount raised in Pre Sale
        * @return   uint256     Returns the amount of money raised in Pre Sale
        */
    function getPresaleRaisedAmount() constant returns (uint256) {
        return presaleTokenRaised;
    }
    /*****
        * @dev Fetch the amount raised in ICO
        * @return   uint256     Returns the amount of money raised in ICO
        */
    function getICORaisedAmount() constant returns (uint256) {
        return icoTokenRaised;
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
