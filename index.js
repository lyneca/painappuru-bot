const Discord = require('discord.js');
const admin = require("firebase-admin");

const HELP = `:pineapple: :robot: **Painappuru Events Bot Help**

**Show help message**
\`\`\`
!event help
\`\`\`
**Log \`[users]\` as attending \`[event]\`**
\`\`\`
!event log [event] [users...]
\`\`\`
**Show all events**
\`\`\`
!event list
\`\`\`
**Show all events for today**
\`\`\`
!event list today
\`\`\`
**Show how many events \`[user]\` has attended**
\`\`\`
!event info [user]
\`\`\`
**Show how many [event] events \`[user]\` has attended**
\`\`\`
!event info [user] [event]
\`\`\`
**Create a new event \`[event]\` on \`[day]\`**
\`\`\`
!event set [event] [day]
\`\`\`
**Delete \`[event]\`**
\`\`\`
!event delete [event]
\`\`\`

The commands \`set\` and \`delete\` both require the **Corpus Tech** role or higher.`

const days = {
    "sun": 0,
    "mon": 1,
    "tue": 2,
    "wed": 3,
    "thu": 4,
    "fri": 5,
    "sat": 6
}

admin.initializeApp({
    credential: admin.credential.cert({
        "projectId": process.env.PROJECT_ID,
        "private_key": process.env.PRIVATE_KEY.replace(/\\n/ug, '\n'),
        "clientEmail": process.env.CLIENT_EMAIL
    }),
    databaseURL: process.env.DATABASE_URL
});

const firestore = admin.firestore()

const events = firestore.collection("events");
const tallies = firestore.collection("tallies");

const client = new Discord.Client();

function authorized(msg) {
    return msg.member.permissions.has("MANAGE_WEBHOOKS")
}

function error(msg, react) {
    return msg.react("❌").then(() => msg.react(react))
}

function notDefault(doc) {
    return doc.id !== 'default';
}

function commandHelp(msg) {
    msg.channel.send(HELP);
}

function commandPing(msg) {
    msg.react("✅")
}

function commandLog(msg, event, mentions) {
    const d = new Date();

    return events.doc(event)
        .get()
        .then(doc => {
            if (d.getUTCDay() === doc.data().day) {
                return firestore.collection("tallies")
                    .add({
                        event: event,
                        timestamp: new Date(),
                        users: mentions
                    })
                    .then(() => {
                        msg.react("✅")
                    })
            }
            return error(msg, "📅");
        })
        .catch(e => {
            console.log(e);
            return error(msg, "❓");
        })
}

function commandInfo(msg, user, event) {
    if (event) {
        return tallies.where("users", "array-contains", user)
            .where("event", "==", event)
            .get()
            .then(qs => {
                msg.channel.send(`User \`${user}\` has attended ${qs.docs.length} \`${event}\` event(s).`)
            });
    }
    return tallies.where("users", "array-contains", user)
        .get()
        .then(qs => {
            msg.channel.send(`User \`${user}\` has attended ${qs.docs.length} event(s) total.`)
        });
}

function commandList(msg, name, today) {
    const d = new Date();

    (name === "today" ? events.where("day", "==", d.getUTCDay()) : events)
        .get()
        .then(qs => {
            if (qs.docs.length) msg.channel.send(qs.docs
                .filter(notDefault)
                .map(doc => `\`${doc.data().name}\``)
                .join(", "))

            else msg.channel.send("No events.")
        });
}

function commandSet(msg, name, day) {
    if (!authorized(msg)) return error(msg, "🔒");
    return events.doc(name)
        .set({
            name: name,
            day: days[day.substr(0, 3).toLowerCase()]
        })
        .then(() => {
            msg.react("✅")
        })
}

function commandDelete(msg, name) {
    if (!authorized(msg)) {
        return error(msg, "🔒");
    }
    return events.doc(name)
        .delete()
        .then(() => {
            msg.react("✅")
        });
}

function recievedEvent(msg) {
    const [_, command, name, ...people] = msg.content.split(' ');

    console.log(command, name, people);

    const members = msg.mentions.members.map((m) => {
        return m.user.username
    });

    switch (command) {
        case "help":
            return commandHelp(msg);
        case "ping":
            return commandPing(msg);
        case "log":
            return commandLog(msg, name);
        case "info":
            return commandInfo(msg, name, people.length > 0 ? people[0] : undefined)
        case "set":
            return commandSet(msg, name, people[0])
        case "delete":
            return commandDelete(msg, name);
        case "list":
            return commandList(msg, name, people[0] === "today")
        default:
            return error(msg, "❔")
    }
}

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {
    if (msg.content.startsWith('!event')) {
        recievedEvent(msg);
    }
});

client.login(process.env.TOKEN);
