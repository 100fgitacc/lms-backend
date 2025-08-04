const express = require("express");
const { addWallet, getUserWallets, setPrimaryWallet, deleteWallet  } = require("../controllers/wallets");
const { auth } = require("../middleware/auth");

const router = express.Router();

router.post("/addWallet", auth, addWallet);
router.get("/getUserWallets", auth, getUserWallets);
router.post("/setPrimaryWallet", auth, setPrimaryWallet);
router.delete("/deleteWallet", auth, deleteWallet);

module.exports = router;
