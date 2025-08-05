const { verifyMessage } = require("ethers");
const User = require("../models/user");

exports.addWallet = async (req, res) => {
  try {
    const userId = req.user.id;
    const { address, signature, message, network, name } = req.body;
    console.log(address, signature, message, network, name, userId);
    
    if (!address || !signature || !message || !network) {
      return res.status(400).json({ success: false, message: "Missing wallet data" });
    }

    const recoveredAddress = verifyMessage(message, signature);
    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      return res.status(401).json({ success: false, message: "Invalid signature" });
    }

    const walletExists = await User.findOne({
      $or: [
        { "wallets.address": address },
        { "primaryWallet.address": address }
      ]
    });

    if (walletExists && walletExists._id.toString() !== userId) {
      return res.status(409).json({ success: false, message: "This wallet already linked to another account" });
    }

    const user = await User.findById(userId);

    const isPrimary = user.primaryWallet?.address?.toLowerCase() === address.toLowerCase();
    const alreadyLinked = isPrimary || user.wallets.some(w => w.address.toLowerCase() === address.toLowerCase());

    if (alreadyLinked) {
      return res.status(409).json({ success: false, message: "Wallet already linked to your account" });
    }


    if (!alreadyLinked) {
      user.wallets.push({
        address,
        network,
        name: name || "unnamed",
        addedAt: new Date()
      });
    }

    if (!user.primaryWallet?.address) {
      user.primaryWallet = { address, network, name: name || "unnamed" };
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Wallet linked successfully",
      primaryWallet: user.primaryWallet,
      userWallets: user.wallets
    });
  } catch (err) {
    console.error("Error linking wallet:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
exports.getUserWallets = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    return res.status(200).json({
      success: true,
      primaryWallet: user.primaryWallet || null,
      wallets: user.wallets || [],
    });
  } catch (error) {
    console.error("Error getting wallets:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.setPrimaryWallet = async (req, res) => {
  try {
    const userId = req.user.id;
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({ success: false, message: "Missing wallet address" });
    }

    const user = await User.findById(userId);

    const wallet = user.wallets.find(
      (w) => w.address.toLowerCase() === address.toLowerCase()
    );

    if (!wallet) {
      return res.status(404).json({ success: false, message: "Wallet not found in user list" });
    }

    const oldPrimary = user.primaryWallet;
    user.primaryWallet = {
      address: wallet.address,
      network: wallet.network,
      name: wallet.name,
    }


    if (oldPrimary?.address) {
      const existsInList = user.wallets.some(
        (w) => w.address.toLowerCase() === oldPrimary.address.toLowerCase()
      );
      if (!existsInList) {
        user.wallets.push(oldPrimary);
      }
    }
    

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Primary wallet updated",
      primaryWallet: user.primaryWallet,
      wallets: user.wallets,
    });
  } catch (err) {
    console.error("Error setting primary wallet:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
exports.deleteWallet = async (req, res) => {
  try {
    const userId = req.user.id;
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({ success: false, message: "Missing wallet address" });
    }

    const user = await User.findById(userId);

    const lowerAddress = address.toLowerCase();

    const isPrimary = user.primaryWallet?.address?.toLowerCase() === lowerAddress;

    const beforeLength = user.wallets.length;
    user.wallets = user.wallets.filter(w => w.address.toLowerCase() !== lowerAddress);

    if (user.wallets.length === beforeLength) {
      return res.status(404).json({ success: false, message: "Wallet not found" });
    }

    if (isPrimary) {
      if (user.wallets.length > 0) {
        user.primaryWallet = {
          address: user.wallets[0].address,
          network: user.wallets[0].network,
          name: user.wallets[0].name,
        };
      } else {
        user.primaryWallet = null;
      }
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Wallet deleted successfully",
      wallets: user.wallets,
      primaryWallet: user.primaryWallet,
    });
  } catch (err) {
    console.error("Error deleting wallet:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

