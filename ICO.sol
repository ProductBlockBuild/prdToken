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
    uint tokensForTeam; // tokens for the team
    uint public ETHReceived; // Number of ETH received
    uint public tokensSentToETH; // Number of tokens sent to ETH contributors
    uint public startBlock; // Crowdsale start block
    uint public endBlock; // Crowdsale end block
    uint public maxCap; // Maximum number of token to sell
    uint public minCap; // Minimum number of ETH to raise
    uint public minContributionETH; // Minimum amount to invest
    bool public crowdsaleClosed; // Is crowdsale still on going
    uint public tokenPriceWei;
    uint public campaignDurationDays; // campaign duration in days 
    uint firstPeriod; 
    uint secondPeriod; 
    uint thirdPeriod; 
    uint firstBonus; 
    uint secondBonus;
    uint thirdBonus;
    uint public multiplier;
    uint public status;

    
   
    // Looping through Backer
    mapping(address => Backer) public backers; //backer list
    address[] public backersIndex ;   // to be able to itarate through backers when distributing the tokens


    // @notice to verify if action is not performed out of the campaing range
    modifier respectTimeFrame() {
        if ((block.number < startBlock) || (block.number > endBlock)) 
            revert();
        _;
    }

    modifier minCapNotReached() {
        if (tokensSentToETH >= minCap) 
            revert();
        _;
    }

    // Events
    event ReceivedETH(address backer, uint amount, uint tokenAmount);
    event Started(uint startBlock, uint endBlock);
    event Finalized(bool success);
    event ContractUpdated(bool done);

    // Crowdsale  {constructor}
    // @notice fired when contract is crated. Initilizes all constnat variables.

    function Crowdsale(uint _decimalPoints,
                        address _multisigETH,
                        uint _toekensForTeam, 
                        uint _minContributionETH,
                        uint _maxCap, 
                        uint _minCap, 
                        uint _tokenPriceWei, 
                        uint _campaignDurationDays,
                        uint _firstPeriod, 
                        uint _secondPeriod, 
                        uint _thirdPeriod, 
                        uint _firstBonus, 
                        uint _secondBonus,
                        uint _thirdBonus) {
    
        multiplier = 10**_decimalPoints;
        multisigETH = _multisigETH; //TODO: Replace address with correct one
        tokensForTeam = _toekensForTeam * multiplier;
        minContributionETH = _minContributionETH; // 0.1 eth
        startBlock = 0; // ICO start block
        endBlock = 0; // ICO end block
        maxCap = _maxCap * multiplier;
        tokenPriceWei = _tokenPriceWei;
        minCap = _minCap * multiplier;
        campaignDurationDays = _campaignDurationDays;
        firstPeriod = _firstPeriod; 
        secondPeriod = _secondPeriod; 
        thirdPeriod = _thirdPeriod;
        firstBonus = _firstBonus;
        secondBonus = _secondBonus;
        thirdBonus = _thirdBonus; 
        tokensSentToETH = 0;
        //TODO replace this address below with correct addrss.
        commissionAddress = 0x6C88e6C76C1Eb3b130612D5686BE9c0A0C78925B;
    }

    // @notice Specify address of token contract
    // @param _tokenAddress {address} address of token contract
    // @return res {bool}

    function updateTokenAddress(Token _tokenAddress) external onlyOwner() returns(bool res) {
        token = _tokenAddress;
        ContractUpdated(true);
        return true;    
    }

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
}
