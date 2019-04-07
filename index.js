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

function recievedEvent(msg) {
    const [_, command, name, ...people] = msg.content.split(' ');

    console.log(command, name, people);

    const members = msg.mentions.members.map((m) => {
        return m.user.username
    });

    const d = new Date();

    const events = firestore.collection("events");
    const tallies = firestore.collection("tallies");

    switch (command) {
        case "help":
            msg.channel.send(HELP);
            break;
        case "ping":
            msg.react("✅")
            break;
        case "log":
            events.doc(name)
                .get()
                .then(doc => {
                    if (d.getUTCDay() === doc.data().day) {
                        return firestore.collection("tallies")
                            .add({
                                event: name,
                                timestamp: new Date(),
                                users: members
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
            break;
        case "info":
            if (people.length > 0) {
                tallies.where("users", "array-contains", members[0])
                    .where("event", "==", people[0])
                    .get()
                    .then(qs => {
                        msg.channel.send(`User \`${members[0]}\` has attended ${qs.docs.length} \`${people[0]}\` event(s).`)
                    });
            } else {
                tallies.where("users", "array-contains", members[0])
                    .get()
                    .then(qs => {
                        msg.channel.send(`User \`${members[0]}\` has attended ${qs.docs.length} event(s) total.`)
                    });
            }
            break;
        case "set":
            if (!authorized(msg)) {
                error(msg, "🔒");
                break;
            }
            events.doc(name)
                .set({
                    name: name,
                    day: days[people[0].substr(0, 3).toLowerCase()]
                })
                .then(() => {
                    msg.react("✅")
                })
            break;
        case "delete":
            if (!authorized(msg)) {
                error(msg, "🔒");
                break;
            }
            events.doc(name)
                .delete()
                .then(() => {
                    msg.react("✅")
                });
            break;
        case "list":
            (name === "today" ? events.where("day", "==", d.getUTCDay()) : events)
                .get()
                .then(qs => {
                    if (qs.docs.length) msg.channel.send(qs.docs
                        .filter(notDefault)
                        .map(doc => `\`${doc.data().name}\``).join(", "))
                    else msg.channel.send("No events.")
                });
            break;
        default:
            error(msg, "❔")
            break;
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
