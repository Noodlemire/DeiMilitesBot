const {Client, Intents, MessageEmbed, MessageActionRow} = require('discord.js');
const {readFile, writeFile, open} = require("fs");

const OWNER = "298205270201597955";
const PRE = "^";

const bot = new Client({intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MEMBERS]});

const interactions = {};
const commands = {};
const conflicts = {};
const menus = {};

const UTILS = require("./utils.js")({MessageActionRow, MessageEmbed, menus, interactions});

const SERVER_DATA = {};
const LOCAL_DATA = {};

const FNAME = ".store.json";
const FNAME2 = ".backup.json";
readFile(FNAME, (err, data) =>
{
	if(err) throw err;

	let store = JSON.parse(data);

	if(store.LOCAL_DATA)
		for(let id in store.LOCAL_DATA)
			LOCAL_DATA[id] = store.LOCAL_DATA[id];

	if(!LOCAL_DATA.TOKEN)
		throw "Error: No TOKEN provided.";

	if(store.SERVER_DATA)
		for(let id in store.SERVER_DATA)
			SERVER_DATA[id] = store.SERVER_DATA[id];

	writeFile(FNAME2, data, (err) =>
	{
		if(err) throw err;
	});

	login();
})

var overwrites = 0;
function overwrite(chn, cb)
{
	if(overwrites > 1)
	{
		if(chn) UTILS.msg(chn, "-WARNING: " + overwrites + " simultaneous overwrites!");
		console.log("WARNING: " + overwrites + " simultaneous overwrites!");
	}

	let json = JSON.stringify({LOCAL_DATA, SERVER_DATA});
	overwrites++;

	writeFile(FNAME, json, (err) =>
	{
		if(err) throw err;
		if(chn) UTILS.msg(chn, "+Data saved successfully.").then(() => {if(cb) return cb();});

		overwrites--;
	});
}

let c = 1;
function add_cmd(name, cmd)
{
	if(typeof name !== "string")
	{
		let usedNames = {};

		for(let i in name)
		{
			if(usedNames[name[i]])
				console.log("Error: Command \"" + cmd.title + " (" + cmd.cat + (cmd.meta.subCat ? (" " + cmd.meta.subCat) : "") + ")\" tries to use the name \"" + PRE + name[i] + "\" more than once.");
			else
			{
				usedNames[name[i]] = true;
				add_cmd(name[i], cmd);
			}
		}

		return;
	}

	if(name !== name.toLowerCase())
	{
		console.log("WARNING: Command name '" + name + "' is not lowercase!");
		name = name.toLowerCase();
	}

	if(name.match(" "))
	{
		console.log("WARNING: Command name '" + name + "' contains a space!");
		name = name.replace(/ /g, "_");
	}

	if(!cmd.id || !cmd.cat || !cmd.title || !cmd.desc || !cmd.func)
		throw "Error: Malformed command: " + name + "\n" + UTILS.display(cmd);

	if(!cmd.param)
		cmd.param = "";

	if(!cmd.meta)
		cmd.meta = {};

	if(commands[name])
	{
		let n1 = name + "-" + 1;
		let n2 = name + "-" + 2;

		if(commands[n1])
		{
			let i = 2;
			let newname = "";

			do
			{
				i = i + 1;
				newname = name + "-" + i;
			}
			while(commands[newname]);

			commands[newname] = cmd;
			conflicts[name][i-1] = {com: newname, title: cmd.title, cat: cmd.cat, subCat: cmd.meta.subCat};
		}
		else
		{
			commands[n1] = commands[name];
			commands[n2] = cmd;
			conflicts[name] = [{com: n1, title: commands[name].title, cat: commands[name].cat, subCat: commands[name].meta.subCat}, {com: n2, title: cmd.title, cat: cmd.cat, subCat: cmd.meta.subCat}];
			delete commands[name];

			add_cmd(name, {
				id: "c" + c,
				cat: "Conflict",
				title: PRE + name + " Conflict",
				desc: "This command exists because of a conflict between two command names. Use it to learn how to specify which individual command you want to see.",

				func: (chn) =>
				{
					let txt = "Command '" + PRE + name + "' refers to multiple commands. Did you mean:\n";

					for(let c in conflicts[name])
					{
						let con = conflicts[name][c];
						txt = txt + "\n" + PRE + con.com + " - " + con.title + " (" + con.cat + (con.subCat && (" " + con.subCat) || "") + ")";
					}

					UTILS.msg(chn, txt);
				}
			});

			c = c + 1;
		}
	}
	else
		commands[name] = cmd
}

function add_action(data, def)
{
	if(!def) throw "ERROR: Action definition missing.";
	if(!def.type) throw "ERROR: Action definition missing field: type"; //pass, create, cast, bid, misc
	if(!def.player) throw "ERROR: Action definition missing field: player";

	if(def.template) def.act = "**" + def.player + "**" + def.template;

	if(!data.actions) data.actions = [];

	data.actions[data.actions.length] = def;

	return def;
}

