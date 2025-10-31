const walletModal = document.getElementById("walletModal");
const openBtn = document.getElementById("openWalletModal");
const closeBtn = document.getElementById("closeWalletModal");
const chooseMetaMask = document.getElementById("chooseMetaMask");
const chooseWalletConnect = document.getElementById("chooseWalletConnect");
const dashboard = document.getElementById("dashboard");
const buyBtn = document.getElementById("buyBtn");

let walletConnected = false;

// Step 1: Open wallet chooser modal
openBtn.onclick = () => {
  walletModal.classList.add("open");
};

// Step 2: Close modal manually
closeBtn.onclick = () => {
  walletModal.classList.remove("open");
};

// Step 3a: Handle MetaMask connection
chooseMetaMask.onclick = async () => {
  walletModal.classList.remove("open");

  if (window.ethereum) {
    try {
      await window.ethereum.request({ method: "eth_requestAccounts" });
      walletConnected = true;
      dashboard.style.display = "block";
      console.log("MetaMask connected");
    } catch (err) {
      console.error("MetaMask connection failed", err);
    }
  } else {
    alert("MetaMask not detected");
  }
};

// Step 3b: Handle WalletConnect (placeholder)
chooseWalletConnect.onclick = () => {
  walletModal.classList.remove("open");
  alert("WalletConnect integration coming soon...");
  // TODO: Add WalletConnect provider logic here
};

// Step 4: Buy button logic
buyBtn.onclick = () => {
  if (!walletConnected) {
    alert("Please connect your wallet first.");
    return;
  }
  alert("Burger Bucks purchased!");
  // Add token purchase logic here
};