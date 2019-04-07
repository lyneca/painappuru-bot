const Discord = require('discord.js');
const admin = require("firebase-admin");

admin.initializeApp({
    credential: admin.credential.cert({
        "projectId": process.env.PROJECT_ID,
        "private_key": process.env.PRIVATE_KEY.replace(/\\n/ug, '\n'),
        "clientEmail": process.env.CLIENT_EMAIL
    }),
    databaseURL: process.env.DATABASE_URL
});

const client = new Discord.Client();

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {
    if (msg.content.startsWith('!event')) {
        msg.react("✅")
    }
});

client.login(process.env.TOKEN);
