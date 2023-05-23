const {Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle} = require("discord.js");
const {REST} = require("@discordjs/rest");
const {Routes} = require("discord-api-types/v9");
const {readFile, writeFile, open} = require("fs");

const PRE = "^";
const ELEVATED = "ADMINISTRATOR";

const bot = new Client({intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers, GatewayIntentBits.MessageContent]});

const interactions = {};
const commands = {};
const scdata = [];
const conflicts = {};
const menus = {};

const UTILS = require("./utils.js")({ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, menus, interactions});

const Player = require("./player.js")({UTILS});

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

	if(!LOCAL_DATA.appID)
		throw "Error: No Application ID (appID) provided.";

	if(store.SERVER_DATA)
	{
		for(let id in store.SERVER_DATA)
		{
			SERVER_DATA[id] = store.SERVER_DATA[id];

			if(SERVER_DATA[id].players)
				for(let p = 0; p < SERVER_DATA[id].players.length; p++)
					SERVER_DATA[id].players[p] = new Player(SERVER_DATA[id].players[p]);
		}
	}

	writeFile(FNAME2, data, (err) =>
	{
		if(err) throw err;
	});

	rest = new REST({version: "10"}).setToken(LOCAL_DATA.TOKEN);

	login();
})

var overwrites = 0;
function overwrite(src, cb)
{
	if(overwrites > 1)
	{
		if(src) UTILS.msg(src, "-WARNING: " + overwrites + " simultaneous overwrites!");
		console.log("WARNING: " + overwrites + " simultaneous overwrites!");
	}

	let json = JSON.stringify({LOCAL_DATA, SERVER_DATA});
	overwrites++;

	writeFile(FNAME, json, (err) =>
	{
		if(err) throw err;
		if(src) UTILS.msg(src, "+Data saved successfully.").then(() => {if(cb) return cb();});

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

				func: (chn, src) =>
				{
					let txt = "Command '" + PRE + name + "' refers to multiple commands. Did you mean:\n";

					for(let c in conflicts[name])
					{
						let con = conflicts[name][c];
						txt = txt + "\n" + PRE + con.com + " - " + con.title + " (" + con.cat + (con.subCat && (" " + con.subCat) || "") + ")";
					}

					UTILS.msg(src, txt);
				}
			});

			c = c + 1;
		}
	}
	else
		commands[name] = cmd
}

function add_scmd(name, cmd)
{
	let m = cmd.meta || {};
	let scmd = new SlashCommandBuilder()
		.setName(typeof name === "string" ? name : name[0])
		.setDescription(m.shortDesc || cmd.desc);

	if(m.adminOnly)
		scmd.setDefaultMemberPermissions(8);

	if(m.slashOpts)
	{
		let min = m.minArgs || 0;

		for(let i = 0; i < m.slashOpts.length; i++)
		{
			let dt = m.slashOpts[i].datatype;
			if(dt === "Member") dt = "User"; //Why, discord.js?

			scmd["add" + dt + "Option"]((o) => m.slashOpts[i].func(o.setName(m.slashOpts[i].oname).setRequired(i < min)));
		}
	}

	scdata[scdata.length] = scmd.toJSON();

	add_cmd(name, cmd);
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
	add_scmd,
	add_action,
	overwrite,
	menus,

	SERVER_DATA,

	EmbedBuilder,
	ActionRowBuilder,
	SlashCommandBuilder,

	Player
};

require("./cmd_basics.js")(GLOBAL);
require("./cmd_rng.js")(GLOBAL);
require("./cmd_game.js")(GLOBAL);



bot.on("ready", () =>
{
	console.log("Logged in as " + bot.user.tag + "!");

	(async () =>
	{
		try
		{
			console.log("Registering Slash Commands");

			if(LOCAL_DATA.DEVMODE)
			{
				await rest.put(Routes.applicationGuildCommands(LOCAL_DATA.appID, LOCAL_DATA.DEVMODE), {body: scdata});
				await rest.put(Routes.applicationCommands(LOCAL_DATA.appID), {body: []});
			}
			else
				await rest.put(Routes.applicationCommands(LOCAL_DATA.appID), {body: scdata});
		}
		catch (err)
		{
			console.error(err);
		}
	})();
});

bot.on("messageCreate", (message) =>
{
	if(message.content.substring(0, PRE.length) === PRE)
	{
		let channel = message.channel;
		let embed = new EmbedBuilder();
		let args = UTILS.split(message.content.substring(PRE.length), " ");
		let cmd = (args[0] || "").toLowerCase();
		args = args.splice(1);

		if(commands[cmd])
		{
			let meta = commands[cmd].meta;

			if(meta.adminOnly && !message.member.permissions.has(ELEVATED))
				UTILS.msg(message, "-You do not have elevated permissions for this bot.");
			else if(meta.minArgs && args.length < meta.minArgs)
				UTILS.msg(message, "-USAGE: " + PRE + cmd + " " + commands[cmd].param);
			else
			{
				try
				{
					commands[cmd].func(channel, message, embed, args);
				}
				catch(err)
				{
					console.log(err);
					console.trace();
					UTILS.msg(message, "-ERROR: " + err);
				}
			}
		}
		else
			UTILS.msg(message, "-ERROR: Unknown command: " + PRE + cmd);
	}
});

bot.on("interactionCreate", async (i) =>
{
	if(i.commandName)
	{
		let cmd = commands[i.commandName];

		if(cmd)
		{
			let embed = new EmbedBuilder();
			let meta = cmd.meta;
			let args = [];

			if(meta.slashOpts)
			{
				let min = meta.minArgs || 0;

				for(let a = 0; a < meta.slashOpts.length; a++)
				{
					let dt = meta.slashOpts[a].datatype;
					if(dt === "User") dt = "Member"; //Why, discord.js?

					let arg = i.options["get" + dt](meta.slashOpts[a].oname, a < min);

					if(arg !== null)
						args[a] = arg;
				}
			}

			try
			{
				cmd.func(i.channel, i, embed, args);
			}
			catch(err)
			{
				console.log(err);
				console.trace();
				UTILS.msg(i, "-ERROR: " + err, true);
			}
		}
	}
	else if(i.customId && interactions[i.customId])
		if(!interactions[i.customId](i))
			i.update({});
});

bot.on("debug", (e) => console.log(e));
bot.on("error", (error) => console.log("ERROR: " + error.name + " - " + error.message + "\n\n" + error.trace));
bot.on("shardError", (error) => console.log("SHARD ERROR: " + error.name + " - " + error.message + "\n\n" + error.trace));

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
		menu.time = menu.time || new Date().getTime();

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
