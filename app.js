const { App } = require('@slack/bolt');
const { MongoClient } = require("mongodb");
const bcrypt = require('bcrypt');

require('dotenv').config()

const client = new MongoClient(process.env.DB_URL);
const db = client.db("bog-bot");
const users = db.collection('users');
const config = db.collection('config');

(async () => {
  // Use connect method to connect to the server
  await client.connect();
  console.log('Connected successfully to server');
  
})();

const createUser = async (userId) => {
  const newUser = {
    userId: userId,
    role: "member",
    bits: 0,
    team: "No Team"
  }
  await users.insertOne(newUser);
  return newUser;
}

const findOrCreateUser = async (userId) => {
  let user = await users.findOne({ userId: userId });
  if (!user) {
    user = await createUser(userId);
  }
  return user;
}

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true, 
  appToken: process.env.SLACK_APP_TOKEN,
  port: process.env.PORT || 3000
});

app.message('help', async ({ message, say }) => {
    const messageArray = message.text.split(' ');
    if (messageArray.length > 1) return;
    await say("```Available commands:\n" 
    + "help [role]                   See this command. Optional role param for extra commands.\n" 
    + "checkin {password}            Attendance at General/Team Meetings + office hours!\n" 
    + "bits                          See your current bit count.\n" 
    + "set team                      Set your current team.\n" 
    + "leaderboard [amt]             See the current bit leaderboard. Optional param for length. \n```" );
  });

app.message('help exec', async ({ message, say }) => {
  await say("```Available commands:\n" 
  + "help [role]                     See this command. Optional role param for extra commands.\n" 
  + "set password {password}         Set attendance password.\n"
  + "set form {form_link}            Set attendance form link.\n" 
  + "remove form {form_link}         Removes form link. Only necessary if there is no form.\n" 
  + "add teams {team1, team2...}     Add teams to the team list.\n"
  + "remove teams {team1, team2...}  Add teams to the team list.\n"
  + "set role {user} {role}          Set a user's role. Options are exec, leader, member.\n"
  + "give bits {user} {amt}          Give a user bits. Use @username.\n"
  + "give team_bits {team} {amt}     Give a team bits. Check team list with set team command.\n```");
});
  
app.message('bits', async ({ message, say }) => {
  const messageArray = message.text.split(' ');
  if (messageArray[0] != "bits") return;
  const user = await findOrCreateUser(message.user);
  await say(`You have ${user.bits} bits!`);
});

app.message('set team', async ({ message, say }) => {
  let teamOptions = [];
  let teamConfig = await config.findOne({ teams: { $exists: true }});
  let teams = teamConfig.teams ? teamConfig.teams : []; 
  for (let i = 0; i < teams.length; i++) {
    teamOptions.push({
      "text": {
        "type": "plain_text",
        "text": teams[i]
      },
      "value": teams[i]
    })
  }
  await say({
  "text": "Team Picker",
  "blocks": [
    {
      "type": "actions",
      "block_id": "actions1",
      "elements": [
        {
          "type": "static_select",
          "placeholder": {
            "type": "plain_text",
            "text": "Pick your team"
          },
          "action_id": "change_team",
          "options": teamOptions
        }
      ]
    }
	]
  });
});

app.message('checkin', async({ message, say }) => {
  const passConfig = await config.findOne({ password: { $exists: true }});
  const messageArray = message.text.split(' ');
  if (messageArray.length < 2) {
    return await say('Please provide a password.');
  }
  if (await bcrypt.compare(messageArray[1], passConfig.password)) {
    const user = await findOrCreateUser(message.user);
    const formConfig = await config.findOne({ form: { $exists: true }});
    if (user.password == passConfig.password) {
      return await say('Already checked in.');
    }
    const updateDoc = {
      $set: {
        bits: user.bits + 1,
        password: passConfig.password
      }
    };
    await users.updateOne({ userId: user.userId}, updateDoc, { upsert: true });
    await say(`Checked in. You now have ${user.bits + 1} bits!`);
    if (formConfig) {
      await say(`Please visit ${formConfig.form} to fill out today's form.`);
    }
  } else {
    await say(`Incorrect password.`);
  }  
})

app.message('set password', async ({ message, say }) => {
  const user = await findOrCreateUser(message.user);
  if (user.role != "exec") {
    return await say('Insufficient Permissions. Contact exec if you need access.');
  }
  const messageArray = message.text.split(' ');
  if (messageArray.length < 3) {
    return await say('Please provide a password');
  }
  const newPass = messageArray[2];
  const hashedPassword = await bcrypt.hash(newPass, 12);
  const updateDoc = {
    $set: {
      password: hashedPassword
    }
  };
  await config.updateOne({ password: { $exists: true }}, updateDoc, { upsert: true });
  await say(`Updated password.`);
});

app.message('add teams', async ({ message, say }) => {
  const user = await findOrCreateUser(message.user);
  if (user.role != "exec") {
    return await say('Insufficient Permissions. Contact exec if you need access.');
  }
  const messageArray = message.text.split(' ');
  if (messageArray.length < 3) {
    return await say('Please provide at least one team.');
  }
  
  let teamConfig = await config.findOne({ teams: { $exists: true }});
  let teams = teamConfig.teams ? teamConfig.teams : [];
  for (let i = 2; i < messageArray.length; i++) {
    teams.push(messageArray[i]);
  }
  const updateDoc = {
    $set: {
      teams: teams
    }
  };
  await config.updateOne({ teams: { $exists: true }}, updateDoc, { upsert: true });
  await say(`Added teams.`);
});

