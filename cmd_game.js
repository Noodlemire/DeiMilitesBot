function commaCheck(UTILS, t, s)
{
	if(t)
		return UTILS.containsString(UTILS.split(t, ','), s);
	else
		return false;
}

function getPlayerByName(players, name)
{
	if(!name) return;

	name = name.toLowerCase();

	for(let a = 0; a < players.length; a++)
	{
		if(players[a].dispname && players[a].dispname.toLowerCase() === name)
			return players[a];

		for(let b = 0; b < players[a].nicknames.length; b++)
			if(players[a].nicknames[b] === name)
				return players[a];
	}
}

function firstname(p)
{
	let name;

	if(typeof p === "string")
		name = p;
	else
		name = p.dispname || p.nicknames[0] || "unknown (bug)";

	return name.substring(0, 1).toUpperCase() + name.substring(1);
}

function isAlive(plr)
{
	return !plr.tags.damage || !plr.tags.max_hp || Number(plr.tags.damage) < Number(plr.tags.max_hp);
}

module.exports = (g) =>
{
	const {PRE, UTILS, add_cmd, add_action, overwrite, SERVER_DATA} = g;
	let i = 0;
	
	function register_cmd(name, param, title, desc, meta, func)
	{
		if(!func)
		{
			func = meta;
			meta = {};
		}

		add_cmd(name, {
			id: "g" + i,
			cat: "Game",
			title,
			desc,
			param,
			meta,
			func: (chn, message, e, args) =>
			{
				let id = message.guild.id;

				if(!SERVER_DATA[id])
					SERVER_DATA[id] = {players: []};

				func(chn, message, e, args);
			}
		});

		i = i + 1;
	}

	register_cmd(["add_player", "addplayer"], "<Player ID> [Player Number] <#Player Channel> [Nickname(s)...]", "Add Player", "Add a player into the bot's local storage, enabling use with round procesing and other features.\n\nIf you don't provide at least one nickname, the player's current display name will be used instead.\n\nYou may choose a specific number for this new player, inserting it into the list at that position. The previous player in that spot, as well as all players above, will be shifted upwards by 1 slot.", {adminOnly: true, minArgs: 2}, (chn, message, e, args) =>
	{
		let pdata = SERVER_DATA[message.guild.id].players;
		let defaults = SERVER_DATA[message.guild.id].defaults;
		let user_promise = message.guild.members.fetch(args[0]).catch(console.error);
		let player_channel = message.guild.channels.cache.get(args[1].substring(2, args[1].length-1));
		let pnum = null;

		if(UTILS.isInt(args[1]))
		{
			pnum = parseInt(args[1], 10);
			player_channel = message.guild.channels.cache.get(args[2].substring(2, args[2].length-1));

			if(pnum <= 0)
			{
				UTILS.msg(chn, "-Error: Provided player number must be a positive number.");
				return;
			}

			if(pnum > pdata.length + 1)
			{
				UTILS.msg(chn, "-Error: With the current number of players, you cannot add a player whose number is higher than " + (pdata.length + 1) + ".");
				return;
			}
		}

		user_promise.then((user) =>
		{
			if(!user || !player_channel)
			{
				if(!user)
					UTILS.msg(chn, "-Invalid member ID: " + args[0]);

				if(!player_channel)
					UTILS.msg(chn, "-Invalid player channel: " + (pnum ? args[2] : args[1]));

				return;
			}

			for(let i = 0; i < pdata.length; i++)
			{
				if(pdata[i].channel === player_channel.id)
				{
					UTILS.msg(chn, "-Cannot register duplicate player.");
					return;
				}
			}

			let num = (pnum ? pnum-1 : pdata.length);
			let nicknames = [];

			for(let i = (pnum ? 3 : 2); i < args.length; i++)
			{
				if(getPlayerByName(pdata, args[i].toLowerCase()))
				{
					UTILS.msg(chn, "-Cannot register player with duplicate nickname: \"" + args[i] + "\"");
					return;
				}

				if(args[i] === "*")
				{
					UTILS.msg("-The name '*' cannot be used. Sorry.");
					return;
				}

				nicknames[i - (pnum ? 3 : 2)] = args[i].toLowerCase();
			}

			if(nicknames.length === 0)
				nicknames[0] = user.displayName.toLowerCase().replace(/ /g, "_");

			for(let i = pdata.length; i >= num; i--)
			{
				if(i === num)
				{
					pdata[i] =
					{
						id: user.id,
						num: i+1,
						channel: player_channel.id,
						nicknames,
						dispname: user.displayName.replace(/ /g, ""),
						tags: {}
					};

					if(defaults)
						for(let k in defaults)
							pdata[i].tags[k] = defaults[k];
				}
				else
				{
					pdata[i] = pdata[i-1];
					pdata[i].num++;
				}
			}

			overwrite();

			UTILS.msg(chn, "+Player " + (num+1) + " registered successfully!");
		});
	});

	register_cmd(["del_player", "delplayer"], "<Player Name or Number or *>", "Delete Player", "Remove a player from the bot's local storage.", {adminOnly: true, minArgs: 1}, (chn, message, e, args) =>
	{
		let pdata = SERVER_DATA[message.guild.id].players;
		let players = (args[0] === "*" ? Object.keys(pdata) : [args[0]]);
		let output = "";

		if(UTILS.isInt(args[0]))
			players[0] = parseInt(args[0])-1;

		if(players.length === 0)
		{
			UTILS.msg(chn, "-ERROR: Player data is empty.");
			return;
		}

		for(let i = players.length-1; i >= 0; i--)
		{
			let player = UTILS.isInt(players[i])
				? pdata[players[i]]
				: getPlayerByName(pdata, players[i]);

			if(!player)
			{
				UTILS.msg(chn, "-ERROR: Player \"" + (args[0] === "*" ? players[i] : args[0]) + "\" is not valid.");
				continue;
			}

			let delnum = player.num;

			pdata.splice(delnum-1, 1);

			for(let n = delnum-1; n < pdata.length; n++)
				pdata[n].num = n+1;

			output += "-Deleted player " + delnum;

			if(i > 0)
				output += "\n";
		}

		UTILS.msg(chn, output);
		overwrite();
	});

	register_cmd(["view_players", "viewplayers", "players"], "", "View Players", "Display the current data of registered players.\n\n**Warning, this can reveal meta info if used in public channels.**", {adminOnly: true}, (chn, message, e, args) =>
	{
		let pdata = SERVER_DATA[message.guild.id].players;

		if(pdata.length === 0)
		{
			UTILS.msg(chn, "-There is no player data to display.");
			return;
		}

		e.setAuthor({name: "Player Data (" + message.guild.name + ")"});
		e.setColor("#0000FF");

		for(let i = 0; i < pdata.length; i++)
		{
			let plr = pdata[i];
			let nicks = "Nicks: ";
			let tags = "";

			if(!plr)
			{
				console.log("No player for number: " + i);
				continue;
			}

			for(let n = 0; n < plr.nicknames.length; n++)
			{
				nicks = nicks + plr.nicknames[n];

				if(n < plr.nicknames.length-1)
					nicks = nicks + ", ";
			}

			if(plr.tags && Object.keys(plr.tags).length > 0)
			{
				tags = "\nTags:";

				for(let tag in plr.tags)
					tags = tags + "\n\"" + tag + "\": \"" + plr.tags[tag] + "\"";
			}

			e.addField("Player " + (i+1), "Name: " + (plr.dispname || "") + " (<@" + plr.id + ">)\nChannel: <#" + plr.channel + ">\n" + nicks + tags, true);
		}

		UTILS.embed(chn, e);
	});

	register_cmd("tag", "<Player Name or Number or *> <Key> [Value]", "Tag", "Give a player a Tag, a type of variable related to gameplay.\n\nUse * to set a tag for every single player instead.\n\nTo check what a Tag currently is, use this command without providing a Value.\n\nTo remove a Tag, use this command with the Value set to \"-\" (without the quotes).\n\nTo list usable tags, use the =tags command.", {adminOnly: true, minArgs: 2}, (chn, message, e, args) =>
	{
		let pdata = SERVER_DATA[message.guild.id].players;
		let players = (args[0] === "*" ? Object.keys(pdata) : [args[0]]);
		let output = "";

		if(UTILS.isInt(args[0]))
			players[0] = parseInt(args[0])-1;

		if(players.length === 0)
		{
			UTILS.msg(chn, "-ERROR: Player data is empty.");
			return;
		}

		let key = args[1].toLowerCase();
		let value = args[2] || "";

		for(let n = 3; n < args.length; n++)
			value = value + " " + args[n];

		for(let i = 0; i < players.length; i++)
		{
			let player = UTILS.isInt(players[i])
				? pdata[players[i]]
				: getPlayerByName(pdata, players[i]);

			if(!player)
			{
				UTILS.msg(chn, "-ERROR: Player \"" + (args[0] === "*" ? players[i] : args[0]) + "\" is not valid.");
				continue;
			}

			if(!player.tags)
				player.tags = {};

			if(value === "-")
			{
				delete player.tags[key];
				output += "-Player " + player.num + ": Tag \"" + key + "\" deleted.";
			}
			else if(value !== "")
			{
				player.tags[key] = value;
				output += "+Player " + player.num + ": Tag \"" + key + "\" set to \"" + value + "\".";
			}
			else
				output += "Player " + player.num + ": Tag \"" + key + "\" is currently set to \"" + (player.tags[key] || "") + "\".";

			if(i < players.length-1)
				output += '\n';
		}

		UTILS.msg(chn, output);
		overwrite();
	});

	register_cmd(["tag_default", "tagdefault", "default"], "<Key> [Value]", "Tag Default", "Set a default tag value. This will be applied to future added players, but not to ones that already exist.\n\nTo check what a Tag's default currently is, use this command without providing a Value.\n\nTo check all Default Tags, use the =tag_defaults command.\n\nTo remove a Tag, use this command with the Value set to \"-\" (without the quotes).\n\nTo list usable tags, use the =tags command.", {adminOnly: true, minArgs: 1}, (chn, message, e, args) =>
	{
		let defaults = SERVER_DATA[message.guild.id].defaults;
		let key = args[0].toLowerCase();
		let value = args[1] || "";

		if(!defaults)
		{
			SERVER_DATA[message.guild.id].defaults = {};
			defaults = SERVER_DATA[message.guild.id].defaults;
		}

		for(let n = 2; n < args.length; n++)
			value = value + " " + args[n];

		if(value === "-")
		{
			delete defaults[key];
			UTILS.msg(chn, "+Tag Default \"" + key + "\" deleted.");
		}
		else if(value !== "")
		{
			defaults[key] = value;
			UTILS.msg(chn, "+Tag Default \"" + key + "\" set to \"" + value + "\".");
		}
		else
			UTILS.msg(chn, "+Tag Default \"" + key + "\" is currently set to \"" + (defaults[args[1]] || "null") + "\".");

		overwrite();
	});

	register_cmd(["tag_defaults", "tagdefaults", "defaults"], "", "Tag Defaults", "List all default tags which are applied to newly registered players.", (chn, message, e, args) =>
	{
		let defaults = SERVER_DATA[message.guild.id].defaults;

		if(!defaults || Object.keys(defaults).length === 0)
		{
			UTILS.msg(chn, "-There are no default tags set.");
			return;
		}

		UTILS.msg(chn, "Default Tags:\n" + UTILS.display(defaults, 0));
	});

	register_cmd("tags", "", "Tags", "Provide a list of all known tags. Tag names are case-insentitive, but exact spelling is required.", (chn, message, e, args) =>
	{
		e.setAuthor({name: "List of Tags"});
		e.setDescription("Reminder: To remove a tag, or set it to False, use `=tag <player> <tag> -`");

		e.addField("affinities <String1> [String2] [StringN]...", "A case-insensitive list of elements that the tagged player has affinity for. This will allow them to successfully cast spells that require only elements from this list. Any number of elements may be specified; simply separate each element with a space.");
		e.addField("bid_mult <Decimal>", "Applies a multiplier to the tagged player's elemental gains from bidding, assuming nobody else bid for the exact same element. If a decimal is provided, the final result will round up.");
		e.addField("chel_over_time <Number>", "Determines how much tagged player earns each round. Chel changes are not publicly announced; this is assumed to follow a globally known 'everyone earns chel each round' rule.");
		e.addField("damage <Number>", "HP, but reverse. The amount of damage the tagged player has will determine how close they are to dying. This is used so that newly created players can be assumed to be at full HP, regardless of what that value is.");
		e.addField("hp_over_time <Number>", "Provides healing or damage at the end of each round. A positive number provides healing, negative provides damage.");
		e.addField("max_hp <Number>", "Determines how much HP a player can take before they are considered dead. Dead players won't be included in any over_time tags, and won't be shown passing in the Action Summary, but will still count towards the bidding multiplier from passing players. Other than that, nothing will stop dead players from submitting actions or being the victim of other effects. That's for host sanity to determine.");
		e.addField("res_<any> <Number>", "Any other tag name can be used to track elements and other resources. Res Tags can and will be automatically created from round processing, and can be referred to in order to verify that cast spells meet their requirements.");
		e.addField("wild_over_time <Number>", "Players tagged with this will earn the provided number of Wild elements every odd-numbered Round.");

		UTILS.embed(chn, e);
	});

	register_cmd(["list_actions", "listactions", "list_action", "listaction", "actions"], "", "List Actions", "View a numbered list of all currently queued actions for the current round. Each action shows their Summary and Result text when available.", {adminOnly: true}, (chn, message, e, args) =>
	{
		let data = SERVER_DATA[message.guild.id];
		let actions = data.actions;

		if(!actions || actions.length === 0)
		{
			UTILS.msg(chn, "-There are no queued actions.");
			return;
		}

		let output = "All Actions:\n";

		for(let i = 0; i < actions.length; i++)
		{
			output += "\n" + (i+1) + ". ";

			if(actions[i].act)
				output += actions[i].act;

			if(actions[i].act && actions[i].result)
				output += " | ";

			if(actions[i].result)
				output += firstname(actions[i].player) + actions[i].result;

			if(actions[i].forcefail)
				output += " (forcefail)"
		}

		UTILS.msg(chn, output);
	});

	register_cmd(["delete_action", "deleteaction", "del_action", "delaction"], "<number or *>", "Delete Action", "Delete a specific action and prevent it from affecting future results. Use the 'list_actions' command to check the index of each action, or use `*` in place of a number to delete every action.", {adminOnly: true, minArgs: 1}, (chn, message, e, args) =>
	{
		let actions = SERVER_DATA[message.guild.id].actions;

		if(!actions || actions.length === 0)
		{
			UTILS.msg(chn, "-There are no queued actions.");
			return;
		}

		let i = args[0];

		if(i === "*")
		{
			SERVER_DATA[message.guild.id].actions = [];
			UTILS.msg("All actions deleted.");
			overwrite();
			return
		}

		if(!UTILS.isInt(i))
		{
			UTILS.msg(chn, "-ERROR: \"" + i + "\" is not a whole number.");
			return;
		}

		if(!actions[i-1])
		{
			UTILS.msg(chn, "-ERROR: Action \"" + i + "\" not found.");
			return;
		}

		actions.splice(i-1, 1);
		UTILS.msg(chn, "Action " + i + " successfully deleted.");
		overwrite();
	});

	register_cmd(["create_spell", "createspell", "create"], "<player name or number> <spell name> [element:amount] [element N:amount N]...", "Submit Action: Create Spell", "Submit an action for a player to create a spell.\n\nSpecify both the name of the spell, and at least one elemental cost, based on your final decision for the spell. This will ensure that future attempts to cast it can correctly check the elemental costs and automatically use up those elements upon completion of the round.\n\nThe name of the spell you use with this command is for internal use only, to represent the spell. Command arguments are separated using spaces, so spaces aren't allowed in internal names. (You can use _ in place of spaces). Internal names are also non-case sensitive.\n\nUse the formal <ElementName>:<ElementCost> to represent each elemental cost. Multiple elemental costs can be specified, just separate them with spaces.\n\nAny other conditions or restrictions must be tracked manually.\n\nUsing this action with a pre-existing name will learn the spell instead. No cost is needed only in this case.", {adminOnly: true, minArgs: 2}, (chn, message, e, args) =>
	{
		let data = SERVER_DATA[message.guild.id];
		let player = UTILS.isInt(args[0])
				? data.players[Number(args[0])-1]
				: getPlayerByName(data.players, args[0]);

		if(!player)
		{
			UTILS.msg(chn, "-ERROR: Player \"" + args[0] + "\" is not valid.");
			return;
		}

		data.spells = data.spells || {};
		let sname = args[1].toLowerCase();

		if(data.spells[sname])
		{
			let a = add_action(data, {type: "create", player: firstname(player), template: " create a spell", result: " successfully learned a spell"});
			UTILS.msg(chn, "+" + a.act + " (learn)");
			overwrite();
			return;
		}

		if(sname === "*")
		{
			UTILS.msg("-The name '*' cannot be used. Sorry.");
			return;
		}

		if(!args[2])
		{
			UTILS.msg(chn, "-ERROR: Spell '" + sname + "' does not exist. A cost of some kind is necessary.");
			return;
		}

		let costs = {};

		for(let i = 2; i < args.length; i++)
		{
			let splits = UTILS.split(args[i], ":");

			if(!splits[0])
			{
				UTILS.msg(chn, "-ERROR: No cost name specified for Element " + (i-1));
				return;
			}

			let elem = splits[0].toLowerCase();

			if(!UTILS.isInt(splits[1]))
			{
				UTILS.msg(chn, "-ERROR: Cost \"" + splits[1] + " of Element \"" + splits[0] + "\" is not a whole number.");
				return;
			}

			costs[elem] = (costs[elem] || 0) + Number(splits[1]);
		}

		let a = add_action(data, {type: "create", player: firstname(player), template: " create a spell", result: " successfully created a spell", sname, costs});

		UTILS.msg(chn, "+" + a.act + " (success)");
		overwrite();
	});

	register_cmd(["cast_spell", "castspell", "cast"], "<player name or number> <spell name>", "Submit Action: Cast Spell", "Submit an action for a player to cast a spell.\n\nSpecify the internal name of the spell that the player is attempting to cast, with correct spelling but any form of capitalization.\n\nThis command is capapble of checking a player's affinities and inventories to verify that they are capable with the attempted spell. It also checks to make sure that the named spell exists.\n\nFailing any of these checks will make this action fail and count as passing.\n\nThis program cannot track other external factors/requirements on its own. Use the `toggle_forcefail` command if an unknowable factor should cause this spell to fail.", {adminOnly: true, minArgs: 2}, (chn, message, e, args) =>
	{
		let data = SERVER_DATA[message.guild.id];
		let player = UTILS.isInt(args[0])
				? data.players[Number(args[0])-1]
				: getPlayerByName(data.players, args[0]);

		if(!player)
		{
			UTILS.msg(chn, "-ERROR: Player \"" + args[0] + "\" is not valid.");
			return;
		}

		data.spells = data.spells || {};
		let spell = data.spells[args[1].toLowerCase()];

		if(!spell)
		{
			let a = add_action(data, {type: "pass", player: firstname(player), template: " cast a spell", result: " failed to cast a spell and passed", sname: args[1].toLowerCase()});
			UTILS.msg(chn, "+" + a.act + " (fail/name)");
			overwrite();
			return;
		}

		let aff = UTILS.arrayToChecklist(UTILS.split((player.tags.affinities || "").toLowerCase(), " "));

		if(Object.keys(aff).length === 0)
		{
			UTILS.msg(chn, "-ERROR: That player should probably have at least one affinity defined in the `affinities` tag.");
			return;
		}

		for(let elem in spell)
		{
			let tag = player.tags["res_" + elem];

			if(tag && !UTILS.isInt(tag))
			{
				UTILS.msg(chn, "-ERROR: Trying to check element \"" + elem + "\" which is not set to a whole number, and is instead: \"" + tag + "\"");
				return;
			}

			if(!aff[elem])
			{
				let a = add_action(data, {type: "pass", player: firstname(player), template: " cast a spell", result: " failed to cast a spell and passed", sname: args[1].toLowerCase()});
				UTILS.msg(chn, "+" + a.act + " (fail/affinity)");
				overwrite();
				return;
			}

			if(!tag || tag < spell[elem])
			{
				let a = add_action(data, {type: "pass", player: firstname(player), template: " cast a spell", result: " failed to cast a spell and passed", sname: args[1].toLowerCase()});
				UTILS.msg(chn, "+" + a.act + " (fail/cost)");
				overwrite();
				return;
			}
		}

		let a = add_action(data, {type: "cast", player: firstname(player), template: " cast a spell", result: " successfully cast a spell", sname: args[1].toLowerCase()});
		UTILS.msg(chn, "+" + a.act + " (success)");
		overwrite();
	});

	register_cmd("bid", "<player name or number> <element name>", "Submit Action: Bid", "Submit an action for a player to bid on an element.\n\nSpecify the name of the element that the player is attempting to cast, with correct spelling but any form of capitalization.", {adminOnly: true, minArgs: 2}, (chn, message, e, args) =>
	{
		let data = SERVER_DATA[message.guild.id];
		let player = UTILS.isInt(args[0])
				? data.players[Number(args[0])-1]
				: getPlayerByName(data.players, args[0]);

		if(!player)
		{
			UTILS.msg(chn, "-ERROR: Player \"" + args[0] + "\" is not valid.");
			return;
		}

		let elem = args[1].toLowerCase();

		let a = add_action(data, {type: "bid", elem, player: firstname(player), template: " bid on " + firstname(elem), result: " got"});
		UTILS.msg(chn, "+" + a.act + " (success)");
		overwrite();
	});

	register_cmd(["misc_action", "miscaction", "misc", "action"], "<player name or number> <Message...>", "Submit Action: Misc", "Submit an action with a custom submission message, and no further internal handling by this program. The primary use of this is that a player who submits a misc action will not be assumed to pass.\n\nYou don't need to write the player's name twice in order to include it as part of the message. It will be automatically included.", {adminOnly: true, minArgs: 2}, (chn, message, e, args) =>
	{
		let data = SERVER_DATA[message.guild.id];
		let player = UTILS.isInt(args[0])
				? data.players[Number(args[0])-1]
				: getPlayerByName(data.players, args[0]);

		if(!player)
		{
			UTILS.msg(chn, "-ERROR: Player \"" + args[0] + "\" is not valid.");
			return;
		}

		let template = "";

		for(let i = 1; i < args.length; i++)
			template += " " + args[i];

		let a = add_action(data, {type: "misc", player: firstname(player), template});
		UTILS.msg(chn, "+" + a.act + " (success)");
		overwrite();
	});

	function hp_change(chn, data, p, a, i)
	{
		let player = UTILS.isInt(p)
				? data.players[Number(p)]
				: getPlayerByName(data.players, p);
		let amount = Number(a);

		if(!player)
		{
			UTILS.msg(chn, "-ERROR: Player \"" + p + "\" is not valid.");
			return;
		}

		if(!UTILS.isInt(a))
		{
			UTILS.msg(chn, "-ERROR: Amount \"" + a + "\" is not a whole number.");
			return;
		}

		player.tags.damage = player.tags.damage || 0;
		if(i) amount = -amount;

		if(amount < 0)
		{
			if(-amount > player.tags.damage) amount = -player.tags.damage;

			add_action(data, {type: "misc", player: firstname(player), result: " healed " + (-amount) + " Health Point" + (amount > 1 ? "s" : ""), res: "damage", amount});

			UTILS.msg(chn, "Healing queued.");
		}
		else
		{
			add_action(data, {type: "misc", player: firstname(player), result: " took " + amount + " Health Point damage", res: "damage", amount});

			UTILS.msg(chn, "Damage queued.");
		}

		overwrite();
	}

	register_cmd("heal", "<player name or number> <amount>", "Submit Effect: Heal", "Submit an action that will heal a player at the end of this round. Note that this healing isn't intrinsically tied to any specific player action as far as this command is concerned. That is for you to manage.\n\nNegative healing is automatically counted as damage instead.", {adminOnly: true, minArgs: 2}, (chn, message, e, args) =>
	{
		hp_change(chn, SERVER_DATA[message.guild.id], args[0], args[1], true);
	});

	register_cmd("damage", "<player name or number> <amount>", "Submit Effect: Damage", "Submit an action that will damage a player at the end of this round. Note that this damage isn't intrinsically tied to any specific player action as far as this command is concerned. That is for you to manage.\n\nNegative damage is automatically counted as healing instead.", {adminOnly: true, minArgs: 2}, (chn, message, e, args) =>
	{
		hp_change(chn, SERVER_DATA[message.guild.id], args[0], args[1], false);
	});

	function res_change(chn, data, p, r, a, i)
	{
		let player = UTILS.isInt(p)
				? data.players[Number(p)]
				: getPlayerByName(data.players, p);
		let resource = "res_" + r.toLowerCase();
		let amount = Number(a);

		if(!player)
		{
			UTILS.msg(chn, "-ERROR: Player \"" + p + "\" is not valid.");
			return;
		}

		if(!UTILS.isInt(a))
		{
			UTILS.msg(chn, "-ERROR: Amount \"" + a + "\" is not a whole number.");
			return;
		}

		player.tags[resource] = player.tags[resource] || 0;
		if(i) amount = -amount;

		if(amount < 0)
		{
			if(-amount > player.tags[resource]) amount = -player.tags[resource];

			add_action(data, {type: "misc", player: firstname(player), result: " lost " + (-amount) + " " + r, res: resource, amount});

			UTILS.msg(chn, "Loss queued.");
		}
		else
		{
			add_action(data, {type: "misc", player: firstname(player), result: " gained " + amount + " " + r, res: resource, amount});

			UTILS.msg(chn, "Gain queued.");
		}

		overwrite();
	}

	register_cmd("take", "<player name or number> <resource> <amount>", "Submit Effect: Take", "Submit an action that will take a resource (chel, elements, etc) from a player at the end of this round. Note that this isn't intrinsically tied to any specific player action as far as this command is concerned. That is for you to manage.\n\nTaking a negative amount is automatically counted as giving instead.", {adminOnly: true, minArgs: 3}, (chn, message, e, args) =>
	{
		hp_change(chn, SERVER_DATA[message.guild.id], args[0], args[1], args[2], true);
	});

	register_cmd("give", "<player name or number> <resource> <amount>", "Submit Effect: Give", "Submit an action that will give a resource (chel, elements, etc) to a player at the end of this round. Note that this isn't intrinsically tied to any specific player action as far as this command is concerned. That is for you to manage.\n\nGiving a negative amount is automatically counted as taking instead.", {adminOnly: true, minArgs: 3}, (chn, message, e, args) =>
	{
		hp_change(chn, SERVER_DATA[message.guild.id], args[0], args[1], args[2], false);
	});

	register_cmd(["toggle_forcefail", "toggleforcefail", "forcefail"], "<action number>", "Toggle Forcefail", "Select an action and force it to fail at the end of the round, regardless of other conditions. This will also count the affected player as passing.\n\nThis is a toggle; if an action is actually meant to succeed, simply use this command on it again.\n\nSee the 'list_actions' command for action numbers.", {adminOnly: true, minArgs: 1}, (chn, message, e, args) =>
	{
		let actions = SERVER_DATA[message.guild.id].actions;
		let anum = Number(args[0]);

		if(!UTILS.isInt(args[0]))
		{
			UTILS.msg(chn, "-ERROR: \"" + args[0] + "\" is not a whole number.");
			return;
		}

		if(!actions[anum-1])
		{
			UTILS.msg(chn, "-ERROR: Action " + anum + " cannot be found.");
			return;
		}

		actions[anum-1].forcefail = !actions[anum-1].forcefail;
		UTILS.msg(chn, "+Action " + anum + " will now " + (actions[anum-1].forcefail ? "forcefail" : "be processed as normal") + ".");
		overwrite();
	});

	register_cmd(["list_spells", "listspells", "spells"], "", "List Spells", "View a list of all registered spell names.", {adminOnly: true}, (chn, message, e, args) =>
	{
		let spells = Object.keys(SERVER_DATA[message.guild.id].spells || []);

		if(spells.length === 0)
		{
			UTILS.msg(chn, "-There are no spells to list.");
			return;
		}

		let list = "List of spells: " + spells[0];

		for(let i = 1; i < spells.length; i++)
			list += ", " + spells[i];

		UTILS.msg(chn, list);
	});

	register_cmd(["view_spell", "viewspell", "spell"], "<spell name>", "View Spell", "View a specific registered spell, as well as its cost.", {adminOnly: true, minArgs: 1}, (chn, message, e, args) =>
	{
		let spells = SERVER_DATA[message.guild.id].spells || {};
		let sname = args[0].toLowerCase();

		if(!spells[sname])
		{
			UTILS.msg(chn, "-Spell '" + sname + " not found.");
			return;
		}

		e.setAuthor({name: "Spell Details: " + UTILS.titleCase(sname)});

		for(let elem in spells[sname])
			e.addField(firstname(elem), String(spells[sname][elem]), true);

		chn.send({embeds: [e]});
	});

	register_cmd(["add_spell", "addspell"], "<spell name> <element:amount> [element N:amount N]...", "Add Spell", "Instantly add a spell to this program's internal storage. Not tied to any specific player action.\n\nSpecify both the name of the spell, and at least one elemental cost, based on your final decision for the spell. This will ensure that future attempts to cast it can correctly check the elemental costs and automatically use up those elements upon completion of the round.\n\nThe name of the spell you use with this command is for internal use only, to represent the spell. Command arguments are separated using spaces, so spaces aren't allowed in internal names. Internal names are also non-case sensitive.\n\nUse the formal <ElementName>:<ElementCost> to represent each elemental cost. Multiple elemental costs can be specified, just separate them with spaces.\n\nAny other conditions or restrictions must be tracked manually.", {adminOnly: true, minArgs: 2}, (chn, message, e, args) =>
	{
		let data = SERVER_DATA[message.guild.id];
		data.spells = data.spells || {};
		let sname = args[0].toLowerCase();

		if(spells[sname])
		{
			UTILS.msg(chn, "-A spell with the name '" + sname + "' already exists.");
			return;
		}

		if(sname === "*")
		{
			UTILS.msg("-The name '*' cannot be used. Sorry.");
			return;
		}

		let costs = {};

		for(let i = 1; i < args.length; i++)
		{
			let splits = UTILS.split(args[i], ":");

			if(!splits[0])
			{
				UTILS.msg(chn, "-ERROR: No cost name specified for Element " + (i-1));
				return;
			}

			let elem = splits[0].toLowerCase();

			if(!UTILS.isInt(splits[1]))
			{
				UTILS.msg(chn, "-ERROR: Cost \"" + splits[1] + " of Element \"" + splits[0] + "\" is not a whole number.");
				return;
			}

			costs[elem] = (costs[elem] || 0) + Number(splits[1]);
		}

		data.spells[sname] = costs;
		UTILS.msg(chn, "+Spell '" + sname + "' registration successful.");
		overwrite();
	});

	register_cmd(["del_spell", "delspell"], "<spell name or *>", "Delete Spell", "Instantly delete a registered spell. Use the 'list_spells' command to check valid spell names.\n\nUse '*' to delete all registered spells.", {adminOnly: true, minArgs: 1}, (chn, message, e, args) =>
	{
		let data = SERVER_DATA[message.guild.id];
		data.spells = data.spells || {};

		if(args[0] === "*")
		{
			data.spells = {};
			UTILS.msg(chn, "All spells deleted.");
		}
		else
		{
			let sname = args[0].toLowerCase();

			if(!spells[sname])
			{
				UTILS.msg(chn, "-No spell with the name '" + sname + "' exists.");
				return;
			}

			delete data.spells[sname];
			UTILS.msg(chn, "Spell '" + sname + "' deletion successful.");
		}

		overwrite();
	});

	register_cmd(["add_element", "addelement", "add_elem", "addelem", "add_affinity", "addaffinity"], "<player name or number or *> <element name>", "Add Elemental Affinity", "Immediately add a specific elemental affinity to a select player, or all players if you use * instead.\n\nThis is probably easier than directly setting each player's 'affinities' tag.\n\nIf any given player already has the affinity you're trying to give them, this command will simply silently skip them.", {adminOnly: true, minArgs: 2}, (chn, message, e, args) =>
	{
		let elem = args[1].toLowerCase();
		let data = SERVER_DATA[message.guild.id];
		let output = "";
		let players = args[0] === "*" ? data.players : UTILS.isInt(args[0])
				? [data.players[Number(args[0])-1]]
				: [getPlayerByName(data.players, args[0])];

		for(let i = 0; i < players.length; i++)
		{
			let plr = players[i];

			if(!plr)
			{
				UTILS.msg(chn, "-ERROR: Player \"" + args[0] + "\" is not valid.");
				return;
			}

			if(plr.tags.affinities)
			{
				if(plr.tags.affinities.search(elem) === -1)
				{
					plr.tags.affinities += " " + elem;
					output += "\n" + firstname(plr) + " gained " + firstname(elem) + " affinity.";
				}
			}
			else
			{
				plr.tags.affinities = elem;
				output += "\n" + firstname(plr) + " gained " + firstname(elem) + " affinity.";
			}
		}

		if(output.length > 0)
		{
			UTILS.msg(chn, "+Results:" + output);
			overwrite();
		}
		else
			UTILS.msg(chn, "They already had '" + elem + "'.");
	});

	register_cmd(["get_round", "getround", "round"], "", "Get Round", "Displays the current Round number. (1 if undefined)", (chn, message, e, args) =>
	{
		UTILS.msg(chn, "This is Round " + (SERVER_DATA[message.guild.id].round || 1) + ".");
	});

	register_cmd(["set_round", "setround"], "<number>", "Set Round", "Set the Round number to a specific whole-number value.", {adminOnly: true, minArgs: 1}, (chn, message, e, args) =>
	{
		if(!UTILS.isInt(args[0]))
		{
			UTILS.msg(chn, "-Error: The provided Round Number must be a whole number.");
			return;
		}

		SERVER_DATA[message.guild.id].round = Number(args[0]);
		UTILS.msg(chn, "It is now Round " + args[0] + ".");
	});

	register_cmd(["result", "results"], "[finalize? true/false]", "Preview/Finalize Results", "View a preview of the round results according to all submitted action. This includes both action submissions and action results.\n\nSpecify True/Yes or False/No as to if you wish for the posted results to be finalized. This will automatically commit all new spells, elements, hp changes, resource changes, etc. into internal memory and increment the Round value by 1. It will also clear out the Action Queue.\n\nDefault: False", {adminOnly: true}, (chn, message, e, args) =>
	{
		let final = UTILS.bool(args[0], false);
		let data = SERVER_DATA[message.guild.id];
		let actions = data.actions;
		let results = [];
		let players = data.players;
		let spells = data.spells;
		let passers = structuredClone(players);
		let round = data.round || 1;
		let output = (final ? "(Final)" : "(Preview)") + "\n**Round " + round + " Action Summary**\n";

		let elemult = 1;
		let elevels = {};
		let elemax = 0;

		let failSect = false;
		let bidSect = false;
		let cSect = false;
		let miscSect = false;

		let actionChanged = false;

		for(let i = 0; i < players.length; i++)
		{
			for(let t in players[i].tags)
			{
				if((t === "hp_over_time" || t === "chel_over_time" || t === "wild_over_time" || t === "damage" || t === "max_hp" || t.substring(0, 4) === "res_") && !UTILS.isInt(players[i].tags[t], true))
				{
					UTILS.msg(chn, "-Error: Player '" + firstname(players[i]) + "' has a non-integer value for tag '" + t + "'");
					return;
				}
				else if(t === "bid_mult" && players[i].tags[t] && String(Number(players[i].tags[t])) !== players[i].tags[t])
				{
					UTILS.msg(chn, "-Error: Player '" + firstname(players[i]) + "' has a non-number value for tag '" + t + "'");
					return;
				}

				if(t === "hp_over_time") miscSect = true;
				else if(t === "wild_over_time" && round % 2 === 1) bidSect = true;
			}
		}

		for(let i = 0; i < actions.length; i++)
		{
			if((actions[i].type === "cast" || actions[i].type === "pass") && actions[i].sname)
			{
				let valid = true;
				let spell = spells[actions[i].sname];

				if(!spell)
					valid = false;
				else
				{
					let plr = getPlayerByName(players, actions[i].player);
					let aff = UTILS.arrayToChecklist(UTILS.split((plr.tags.affinities || "").toLowerCase(), " "));

					for(let elem in spell)
					{
						let tag = plr.tags["res_" + elem];

						if(!aff[elem] || !tag || tag < spell[elem])
						{
							valid = false;
							break;
						}
					}
				}

				if(valid)
				{
					if(actions[i].type !== "cast")
					{
						actionChanged = true;
						actions[i].type = "cast";
						actions[i].result = " successfully cast a spell";
					}
				}
				else
				{
					if(actions[i].type !== "pass")
					{
						actionChanged = true;
						actions[i].type = "pass";
						actions[i].result = " failed to cast a spell and passed";
					}
				}
			}

			if(actions[i].act)
			{
				output += "\n" + actions[i].act;
				let plr = getPlayerByName(passers, actions[i].player);
				if(plr) plr.nonpass = true;

				if(actions[i].forcefail || actions[i].type === "pass") {failSect = true; elemult = Math.ceil(elemult * 1.5);}
				else if(actions[i].type === "bid") bidSect = true;
				else if(actions[i].type === "create" || actions[i].type === "cast") cSect = true;

				if(actions[i].type === "bid" && !actions[i].forcefail)
				{
					elevels[actions[i].elem] = (elevels[actions[i].elem] || 0) + 1;
					elemax = Math.max(elemax, elevels[actions[i].elem]);
				}
			}

			if(actions[i].result)
				results.unshift(actions[i]);
		}

		for(let i = 1; i < elemax; i++)
			elemult = Math.ceil(elemult * 1.5);

		for(let i = 0; i < passers.length; i++)
		{
			let plr = passers[i];

			if(plr.nonpass) continue;

			if(isAlive(plr))
				output += "\n**" + firstname(plr) + "** passed"

			elemult = Math.ceil(elemult * 1.5);
		}

		output += "\n\n**Round " + round + " Action Results**";

		if(!failSect && !bidSect && !cSect && !miscSect && results.length === 0)
			output += "\n\nnothing lol";
		else
		{
			if(failSect)
			{
				output += "\n";

				for(let i = results.length-1; i >= 0; i--)
				{
					if(results[i].type === "pass")
					{
						output += "\n" + firstname(results[i].player) + results[i].result;
						results.splice(i, 1);
					}
					else if(results[i].forcefail)
					{
						output += "\n" + firstname(results[i].player) + " failed";

						switch(results[i].type)
						{
							case "create": output += " to create spell"; break;
							case "cast": output += " to cast spell"; break;
							case "bid": output += " to bid"; break;
						}

						output += " and passed";
						results.splice(i, 1);
					}
				}
			}

			if(bidSect)
			{
				output += "\n";

				for(let i = results.length-1; i >= 0; i--)
				{
					if(results[i].type === "bid")
					{
						let bid_mult = 1;
						let plr = getPlayerByName(players, results[i].player);

						if(plr && plr.tags.bid_mult)
							bid_mult = Number(plr.tags.bid_mult);

						output += "\n" + firstname(results[i].player) + results[i].result + " ";

						if(elevels[results[i].elem] === 1)
							output += Math.ceil(elemult * bid_mult);
						else
							output += 1;

						if(final)
						{
							let ename = "res_" + results[i].elem;
							plr.tags[ename] = String(Number(plr.tags[ename] || 0) + (elevels[results[i].elem] === 1 ? Math.ceil(elemult * bid_mult) : 1));
						}

						output += " " + firstname(results[i].elem);
						results.splice(i, 1);
					}
				}

				if(round % 2 === 1)
				{
					for(let i = 0; i < players.length; i++)
					{
						let wot = Number(players[i].tags.wild_over_time);

						if(wot && isAlive(players[i]))
						{
							output += "\n" + firstname(players[i]) + " got " + wot + " Wild";

							if(final)
								players[i].tags.res_wild = String((Number(players[i].tags.res_wild) || 0) + wot);
						}
					}
				}
			}

			if(cSect)
			{
				output += "\n";

				for(let i = results.length-1; i >= 0; i--)
				{
					if(results[i].type === "create")
					{
						if(final)
							spells[results[i].sname] = results[i].costs

						output += "\n" + firstname(results[i].player) + results[i].result;
						results.splice(i, 1);
					}
				}

				for(let i = results.length-1; i >= 0; i--)
				{
					if(results[i].type === "cast")
					{
						let player = getPlayerByName(players, results[i].player);

						if(final && player)
						{
							let spell = spells[results[i].sname];

							for(let elem in spell)
								player.tags["res_" + elem] = String(Number(player.tags["res_" + elem]) - spell[elem]);
						}

						output += "\n" + firstname(results[i].player) + results[i].result;
						results.splice(i, 1);
					}
				}
			}

			if(miscSect || results.length > 0)
			{
				output += "\n";

				for(let i = results.length-1; i >= 0; i--)
				{
					output += "\n**" + firstname(results[i].player) + "**" + results[i].result;
					let player = getPlayerByName(players, results[i].player);

					if(player && final && results[i].res && results[i].amount)
						player.tags[results[i].res] = String(Number(player.tags[results[i].res] || 0) + results[i].amount);
				}

				for(let i = 0; i < players.length; i++)
				{
					if(!isAlive(players[i])) continue;

					let hot = Math.min(Number(players[i].tags.damage || 0), Number(players[i].tags.hp_over_time));
					let cot = Number(players[i].tags.chel_over_time);

					if(hot)
					{
						if(hot > 0)
							output += "\n**" + firstname(players[i]) + "** healed " + hot + " Health Point" + (hot > 1 ? "s" : "");
						else if(hot < 0)
							output += "\n**" + firstname(players[i]) + "** got " + (-hot) + " Health Point damage";

						if(final)
							players[i].tags.damage = String(Math.max(0, Number(players[i].tags.damage || 0) - hot));
					}

					if(cot && final)
						players[i].tags.res_chel = String(Math.max(0, Number(players[i].tags.res_chel || 0) + cot));
				}
			}
		}

		UTILS.msg(chn, output);

		if(final)
		{
			data.actions = [];
			data.round = round + 1;
			overwrite(chn);
		}
		else if(actionChanged)
			overwrite();
	});
};