function getMentions(text)
{
	let matched;
	let matchlist = [];
	let mentions = [];
	let regex = /<@/g;

	while(matched = regex.exec(text))
		matchlist[matchlist.length] = matched.index;

	for(let i = 0; i < matchlist.length; i++)
	{
		let end;
		let n;

		for(n = matchlist[i]+2; n < text.length; n++)
		{
			let c = text.charAt(n);

			if(c === '>')
			{
				end = n;
				mentions[mentions.length] = text.substring(matchlist[i], end+1);
				break;
			}
			else if(!UTILS.isInt(c) && !(n === matchlist[i]+2 && c === "&"))
				break;
		}

		if(!end && n == text.length)
			break;
	}

	return mentions;
}

const GLOBAL = {
	PRE,
	UTILS,
	
	bot,
	commands,
	add_cmd,
	add_action,
	overwrite,

	SERVER_DATA,

	MessageEmbed,
	MessageActionRow
};

require("./cmd_basics.js")(GLOBAL);
require("./cmd_rng.js")(GLOBAL);
require("./cmd_game.js")(GLOBAL);



bot.on("ready", () =>
{
	console.log("Logged in as " + bot.user.tag + "!");

	console.log("Guilds:");
	bot.guilds.cache.forEach(g =>
	{
		g.members.fetch(bot.user.id).then(b =>
		{
			g.members.fetch(g.ownerId).then(o =>
			{
				console.log(g.id + " - " + g.name + " - " + g.memberCount + " - " + o.user.tag + " - " + b.permissions.has("CREATE_INSTANT_INVITE") + " - " + b.permissions.has("ADMINISTRATOR"));
			});
		});
	});

	if(LOCAL_DATA.guild && LOCAL_DATA.channel)
	{
		let guild = bot.guilds.cache.get(LOCAL_DATA.guild);

		if(guild)
		{
			let channel = guild.channels.cache.get(LOCAL_DATA.channel);

			if(channel)
				UTILS.msg(channel, "+Restart complete!");
			else
				console.log("WARNING: Unable to find Channel: " + String(LOCAL_DATA.channel));
		}
		else
			console.log("WARNING: Unable to find Guild: " + String(LOCAL_DATA.guild));

		delete LOCAL_DATA.guild;
		delete LOCAL_DATA.channel;
		overwrite();
	}
	else if(LOCAL_DATA.guild || LOCAL_DATA.channel)
		console.log("WARNING: Attempted reset, but only Ruild or Channel specified! (" + String(LOCAL_DATA.guild) + " / " + String(LOCAL_DATA.channel) + ")");
});

var restarting = false;
bot.on("messageCreate", (message) =>
{
	if(restarting) return;

	if(message.content.substring(0, PRE.length) === PRE)
	{
		let channel = message.channel;
		let embed = new MessageEmbed();
		let args = UTILS.split(message.content.substring(PRE.length), " ");
		let cmd = (args[0] || "").toLowerCase();
		args = args.splice(1);

		if(commands[cmd])
		{
			let meta = commands[cmd].meta;

			if(meta.adminOnly && !message.member.permissions.has("ADMINISTRATOR"))
				UTILS.msg(channel, "-You do not have elevated permissions for this bot.");
			else if(meta.minArgs && args.length < meta.minArgs)
				UTILS.msg(channel, "-USAGE: " + PRE + cmd + " " + commands[cmd].param);
			else
				commands[cmd].func(channel, message, embed, args);
		}
		else
			UTILS.msg(channel, "-ERROR: Unknown command: " + PRE + cmd);
	}
	else if(message.content === "-RESTART" && message.member.id === OWNER)
	{
		restarting = true;

		UTILS.msg(message.channel, "Restarting...").then(() =>
		{
			 open('.reset.txt', 'w', (err, file) => {
				if(err) throw err;

				LOCAL_DATA.guild = message.guild.id;
				LOCAL_DATA.channel = message.channel.id;

				overwrite(message.channel, () => {throw "exit";});
			});
		});

		return;
	}
});

bot.on("interactionCreate", (i) =>
{
	if(i.customId && interactions[i.customId])
		if(!interactions[i.customId](i))
			i.update({});
});

bot.on("debug", (e) => console.log(e));
bot.on("error", (error) => console.log(error.message + "\n\n" + error.stack));
bot.on("shardError", (error) => console.log(error.message + "\n\n" + error.stack));

function login()
{
	bot.login(LOCAL_DATA.TOKEN);
}

setInterval(() =>
{
	let now = new Date().getTime();

	for(let mid in menus)
	{
		let menu = menus[mid];

		if(now - menu.time >= 3600000)
		{
			let message = menu.message;

			if(menu.type === "text")
				message.edit({components: [], content: menu.list[menu.page-1]});
			else if(message.embeds[0])
				message.edit({components: [], embeds: [message.embeds[0]]});

			delete menus[mid];
		}
	}
}, 1000)
