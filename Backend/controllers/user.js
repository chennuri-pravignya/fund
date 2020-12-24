const db = require("../models");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
require("dotenv").config();

// Default admin for development stage
db.User.find().exec(function (err, results) {
  var count = results.length;

  if (count == 0) {
    bcrypt.genSalt(10, (err, salt) => {
      if (err)
        return res
          .status(400)
          .json({ message: "Something went wrong, try again" });
      bcrypt.hash("abc", salt, (err, hash) => {
        if (err)
          return res
            .status(400)
            .json({ message: "Something went wrong, try again" });

        const user = new db.User({
          email: "imt_2018109@iiitm.ac.in",
          password: hash,
          isVerified: true,
        });

        user.save();
      });
    });
  }
});

// Validating email address and domain
function validateEmail(email) {
  var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  if (re.test(email)) {
    //Email valid. Procees to test if it's from the right domain (Second argument is to check that the string ENDS with this domain, and that it doesn't just contain it)
    if (
      email.indexOf("@iiitm.ac.in", email.length - "@iiitm.ac.in".length) !== -1
    ) {
      //VALID
      console.log("VALID");
      return true;
    }
  }
  return false;
}

const addAdmin = (req, res) => {
  const userData = req.body;
  /* Validating Sign up Form */
  if (!userData.email || !userData.password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  //check for existing user account
  db.User.findOne({ email: userData.email }, (err, foundUser) => {
    if (err) return res.status(400).json({ message: "Bad request, try again" });

    if (!validateEmail(userData.email))
      return res.status(400).json({
        message: "You can only add admins having email of iiitm.ac.in domain",
      });

    //return error if account already exist
    if (foundUser)
      return res.status(400).json({
        message: "Email is already been registered.",
      });

    //if doesn't exist, we generate hash Salt ( make the password hard to crack)
    bcrypt.genSalt(10, (err, salt) => {
      if (err)
        return res
          .status(400)
          .json({ message: "Something went wrong, try again" });
      bcrypt.hash(userData.password, salt, (err, hash) => {
        if (err)
          return res
            .status(400)
            .json({ message: "Something went wrong, try again" });

        const { email, password } = req.body;
        const newUser = {
          email: email,
          password: hash,
        };

        db.User.create(newUser, (err, createdUser) => {
          if (err)
            return res.status(400).json({
              message: "Bad Request, Please try again",
              err: err.errmsg,
            });

          // generate token and save
          const token = new db.Token({
            _userId: createdUser._id,
            token: crypto.randomBytes(16).toString("hex"),
          });

          token.save(function (err) {
            if (err) {
              return res.status(500).send({ msg: err.message });
            }

            var smtpTransport = nodemailer.createTransport({
              service: "Gmail",
              auth: {
                user: process.env.GMAIL_ID,
                pass: process.env.GMAIL_PASSWORD,
              },
            });

            var mailOptions = {
              to: createdUser.email,
              subject: "Account Verification Link",
              text:
                "Please verify your account by clicking the link: \nhttp://" +
                req.headers.host +
                "/api/user/confirmation/" +
                createdUser.email +
                "/" +
                token.token +
                "\n\nThank You!\n",
            };

            smtpTransport.sendMail(mailOptions, function (err) {
              if (err) {
                console.log(err);
                return res.status(500).send({
                  msg:
                    "Technical Issue!, Please click on resend to verify your email.",
                });
              }
              return res
                .status(200)
                .send(
                  "A verification email has been sent to " +
                    createdUser.email +
                    ". It will expire after one day. If you haven't received the verification email, click on Resend Link button."
                );
            });
          });
        });
      });
    });
  });
};

const verify = (req, res) => {
  db.Token.findOne({ token: req.params.token }, function (err, token) {
    // token is not found into database i.e. token may have expired
    if (!token) {
      return res.status(400).send({
        msg:
          "Your verification link may have expired. Please click on resend to verify your Email.",
      });
    }
    // if token is found then check valid user
    else {
      db.User.findOne(
        { _id: token._userId, email: req.params.email },
        function (err, user) {
          // not valid user
          if (!user) {
            return res.status(401).send({
              msg:
                "We were unable to find a user for this verification. Please SignUp!",
            });
          }
          // user is already verified
          else if (user.isVerified) {
            return res
              .status(200)
              .send("User has been already verified. Please Login");
          }
          // verify user
          else {
            // change isVerified to true
            user.isVerified = true;
            user.save(function (err) {
              // error occur
              if (err) {
                return res.status(500).send({ msg: err.message });
              }
              // account successfully verified
              else {
                return res
                  .status(200)
                  .send("Your account has been successfully verified");
              }
            });
          }
        }
      );
    }
  });
};

const resend = (req, res) => {
  db.User.findOne({ email: req.body.email }, function (err, user) {
    // user is not found into database
    if (!user) {
      return res.status(400).send({
        msg:
          "We were unable to find a user with that email. Make sure your email is correct!",
      });
    }
    // user has been already verified
    else if (user.isVerified) {
      return res
        .status(200)
        .send("This account has been already verified. Please log in.");
    }
    // send verification link
    else {
      // generate token and save
      const token = new db.Token({
        _userId: user._id,
        token: crypto.randomBytes(16).toString("hex"),
      });
      token.save(function (err) {
        if (err) {
          return res.status(500).send({ msg: err.message });
        }

        var smtpTransport = nodemailer.createTransport({
          service: "Gmail",
          auth: {
            user: process.env.GMAIL_ID,
            pass: process.env.GMAIL_PASSWORD,
          },
        });

        var mailOptions = {
          from: "no-reply@example.com",
          to: user.email,
          subject: "Account Verification Link",
          text:
            "Please verify your account by clicking the link: \nhttp://" +
            req.headers.host +
            "/api/user/confirmation/" +
            user.email +
            "/" +
            token.token +
            "\n\nThank You!\n",
        };

        smtpTransport.sendMail(mailOptions, function (err) {
          if (err) {
            return res.status(500).send({
              msg:
                "Technical Issue!, Please click on resend to verify your email.",
            });
          }
          return res
            .status(200)
            .send(
              "A verification email has been sent to " +
                user.email +
                ". It will expire after one day. If you haven't received the verification email, click on Resend Link token."
            );
        });
      });
    }
  });
};

const login = (req, res) => {
  if (!req.body.email || !req.body.password) {
    return res.status(400).json({
      status: 400,
      errors: [{ message: "Please enter both your email and password" }],
    });
  }

  db.User.findOne({ email: req.body.email }, (err, foundUser) => {
    if (err)
      return res.status(500).json({
        status: 500,
        errors: [{ message: "Something went wrong. Please try again" }],
      });

    if (!validateEmail(req.body.email))
      return res.status(400).json({
        message: "Please login with email of iiitm.ac.in domain",
      });

    if (!foundUser) {
      return res.status(400).json({
        status: 400,
        errors: [
          {
            message:
              "Email address is not associated with any account. Please check and try again",
          },
        ],
      });
    }

    // check user is verified or not
    if (!foundUser.isVerified) {
      return res.status(401).send({
        msg: "Your Email has not been verified. Please click on resend",
      });
    }

    bcrypt.compare(req.body.password, foundUser.password, (err, isMatch) => {
      if (err)
        return res.status(500).json({
          status: 500,
          errors: [{ message: "Something went wrong. Please try again" }],
        });

      if (isMatch) {
        /* jwt */
        jwt.sign(
          { foo: foundUser._id },
          `${process.env.JWT_SECRET}`,
          { expiresIn: "10h" },
          (err, jwt) => {
            if (err)
              return res.status(500).json({
                status: 503,
                errors: [{ message: "access forbidden" }],
              });
            res.status(200).json({ jwt, userId: foundUser._id });
          }
        );
      } else {
        return res.json({
          status: 400,
          errors: [{ message: "Password is not correct." }],
        });
      }
    });
  });
};

const create = async (req, res) => {
  // const user = req.curUserId;
  const campaign = { ...req.body, raised: 0 };
  console.log(campaign);

  if (!campaign.title || !campaign.description) {
    return res.status(400).json({ message: "All fields are required" });
  }
  if (campaign.required <= 0) {
    return res.status(400).json({
      message: "The required amount cannot be equal to or smaller than 0",
    });
  }

  try {
    const newCampaign = await db.Campaign.create(campaign);

    console.log("newCampaign", newCampaign);
    res.status(200).json(newCampaign);
  } catch (err) {
    return res.status(500).json({
      message: "Something went wrong when creating a new campaign",
      err: err,
    });
  }
};

const options = {
  // Return the document after updates are applied
  new: true,
  // Create a document if one isn't found. Required
  // for `setDefaultsOnInsert`
  upsert: true,
  setDefaultsOnInsert: true,
};

const update = async (req, res) => {
  try {
    let updatedCampaign = await db.Campaign.findByIdAndUpdate(
      req.params.id,
      req.body,
      options
    );
    console.log(updatedCampaign);
    res.status(200).json(updatedCampaign);
  } catch (err) {
    return res.status(500).json({
      message: "Something went wrong while updating campaign",
      err: err,
    });
  }
};

module.exports = {
  addAdmin,
  verify,
  resend,
  login,
  create,
  update,
};
