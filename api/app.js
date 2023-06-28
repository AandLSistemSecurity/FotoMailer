const express = require('express');
const app = express();
const cors = require("cors");
const nodemailer = require('nodemailer');
require('dotenv').config();
const request = require('request')
const Joi = require('joi');

app.use(express.json());
app.use(express.static("public"));
app.use(cors());

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        type: 'OAuth2',
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD,
        clientId: process.env.OAUTH_CLIENTID,
        clientSecret: process.env.OAUTH_CLIENT_SECRET,
        refreshToken: process.env.OAUTH_REFRESH_TOKEN
    }
})


function validateClient(req, res, next) {
    const schema = Joi.object({
        name: Joi.string().required(),
        email: Joi.string().email().required(),
        company: Joi.string(),
        phone: Joi.number().required(),
        city: Joi.string().required(),
        state: Joi.string().required(),
        address: Joi.string().required(),
        budget: Joi.number().required(),
        term: Joi.string().required(),
        message: Joi.string(),
        captcha: Joi.string().required()
    })

    const validateInput = (input) => schema.validate(input);

    const { error } = validateInput(req.body);
    if (error) {
        res.status(400).json({
            status: error.details[0].message,
        })
    } else {
        next();
    }
}

function generateHtml(data) {
    return `
    <div style="border:1px solid black;max-width:fit-content;text-align:center;padding: 1rem">
    <h1 style="padding-bottom: 0.5rem;border-bottom:1px solid black;">Oferta ${data.name}</h1>
    <div style="display:flex;flex-flow:row wrap;gap: 5rem">
        <table>
            <tr>
                <td>Nume:</td>
                <td>${data.name}</td>
            </tr>
            <tr>
                <td>Email:</td>
                <td>${data.email}</td>
            </tr>
            <tr>
                <td>Telefon:</td>
                <td>${data.phone}</td>
            </tr>
            <tr>
                <td>Companie:</td>
                <td>${data.company}</td>
            </tr>
        </table>
        <table>
            <tr>
                <td>Adresa:</td>
                <td>${data.address}</td>
            </tr>
            <tr>
                <td>Localitate:</td>
                <td>${data.city}</td>
            </tr>
            <tr>
                <td>Judet:</td>
                <td>${data.state}</td>
            </tr>
            <tr>
                <td>Budget:</td>
                <td>${data.budget} lei</td>
            </tr>
            <tr>
                <td>Termen:</td>
                <td>${data.term}</td>
            </tr>
        </table>
    </div>
    <div>
        <h2>Alte detalii:</h2>
        <p>${data.message}</p>
    </div>
</div>
`
}


async function sendMail(data) {
    let mailHTML = generateHtml(data);
    let mailOptions = {
        from: data.email,
        to: "aandlcmsadmin@proton.me",
        subject: `Oferta estimativa ${data.email}`,
        html: mailHTML
    }
    const info = await transporter.sendMail(mailOptions);
    console.log("Message sent: %s", info.messageId);
    console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
}

app.post("/send", validateClient, async (req, response) => {

    const secretKey = process.env.CAPTCHA_KEY

    const verifyUrl = `https://google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${req.body.captcha}&remoteip=${req.connection.remoteAddress}`

    request(verifyUrl, (err, res, body) => {
        const data = req.body;
        if (body.success == false) {
            return response.status(401).json({
                msg: 'Failed'
            })
        } else {
            sendMail(data).catch((err) => {
                console.log(err);
            });
            return response.status(200).json({
                status: "success",
            })
        }
    })

})

module.exports = app;
