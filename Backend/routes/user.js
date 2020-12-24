const express = require("express");
const router = express.Router();
const ctrl = require("../controllers");
const mw = require("../middleware");

router.post("/addAdmin", mw.auth.verify, ctrl.user.addAdmin);
router.get("/confirmation/:email/:token", ctrl.user.verify);
router.post("/resend", ctrl.user.resend);
router.post("/login", ctrl.user.login);
router.post("/create", mw.auth.verify, ctrl.user.create);
router.put("/:id/update", mw.auth.verify, ctrl.user.update);

module.exports = router;