app.message('remove teams', async ({ message, say }) => {
  const user = await findOrCreateUser(message.user);
  if (user.role != "exec") {
    return await say('Insufficient Permissions. Contact exec if you need access.');
  }
  const messageArray = message.text.split(' ');
  if (messageArray.length < 3) {
    return await say('Please provide at least one team.');
  }
  
  let teamConfig = await config.findOne({ teams: { $exists: true }});
  let teams = teamConfig.teams ? teamConfig.teams : [];
  for (let i = 2; i < messageArray.length; i++) {
    teams.splice(teams.indexOf(messageArray[i]));
  }
  const updateDoc = {
    $set: {
      teams: teams
    }
  };
  await config.updateOne({ teams: { $exists: true }}, updateDoc, { upsert: true });
  await say(`Removed teams.`);
});

app.message('set role', async({ message, say }) => {
  const user = await findOrCreateUser(message.user);
  if (user.role != "exec") {
    return await say('Insufficient Permissions. Contact exec if you need access.');
  }
  const messageArray = message.text.split('@');  
  if (messageArray.length < 2) {
    return await say('Please provide a user. Remember to use @username.');
  }
  
  const params = messageArray[1].split('>');
  if (params.length < 2) {
    return await say('Please provide a role. Available roles are exec, leader, member');
  }
  const newRoleUser = params[0];
  await findOrCreateUser(newRoleUser);
  
  const newRole = params[1].substring(1).toLowerCase();
  if (newRole != "exec" && newRole != "leader" && newRole != "member") {
    return await say('Incorrect role. Available roles are exec, leader, member.'); 
  }
  const updateDoc = {
    $set: {
      role: newRole
    }
  };
  await users.updateOne({ userId: newRoleUser}, updateDoc, { upsert: true });
  await say(`Updated <@${newRoleUser}>\'s role.`);
});

app.message('give bits', async({ message, say }) => {
  const user = await findOrCreateUser(message.user);
  if (user.role != "exec") {
    return await say('Insufficient Permissions. Contact exec if you need access.');
  }
  const messageArray = message.text.split('@');  
  if (messageArray.length < 2) {
    return await say('Please provide a user. Remember to use @username.');
  }
  
  const params = messageArray[1].split('>');
  if (params.length < 2) {
    return await say('Please provide the amount of bits.');
  }
  const increasedBitsUserId = params[0];
  bitUserObject = await findOrCreateUser(increasedBitsUserId);
  
  const bitAmount = parseInt(params[1].substring(1));
  if (!bitAmount) {
    return await say('Please provide an integer amount.'); 
  }
  const updateDoc = {
    $set: {
      bits: bitUserObject.bits + bitAmount
    }
  };
  await users.updateOne({ userId: increasedBitsUserId}, updateDoc, { upsert: true });
  await say(`Updated <@${increasedBitsUserId}>\'s bits.`);
});

app.message('give team_bits', async({ message, say }) => {
  const user = await findOrCreateUser(message.user);
  if (user.role != "exec") {
    return await say('Insufficient Permissions. Contact exec if you need access.');
  }
  const messageArray = message.text.split(' ');  
  if (messageArray.length < 3) {
    return await say('Please provide a team. Check the team list through \`set team\`.');
  } else if (messageArray.length < 4) {
    return await say('Please provide the amount of bits.');
  }
  const team = messageArray[2];
  let teamConfig = await config.findOne({ teams: { $exists: true }});
  if (!teamConfig.teams || !teamConfig.teams.includes(team)) {
    return await say('Not a valid team.');
  }  
  const bitAmount = parseInt(messageArray[3]);

  if (!bitAmount) {
    return await say('Please provide an integer amount.'); 
  }
  const updateDoc = {
    $inc: {
      bits: bitAmount
    }
  };
  await users.updateMany({ team: team }, updateDoc);
  await say(`Updated team ${team}\'s bits.`);
});

app.message('set form', async ({ message, say }) => {
  const user = await findOrCreateUser(message.user);
  if (user.role != "exec") {
    return await say('Insufficient Permissions. Contact exec if you need access.');
  }
  const messageArray = message.text.split(' ');
  if (messageArray.length < 3) {
    return await say('Please provide a url to the form');
  }
  const newForm = messageArray[2];
  const updateDoc = {
    $set: {
      form: newForm
    }
  };
  await config.updateOne({ form: { $exists: true }}, updateDoc, { upsert: true });
  await say(`Updated form.`);
});

app.message('remove form', async ({ message, say }) => {
  const user = await findOrCreateUser(message.user);
  if (user.role != "exec") {
    return await say('Insufficient Permissions. Contact exec if you need access.');
  }
  await config.deleteOne({ form: { $exists: true }});
  await say(`Removed form.`);
});

app.message('leaderboard', async({ message, say }) => {
  const messageArray = message.text.split(' ');
  let limit = 10;
  if (messageArray.length > 1) {
    if (Number.isInteger(messageArray[1])) {
      limit = messageArray[1]
    }
    return await say(`Provide an integer limit.`);
  }
  const sortedUsers = await users.find().sort({ bits: -1 }).toArray();
  let leaderboardString = ``;
  for (let i = 0; i < limit && i < sortedUsers.length; i++) {
    leaderboardString += `><@${sortedUsers[i].userId}>: ${sortedUsers[i].bits} bits \n`;
  }
  await say("Current Leaderboard:");
  await say(leaderboardString);
});

app.action('change_team', async ({ body, ack, say }) => {
  // Acknowledge action request
  await ack();
  newTeam = body.actions[0].selected_option.value;
  userId = body.user.id;
  const updateDoc = {
    $set: {
      team: newTeam
    }
  };
  await users.updateOne({ userId: userId}, updateDoc, { upsert: true });
  await say('Team changed!');
});

(async () => {
// Start your app
await app.start();

console.log('⚡️ Bolt app is running!');
})();

