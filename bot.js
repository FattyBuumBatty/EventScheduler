var Discord = require('discord.io');
var logger = require('winston');
var auth = require('./auth.json');
var request = require('request');
var _ = require('lodash');

// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console, {
	colorize: true
});
logger.level = 'debug';

// Initialize Discord Bot
var bot = new Discord.Client({
	token: auth.token,
	autorun: true
});

var tokenKey = '!';
var muteLogs = false;
var logChannel = {
	id: '481673899310841856',
	name: 'event-cal-server-logs'
};
// var eventChannel = {
// 	id: '451561204679180318',
// 	name: 'get_togethers'
// };

bot.on('ready', function (evt) {
	logger.info('Connected');
	logger.info('Logged in as: ' + bot.username + ' - (' + bot.id + '))');
	bot.setPresence({game: {name: tokenKey + 'commands | Under development'}});
});

var commands = {
	commands : 'commands',
	createEvent : 'createEvent',
	help : 'help',
	getLogChannel : 'getLogChannel',
	setLogChannel : 'setLogChannel',
	muteLogChannel : 'muteLogChannel',
	// setEventChannel : 'setEventChannel',
	ping : 'ping',
	getToken : 'getToken',
	setToken : 'setToken',
	whoami : 'whoami'
};


bot.on('message', function (user, userID, channelID, message, evt) {
	// Our bot needs to know if it will execute a command
	// It will listen for messages that will start with `!`
	
	var server = bot.servers[bot.channels[channelID].guild_id];
	var userObj = server.members[userID];

	if (message.substring(0, 1) === tokenKey) {
		var args = message.substring(1).split(' ');
		var cmd = args[0];

		switch(cmd) {
			case commands.ping:
				bot.sendMessage({
					to: channelID,
					message: 'Pong!'
				});
				break;
			case commands.setToken:
				bot.sendMessage({
					to: channelID,
					message: "Token changed from " + tokenKey + " to " + args[1]
				});
				tokenKey = args[1];
				bot.setPresence({game: {name: tokenKey + 'commands | Under development'}});
				break;
			case commands.getToken:
				bot.sendMessage({
					to: channelID,
					message: "Current token is " + tokenKey
				});
				break;
			case 'h':
			case commands.help:
				// Help will display general text and then drop into commands
				bot.sendMessage({
					to: channelID,
					message: "**Help**\n This is a work in progress. Patience, young padwan."
				});
			case 'cmd':
			case 'cmds':
			case commands.commands:
				bot.sendMessage({
					to: channelID,
					message: "**Available Commands:**\n" + _.toString(_.join(_.keys(commands), "\n"))
				});
				break;
			case commands.whoami:
				var nickname = userObj.nick;
				bot.sendMessage({
					to: channelID,
					message: "You are " + nickname + "!"
				});
				break;
			case commands.setLogChannel:
				var msg = "No channel \'" + args[1] + "\' found.";
				var channel = _.find(bot.channels, function(channel){
					return channel.name === args[1];
				});
				if(channel){
					logChannel = {
						id: channel.id,
						name: channel.name
					};
					msg = "Setting channel \'" + channel.name + "\' as bot log channel.";
				}
				bot.sendMessage({
					to: channelID,
					message: msg
				});
				break;
			case commands.getLogChannel:
				bot.sendMessage({
					to: channelID,
					message: "Current log channel is \'" + logChannel.name + "\'."
				});
				break;
			case commands.muteLogChannel:
				muteLogs = (args[1] !== 'false');
				bot.sendMessage({
					to: channelID,
					message: "Channel logs are " + (muteLogs ? "" : "not ") + "muted. Note: Server logs still populate."
				});
				break;
			// case commands.setEventChannel:
			// 	var msg = "No channel \'" + args[1] + "\' found.";
			// 	var channel = _.find(bot.channels, function(channel){
			// 		return channel.name === args[1];
			// 	});
			// 	if(channel){
			// 		eventChannel = {
			// 			id: channel.id,
			// 			name: channel.name
			// 		};
			// 		msg = "Setting channel \'" + channel.name + "\' as bot event output channel.";
			// 	}
			// 	bot.sendMessage({
			// 		to: channelID,
			// 		message: msg
			// 	});
			// 	break;
			case 'addEvent':
			case commands.createEvent:
				//https://maker.ifttt.com/trigger/create_event/with/key/Q6ra2PX5JnZt1VDl1JvA3
				args.splice(0,1); // remove the trigger
				request.post(
					"https://maker.ifttt.com/trigger/create_event/with/key/Q6ra2PX5JnZt1VDl1JvA3",
					{ form: {value1: _.join(args, " ")} },
					function(error, resp, body){
						if(error){
							logger.info(new Date().toLocaleString('en-US', {hour12: false}) + ' == User: ' + user + ' == Error: ' + error);
							bot.sendMessage({
								to: channelID,
								message: "Something went wrong, unable to create event. Please ask an admin to check the bot logs."
							});
							return;
						}
					});
					bot.sendMessage({
						to: channelID,
						message: "Creating event. If no automated event message appears within 20 mins, check bot logs."
					});
				break;
			default:
				bot.sendMessage({
					to: channelID,
					message: "Unsupported command. Type \"" + tokenKey + "commands\" to see a list of available commands."
				});
		} // end switch

		// Logging (server and logging channel)
		if(user && user !== bot.username){
			// Server log
			logger.info(new Date().toLocaleString('en-US', {hour12: false}) + ' == User: ' + user + ' == Command: ' + message);
		
			// Channel log
			if(!muteLogs){
				bot.sendMessage({
					to: logChannel.id,
					message: '\`\`\`\n' + new Date().toLocaleString('en-US', {hour12: false}) + '\nUser: ' + user + ' (as '+ userObj.nick + ')\nCommand: ' + message + '\`\`\`'
				});
			}
		}
	}
});