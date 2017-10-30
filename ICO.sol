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


// Crowdsale Smart Contract
// This smart contract collects ETH and in return sends  tokens to the Backers
contract Crowdsale is SafeMath, Pausable, PullPayment {

    struct Backer {
        uint weiReceived; // amount of ETH contributed
        uint tokensSent; // amount of tokens  sent
    }

    Token public token; // Token contract reference   
    address public multisigETH; // Multisig contract that will receive the ETH
    address public commissionAddress;  // address to deposit commissions

    uint public ethReceived; // Number of ETH received
    uint public totalTokensSent; // Number of tokens sent to ETH contributors
    uint public startBlock1;
    uint public endBlock1;
    uint public startBlock2;
    uint public endBlock2;
    uint public startBlock3;
    uint public endBlock3;
    uint public startBlock4;
    uint public endBlock4;

    uint public minContribution1; 
    uint public minContribution2; 
    uint public minContribution3; 
    uint public minContribution4;     
    uint public maxContribution1;
    uint public maxContribution2;
    uint public maxContribution3;
    uint public maxContribution4;
    bool public crowdsaleClosed; // Is crowdsale still on going
    uint public tokenPriceUSD1;
    uint public tokenPriceUSD2;
    uint public tokenPriceUSD3;
    uint public tokenPriceUSD4;
    uint public campaignDurationDays1; 
    uint public campaignDurationDays2; 
    uint public campaignDurationDays3; 
    uint public campaignDurationDays4;
    uint public multiplier;
    uint public status;
   
    // Looping through Backer
    mapping(address => Backer) public backers; //backer list
    address[] public backersIndex ;   // to be able to itarate through backers when distributing the tokens


    // Events
    event ReceivedETH(address backer, uint amount, uint tokenAmount);
    event Started(uint startBlockLog, uint endBlockLog);
    event Finalized(bool success);
    event ContractUpdated(bool done);

    // Crowdsale  {constructor}
    // @notice fired when contract is crated. Initilizes all constnat variables.

    function Crowdsale(uint _decimalPoints,
                        address _multisigETH,
                        uint _minContribution1,
                        uint _minContribution2,
                        uint _minContribution3,
                        uint _minContribution4,
                        uint _maxContribution1,
                        uint _maxContribution2,
                        uint _maxContribution3,
                        uint _maxContribution4,
                        uint _tokenPriceUSD1, 
                        uint _tokenPriceUSD2, 
                        uint _tokenPriceUSD3, 
                        uint _tokenPriceUSD4, 
                        uint _campaignDurationDays1) {
    
        multiplier = 10**_decimalPoints;
        multisigETH = _multisigETH; //TODO: Replace address with correct one
        minContribution1 = _minContribution1; 
        minContribution2 = _minContribution2; 
        minContribution3 = _minContribution3; 
        minContribution4 = _minContribution4; 
        maxContribution1 = _maxContribution1;
        maxContribution2 = _maxContribution2;
        maxContribution3 = _maxContribution3;
        maxContribution4 = _maxContribution4;
        tokenPriceUSD1 = _tokenPriceUSD1;
        tokenPriceUSD2 = _tokenPriceUSD2;
        tokenPriceUSD3 = _tokenPriceUSD3;
        tokenPriceUSD4 = _tokenPriceUSD4;
        campaignDurationDays1 = _campaignDurationDays1;
        campaignDurationDays2 = 28;
        campaignDurationDays3 = 30;
        campaignDurationDays4 = 15;
        totalTokensSent = 0;
        //TODO replace this address below with correct addrss.
        commissionAddress = 0xCE5cddb37CE300efBaC9b4010885794EF343Abe8;
    }

    // @notice Specify address of token contract
    // @param _tokenAddress {address} address of token contract
    // @return res {bool}

    function updateTokenAddress(Token _tokenAddress) external onlyOwner() returns(bool res) {
        token = _tokenAddress;
        ContractUpdated(true);
        return true;    
    }

      // @notice to populate website with status of the sale 
    // function returnWebsiteData()constant returns(uint, uint, uint, uint, uint, uint, uint, uint, uint, uint, bool, bool) {
    
    //     return (startBlock, endBlock, numberOfBackers(), ethReceived, maxCap, minCap, totalTokensSent,  tokenPriceWei, minContributionETH, maxContributionETH, stopped, crowdsaleClosed);
    // }

    function determineCommissions() public constant returns (uint) {
     
        if (this.balance <= 500 ether )
            return (this.balance * 10)/100;
        else if (this.balance <= 1000 ether)
            return (this.balance * 8)/100;
        else if (this.balance < 10000 ether )
            return (this.balance * 6)/100; 
        else 
            return (this.balance * 6)/100;
    }


    // @notice return number of contributors
    // @return  {uint} number of contributors

    function numberOfBackers()constant returns (uint) {
        return backersIndex.length;
    }

    // {fallback function}
    // @notice It will call internal function which handels allocation of Ether and calculates tokens.
    function () payable {  
        contribute(msg.sender);
    }

    // @notice It will be called by owner to start the sale    
    function start() onlyOwner() {
        startBlock1 = block.number;
        startBlock2 = startBlock1 + (4*60*24*(campaignDurationDays1));
        startBlock3 = startBlock2 + (4*60*24*(campaignDurationDays2));
        startBlock4 = startBlock3 + (4*60*24*(campaignDurationDays3));
        endBlock4 = startBlock4 + (4*60*24*(campaignDurationDays4));
        crowdsaleClosed = false;
        Started(startBlock1, endBlock4);
    }

    // @notice It will be called by fallback function whenever ether is sent to it
    // @param  _backer {address} address of beneficiary
    // @return res {bool} true if transaction was successful
    function contribute(address _backer) internal stopInEmergency returns(bool res) {


        uint tokensToSend = calculateNoOfTokensToSend(); // calculate number of tokens

        Backer storage backer = backers[_backer];

         if ( backer.weiReceived == 0)
             backersIndex.push(_backer);

        if (!token.transfer(_backer, tokensToSend)) 
            revert(); // Transfer tokens to contributor
        backer.tokensSent = safeAdd(backer.tokensSent, tokensToSend);
        backer.weiReceived = safeAdd(backer.weiReceived, msg.value);
        ethReceived = safeAdd(ethReceived, msg.value); // Update the total Ether recived
        totalTokensSent = safeAdd(totalTokensSent, tokensToSend);

       
        

        ReceivedETH(_backer, msg.value, tokensToSend); // Register event
        return true;
    }

    // @notice This function will return number of tokens based on time intervals in the campaign
     function calculateNoOfTokensToSend() constant internal returns (uint) {

        uint tokenAmount = safeMul(msg.value, multiplier);
        

        if (block.number <= startBlock2 )  
            return  tokenAmount + safeDiv(tokenAmount, tokenPriceUSD1);
        else if (block.number <= startBlock3)
            return  tokenAmount + safeDiv(tokenAmount, tokenPriceUSD2); 
        else if (block.number <= startBlock4) 
                return  tokenAmount + safeDiv(tokenAmount, tokenPriceUSD3);        
        else         
            return  tokenAmount + safeDiv(tokenAmount, tokenPriceUSD4);
    } 

  
    // @notice This function will finalize the sale.
    // It will only execute if predetermined sale time passed or all tokens are sold.
    function finalize() onlyOwner() {

        if (crowdsaleClosed) 
            revert();

        //TODO uncomment this for live
        //uint daysToRefund = 4*60*24*15;
        uint daysToRefund = 3;  

        // if (block.number < endBlock && totalTokensSent < maxCap - 100 ) 
        // revert();   // - 100 is used to allow closing of the campaing when contribution is near 
                    // finished as exact amount of maxCap might be not feasible e.g. you can't easily buy few tokens. 
                    // when min contribution is 0.1 Eth.  

        // if (totalTokensSent < minCap && block.number < safeAdd(endBlock, daysToRefund)) 
        //     revert();   

        //if (totalTokensSent > minCap) {

            if (!commissionAddress.send(determineCommissions()))
                revert();
            if (!multisigETH.send(this.balance)) 
            revert();  // transfer balance to multisig wallet
            if (!token.transfer(owner, token.balanceOf(this))) 
            revert(); // transfer tokens to admin account or multisig wallet                                
            token.unlock();    // release lock from transfering tokens. 
        // }else {
        //     if (!token.burn(this, token.balanceOf(this))) 
        //     revert();  // burn all the tokens remaining in the contract                      
        // }

        crowdsaleClosed = true;
        Finalized(true);
        
    }



    // TODO do we want this here?
    // @notice Failsafe drain
    function drain() onlyOwner() {
        if (!owner.send(this.balance)) 
            revert();
    }

    // @notice Prepare refund of the backer if minimum is not reached
    // burn the tokens
    function prepareRefund()  internal returns (bool) {
        uint value = backers[msg.sender].tokensSent;

        if (value == 0) 
            revert();           
        if (!token.burn(msg.sender, value)) 
            revert();
        uint ethToSend = backers[msg.sender].weiReceived;
        backers[msg.sender].weiReceived = 0;
        backers[msg.sender].tokensSent = 0;
        if (ethToSend > 0) {
            asyncSend(msg.sender, ethToSend);
            return true;
        } else 

            return false;
        
    }

    // @notice refund the backer
    function refund() public returns (bool) {

        if (!prepareRefund()) 
            revert();
        if (!withdrawPayments()) 
            revert();
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
