# Bitbot
A bot for managing participation in Bits of Good. Bits are awarded for going to events, attending meetings, and other forms of participation within Bits of Good.

## Commands
Direct message the Bit Bot `help` to see the message below:
```
Available commands:  
help [role]                   See this command. Optional role param for extra commands.
checkin {password}            Attendance at General/Team Meetings + office hours!
bits                          See your current bit count.
profile                       See your current profile.
set team                      Set your current team.
teams                         See the current list of teams.
leaderboard teams             See the current team leaderboard for bits.
leaderboard [amt]             See the current bit leaderboard. Optional param for length. 
```
Direct message the Bit Bot `help exec` to see the message below:
```
Available commands:  
help [role]                     See this command. Optional role param for extra commands.
set password {password}         Set attendance password.
set form {form_link}            Set attendance form link.
remove form                     Removes form link. Only necessary if there is no form.
reset users                     Resets all users' bits. Only use when starting new semester.\n
add teams {team1, team2...}     Add teams to the team list.
remove teams {team1, team2...}  Add teams to the team list.
set role {user} {role}          Set a user's role. Options are exec, leader, member.
give bits {user, channel} {amt} Give a user bits. Use @username or @channel.
give team_bits {team} {amt}     Give a team bits. Check team list with teams command.
```

## Contributing
Feel free to suggest ideas through issues or create pull requests for features the Bit Bot should have. Also please report any bugs you experience with the bot. The app is written in solely Node.js.
