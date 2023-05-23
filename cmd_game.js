function commaCheck(UTILS, t, s)
{
	if(t)
		return UTILS.containsString(UTILS.split(t, ','), s);
	else
		return false;
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

module.exports = (g) =>
{
	const {PRE, UTILS, add_scmd, add_action, overwrite, menus, SERVER_DATA, Player} = g;
	let i = 0;
	
	function register_scmd(name, param, title, desc, meta, func)
	{
		if(!func)
		{
			func = meta;
			meta = {};
		}
	
		add_scmd(name, {
			id: "g" + i,
			cat: "Game",
			title,
			desc,
			param,
			meta,
			func: (chn, source, e, args) =>
			{
				let id = source.channel.parent.id;

				if(!SERVER_DATA[id])
					SERVER_DATA[id] = {players: []};

				func(chn, source, e, args);
			}
		});

		i = i + 1;
	}

	function player(source, pdata, defaults, args, a)
	{
		let func = (user) =>
		{
			for(let i = 0; i < pdata.length; i++)
			{
				if(pdata[i].id === (user ? user.id : args[a]))
				{
					UTILS.msg(source, "-Cannot register duplicate player.");
					return;
				}
			}

			let num = pdata.length;
			let nicknames = [];

			for(let i = a+1; i < args.length; i++)
			{
				if(UTILS.getPlayerByName(pdata, args[i].toLowerCase().replace(/ /g, "_")))
				{
					UTILS.msg(source, "-Cannot register player with duplicate nickname: \"" + args[i] + "\"");
					return;
				}

				if(args[i] === "*")
				{
					UTILS.msg("-The name '*' cannot be used. Sorry.");
					return;
				}

				nicknames[i - 1 - a] = args[i].toLowerCase().replace(/ /g, "_");
			}

			if(nicknames.length === 0)
				nicknames[0] = (user ? user.displayName : args[a]).toLowerCase().replace(/ /g, "_");

			for(let i = pdata.length; i >= num; i--)
			{
				if(i === num)
				{
					pdata[i] = new Player((user ? user.id : args[a]), i+1, nicknames, (user ? user.displayName : args[a]).replace(/ /g, "").replace(/_/g, ""), defaults.tags);

					if(defaults.passives)
						pdata[i].passives = [...defaults.passives];

					if(defaults.abilities)
						pdata[i].abilities = JSON.parse(JSON.stringify(defaults.abilities));
				}
				else
				{
					pdata[i] = pdata[i-1];
					pdata[i].num++;
				}
			}

			overwrite();
			UTILS.msg(source, "+Player " + (num+1) + " registered successfully!");
		};

		if(UTILS.isLong(args[a]))
			source.guild.members.fetch(args[a]).catch(console.error).then(func);
		else
			func();
	}

	register_scmd(["add_player", "addplayer"], "<Player ID or NPC Name> [Nickname(s)...]", "Add Player", "Add a player or NPC into the bot's local storage, enabling use with round procesing and other features.\n\nIf you don't provide at least one nickname, the player's current display name will be used instead.\n\nIf you supply a name in place of a User ID, an NPC will be added instead. This name will also be the default nickname, if no others are provided.",
	{
		adminOnly: true, minArgs: 1, shortDesc: "Register a player or NPC for use with round procesing and other features.", slashOpts:
		[
			{datatype: "String", oname: "player_id", func: (str) => str.setDescription("User ID for a player, or a name for an NPC.")},
			{datatype: "String", oname: "nickname1", func: (str) => str.setDescription("First nickname, always displayed by default in text.")},
			{datatype: "String", oname: "nickname2", func: (str) => str.setDescription("Second nickname")},
			{datatype: "String", oname: "nickname3", func: (str) => str.setDescription("Third nickname")},
			{datatype: "String", oname: "nickname4", func: (str) => str.setDescription("Fourth nickname")},
			{datatype: "String", oname: "nickname5", func: (str) => str.setDescription("Fifth nickname")}
		]
	},
	(chn, source, e, args) =>
	{
		let pdata = SERVER_DATA[source.channel.parent.id].players;
		let defaults = SERVER_DATA[source.channel.parent.id].defaults;

		player(source, pdata, {tags: defaults || {}}, args, 0);
	});

	register_scmd(["clone_player", "cloneplayer", "clone"], "<Original Player Name or Number> <Player ID or NPC Name> [Nickname(s)...]", "Clone Player", "Add a player or NPC into the bot's local storage, loaded with the data of another player.\n\nIf you don't provide at least one nickname, the player's current display name will be used instead.\n\nIf you supply a name in place of a User ID, an NPC will be added instead. This name will also be the default nickname, if no others are provided.",
	{
		adminOnly: true, minArgs: 2, shortDesc: "Add a player or NPC into the bot's local storage, loaded with the data of another player.", slashOpts:
		[
			{datatype: "String", oname: "original", func: (str) => str.setDescription("Name or Number of the player to copy tags/abilities/passives from.")},
			{datatype: "String", oname: "player_id", func: (str) => str.setDescription("User ID for a player, or a name for an NPC.")},
			{datatype: "String", oname: "nickname1", func: (str) => str.setDescription("First nickname, always displayed by default in text.")},
			{datatype: "String", oname: "nickname2", func: (str) => str.setDescription("Second nickname")},
			{datatype: "String", oname: "nickname3", func: (str) => str.setDescription("Third nickname")},
			{datatype: "String", oname: "nickname4", func: (str) => str.setDescription("Fourth nickname")},
			{datatype: "String", oname: "nickname5", func: (str) => str.setDescription("Fifth nickname")}
		]
	},
	(chn, source, e, args) =>
	{
		let pdata = SERVER_DATA[source.channel.parent.id].players;
		let original = UTILS.isInt(args[0])
				? pdata[Number(args[0])-1]
				: UTILS.getPlayerByName(pdata, args[0]);

		if(!original)
		{
			UTILS.msg(source, "-ERROR: Original player not found!");
			return;
		}

		player(source, pdata, original, args, 1);
	});

	register_scmd(["del_player", "delplayer"], "<Player Name or Number or *>", "Delete Player", "Remove a player from the bot's local storage.", {adminOnly: true, minArgs: 1, slashOpts: [{datatype: "String", oname: "player", func: (str) => str.setDescription("Name or Number of a player, or `*` to delete all players.")}]}, (chn, source, e, args) =>
	{
		let pdata = SERVER_DATA[source.channel.parent.id].players;
		let players = (args[0] === "*" ? Object.keys(pdata) : [args[0]]);
		let output = "";

		if(UTILS.isInt(args[0]))
			players[0] = parseInt(args[0])-1;

		if(players.length === 0)
		{
			UTILS.msg(source, "-ERROR: Player data is empty.");
			return;
		}

		for(let i = players.length-1; i >= 0; i--)
		{
			let player = UTILS.isInt(players[i])
				? pdata[players[i]]
				: UTILS.getPlayerByName(pdata, players[i]);

			if(!player)
			{
				UTILS.msg(source, "-ERROR: Player \"" + (args[0] === "*" ? players[i] : args[0]) + "\" is not valid.");
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

		UTILS.msg(source, output);
		overwrite();
	});

	register_scmd(["list_players", "listplayers", "players"], "", "List Players", "Display the current data of registered players, including tags if any exist.\n\n**Warning, this can reveal meta info if used in public channels.** But only if you're using the prefix command version. The slash command version sends a message which is visible only to the command user.", {adminOnly: true, shortDesc: "Display the current data of registered players, including tags if any exist."}, (chn, source, e, args) =>
	{
		let pdata = SERVER_DATA[source.channel.parent.id].players;
		let fields = [];

		if(pdata.length === 0)
		{
			UTILS.msg(source, "-There is no player data to display.");
			return;
		}

		e.setAuthor({name: "Player Data (" + source.guild.name + " <" + source.channel.parent.name + ">)"});
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

			if(Object.keys(plr.tags).length > 0)
			{
				tags = "\nTags:";

				for(let tag in plr.tags)
					tags = tags + "\n\"" + tag + "\": \"" + plr.tags[tag] + "\"";
			}

			fields[fields.length] = {name: "Player " + (i+1), value: "Name: " + (plr.dispname || "") + " (<@" + (UTILS.isLong(plr.id) ? plr.id : "NPC") + ">)\n" + nicks + tags, inline: true};
		}

		e.addFields(fields);

		UTILS.embed(source, e, true);
	});

	register_scmd("tag", "<Player Name or Number or *> <Key> [Value]", "Tag", "Give a player a Tag, a type of variable related to gameplay.\n\nUse * to set a tag for every single player instead.\n\nTo check what a Tag currently is, use this command without providing a Value.\n\nTo remove a Tag, use this command with the Value set to \"-\" (without the quotes).\n\nTo list usable tags, use the =tags command.\n\nThe slash version of this command is ephemeral.",
	{
		adminOnly: true, minArgs: 2, shortDesc: "Give/View/Delete a player's Tag, a type of variable related to gameplay.", slashOpts:
		[
			{datatype: "String", oname: "player", func: (str) => str.setDescription("Name or Number of a player, or `*` to apply to all players.")},
			{datatype: "String", oname: "tag", func: (str) => str.setDescription("Name of the tag that will be checked or changed.")},
			{datatype: "String", oname: "value", func: (str) => str.setDescription("Omit to view tag's current value | Provide to set new value for tag | Use `-` to delete tag")}
		]
	},
	(chn, source, e, args) =>
	{
		let pdata = SERVER_DATA[source.channel.parent.id].players;
		let players = (args[0] === "*" ? Object.keys(pdata) : [args[0]]);
		let output = "";

		if(UTILS.isInt(args[0]))
			players[0] = parseInt(args[0])-1;

		if(players.length === 0)
		{
			UTILS.msg(source, "-ERROR: Player data is empty.");
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
				: UTILS.getPlayerByName(pdata, players[i]);

			if(!player)
			{
				UTILS.msg(source, "-ERROR: Player \"" + (args[0] === "*" ? players[i] : args[0]) + "\" is not valid.");
				continue;
			}

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

		UTILS.msg(source, output, true);
		overwrite();
	});

	register_scmd(["tag_default", "tagdefault", "default"], "<Key> [Value]", "Tag Default", "Set a default tag value. This will be applied to future added players, but not to ones that already exist.\n\nTo check what a Tag's default currently is, use this command without providing a Value.\n\nTo check all Default Tags, use the =tag_defaults command.\n\nTo remove a Tag, use this command with the Value set to \"-\" (without the quotes).\n\nTo list usable tags, use the =tags command.",
	{
		adminOnly: true, minArgs: 1, shortDesc: "Get/Set/Delete a default tag. These will apply to future players, but not ones that already exist.", slashOpts:
		[
			{datatype: "String", oname: "tag", func: (str) => str.setDescription("Name of the default tag to get/set/delete.")},
			{datatype: "String", oname: "value", func: (str) => str.setDescription("Omit to view tag's current value | Provide to set new value for tag | Use `-` to delete tag")}
		]
	},
	(chn, source, e, args) =>
	{
		let defaults = SERVER_DATA[source.channel.parent.id].defaults;
		let key = args[0].toLowerCase();
		let value = args[1] || "";

		if(!defaults)
		{
			SERVER_DATA[source.channel.parent.id].defaults = {};
			defaults = SERVER_DATA[source.channel.parent.id].defaults;
		}

		for(let n = 2; n < args.length; n++)
			value = value + " " + args[n];

		if(value === "-")
		{
			delete defaults[key];
			UTILS.msg(source, "+Tag Default \"" + key + "\" deleted.");
		}
		else if(value !== "")
		{
			defaults[key] = value;
			UTILS.msg(source, "+Tag Default \"" + key + "\" set to \"" + value + "\".");
		}
		else
			UTILS.msg(source, "+Tag Default \"" + key + "\" is currently set to \"" + (defaults[args[1]] || "null") + "\".");

		overwrite();
	});

	register_scmd(["tag_defaults", "tagdefaults", "defaults"], "", "Tag Defaults", "List all default tags which are applied to newly registered players.", {adminOnly: true}, (chn, source, e, args) =>
	{
		let defaults = SERVER_DATA[source.channel.parent.id].defaults;

		if(!defaults || Object.keys(defaults).length === 0)
		{
			UTILS.msg(source, "-There are no default tags set.", true);
			return;
		}

		UTILS.msg(source, "Default Tags:\n" + UTILS.display(defaults), true);
	});

	register_scmd("tags", "", "Tags", "Provide a list of all known tags. Tag names are case-insentitive, but exact spelling is required.", (chn, source, e, args) =>
	{
		e.setAuthor({name: "List of Tags"});
		e.setDescription("Reminder: To remove a tag, or set it to False, use `=tag <player> <tag> -`");

		e.addFields([
			{name: "affinities <String1:Bool>,[String2:Bool],[StringN:Bool]...", value: "A case-insensitive list of elements that the tagged player has affinity for, as well as 'true' or 'false' indicating if they have that affinity or not. It's a very specific format; it's easier to just use the `set_affinity` command."},
			{name: "bid_mult <Decimal>", value: "Applies a multiplier to the tagged player's elemental gains from bidding, assuming nobody else bid for the exact same element. If a decimal is provided, the final result will round up."},
			{name: "chel_over_time <Number>", value: "Determines how much tagged player earns each round. Chel changes are not publicly announced; this is assumed to follow a globally known 'everyone earns chel each round' rule."},
			{name: "damage <Number>", value: "HP, but reverse. The amount of damage the tagged player has will determine how close they are to dying. This is used so that newly created players can be assumed to be at full HP, regardless of what that value is."},
			{name: "hp_over_time <Number>", value: "Provides healing or damage at the end of each round. A positive number provides healing, negative provides damage."},
			{name: "max_hp <Number>", value: "Determines how much HP a player can take before they are considered dead. Dead players won't be included in any over_time tags, and won't be shown passing in the Action Summary, but will still count towards the bidding multiplier from passing players. Other than that, nothing will stop dead players from submitting actions or being the victim of other effects. That's for host sanity to determine."},
			{name: "res_<any> <Number>", value: "Any other tag name can be used to track elements and other resources. Res Tags can and will be automatically created from round processing, and can be referred to in order to verify that cast spells meet their requirements."},
			{name: "wild_over_time <Number>", value: "Players tagged with this will earn the provided number of Wild elements every odd-numbered Round."},
		]);

		UTILS.embed(source, e);
	});

	register_scmd(["list_actions", "listactions", "list_action", "listaction", "actions"], "", "List Actions", "View a numbered list of all currently queued actions for the current round. Each action shows their Summary and Result text when available.", {adminOnly: true, shortDesc: "View a numbered list of all currently queued actions for the current round."}, (chn, source, e, args) =>
	{
		let data = SERVER_DATA[source.channel.parent.id];
		let actions = data.actions;

		if(!actions || actions.length === 0)
		{
			UTILS.msg(source, "-There are no queued actions.", true);
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

		UTILS.msg(source, output, true);
	});

	register_scmd(["del_action", "delaction"], "<number or *>", "Delete Action", "Delete a specific action and prevent it from affecting future results. Use the 'list_actions' command to check the index of each action, or use `*` in place of a number to delete every action.", {adminOnly: true, minArgs: 1, shortDesc: "Delete a specific (or each) action and prevent it from affecting future results.", slashOpts: [{datatype: "String", oname: "action", func: (str) => str.setDescription("Action Number (see /list_actions) | Put `*` to delete all")}]}, (chn, source, e, args) =>
	{
		let actions = SERVER_DATA[source.channel.parent.id].actions;

		if(!actions || actions.length === 0)
		{
			UTILS.msg(source, "-There are no queued actions.", true);
			return;
		}

		let i = args[0];

		if(i === "*")
		{
			SERVER_DATA[source.channel.parent.id].actions = [];
			UTILS.msg("All actions deleted.", true);
			overwrite();
			return
		}

		if(!UTILS.isInt(i))
		{
			UTILS.msg(source, "-ERROR: \"" + i + "\" is not a whole number.", true);
			return;
		}

		if(!actions[i-1])
		{
			UTILS.msg(source, "-ERROR: Action \"" + i + "\" not found.", true);
			return;
		}

		actions.splice(i-1, 1);
		UTILS.msg(source, "Action " + i + " successfully deleted.", true);
		overwrite();
	});

	register_scmd(["create_spell", "createspell", "create"], "<player name or number> <spell name> [element:amount] [element N:amount N]...", "Submit Action: Create Spell", "Submit an action for a player to create a spell.\n\nSpecify both the name of the spell, and at least one elemental cost, based on your final decision for the spell. This will ensure that future attempts to cast it can correctly check the elemental costs and automatically use up those elements upon completion of the round.\n\nThe name of the spell you use with this command is for internal use only, to represent the spell. Command arguments are separated using spaces, so spaces aren't allowed in internal names. (You can use _ in place of spaces). Internal names are also non-case sensitive.\n\nUse the format <ElementName>:<ElementCost> to represent each elemental cost. Multiple elemental costs can be specified, just separate them with spaces.\n\nAny other conditions or restrictions must be tracked manually.\n\nUsing this action with a pre-existing name will learn the spell instead. No cost is needed only in this case.",
	{
		adminOnly: true, minArgs: 2, shortDesc: "Submit an action for a player to create/learn a spell. (Cost required only when creating.)", slashOpts:
		[
			{datatype: "String", oname: "player", func: (str) => str.setDescription("Name or Number of the player who will create/learn this spell.")},
			{datatype: "String", oname: "spell_name", func: (str) => str.setDescription("Name of the spell to create or learn.")},
			{datatype: "String", oname: "amount1", func: (str) => str.setDescription("First elemental requirement. Format is `element:amount`, i.e. `fire:1`")},
			{datatype: "String", oname: "amount2", func: (str) => str.setDescription("Second elemental requirement. Format is `element:amount`, i.e. `water:2`")},
			{datatype: "String", oname: "amount3", func: (str) => str.setDescription("Third elemental requirement. Format is `element:amount`, i.e. `air:3`")},
			{datatype: "String", oname: "amount4", func: (str) => str.setDescription("Fourth elemental requirement. Format is `element:amount`, i.e. `earth:4`")},
			{datatype: "String", oname: "amount5", func: (str) => str.setDescription("Fifth elemental requirement. Format is `element:amount`, i.e. `rule:9999`")}
		]
	},
	(chn, source, e, args) =>
	{
		let data = SERVER_DATA[source.channel.parent.id];
		let player = UTILS.isInt(args[0])
				? data.players[Number(args[0])-1]
				: UTILS.getPlayerByName(data.players, args[0]);

		if(!player)
		{
			UTILS.msg(source, "-ERROR: Player \"" + args[0] + "\" is not valid.");
			return;
		}

		data.spells = data.spells || {};
		let sname = args[1].toLowerCase();

		if(data.spells[sname])
		{
			let a = add_action(data, {type: "create", player: firstname(player), template: " creates a spell", result: " successfully learned a spell"});
			UTILS.msg(source, "+" + a.act + " (learn)");
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
			UTILS.msg(source, "-ERROR: Spell '" + sname + "' does not exist. A cost of some kind is necessary.");
			return;
		}

		let costs = {};

		for(let i = 2; i < args.length; i++)
		{
			let splits = UTILS.split(args[i], ":");

			if(!splits[0])
			{
				UTILS.msg(source, "-ERROR: No cost name specified for Element " + (i-1));
				return;
			}

			let elem = splits[0].toLowerCase();

			if(!UTILS.isInt(splits[1]))
			{
				UTILS.msg(source, "-ERROR: Cost \"" + splits[1] + " of Element \"" + splits[0] + "\" is not a whole number.");
				return;
			}

			costs[elem] = (costs[elem] || 0) + Number(splits[1]);
		}

		let a = add_action(data, {type: "create", player: firstname(player), template: " creates a spell", result: " successfully created a spell", sname, costs});

		UTILS.msg(source, "+" + a.act + " (success)");
		overwrite();
	});

	register_scmd(["cast_spell", "castspell", "cast"], "<player name or number> <spell name>", "Submit Action: Cast Spell", "Submit an action for a player to cast a spell.\n\nSpecify the internal name of the spell that the player is attempting to cast, with correct spelling but any form of capitalization.\n\nThis command is capapble of checking a player's affinities and inventories to verify that they are capable with the attempted spell. It also checks to make sure that the named spell exists.\n\nFailing any of these checks will make this action fail and count as passing.\n\nThis program cannot track other external factors/requirements on its own. Use the `toggle_forcefail` command if an unknowable factor should cause this spell to fail.",
	{
		adminOnly: true, minArgs: 2, shortDesc: "Submit an action for a player to cast a spell.", slashOpts:
		[
			{datatype: "String", oname: "player", func: (str) => str.setDescription("Name or Number of a player")},
			{datatype: "String", oname: "spell", func: (str) => str.setDescription("Name of a spell")}
		]
	},
	(chn, source, e, args) =>
	{
		let data = SERVER_DATA[source.channel.parent.id];
		let player = UTILS.isInt(args[0])
				? data.players[Number(args[0])-1]
				: UTILS.getPlayerByName(data.players, args[0]);

		if(!player)
		{
			UTILS.msg(source, "-ERROR: Player \"" + args[0] + "\" is not valid.", true);
			return;
		}

		data.spells = data.spells || {};
		let spell = data.spells[args[1].toLowerCase()];

		if(!spell)
		{
			let a = add_action(data, {type: "pass", player: firstname(player), template: " casts a spell", result: " failed to cast a spell and passed", sname: args[1].toLowerCase()});
			UTILS.msg(source, "+" + a.act + " (fail/name)", true);
			overwrite();
			return;
		}

		for(let elem in spell)
		{
			let res = player.getInt("res_" + elem);

			if(!player.hasAffinity(elem))
			{
				let a = add_action(data, {type: "pass", player: firstname(player), template: " casts a spell", result: " failed to cast a spell and passed", sname: args[1].toLowerCase()});
				UTILS.msg(source, "+" + a.act + " (fail/affinity)", true);
				overwrite();
				return;
			}

			if(res < spell[elem])
			{
				let a = add_action(data, {type: "pass", player: firstname(player), template: " casts a spell", result: " failed to cast a spell and passed", sname: args[1].toLowerCase()});
				UTILS.msg(source, "+" + a.act + " (fail/cost)", true);
				overwrite();
				return;
			}
		}

		let a = add_action(data, {type: "cast", player: firstname(player), template: " casts a spell", result: " successfully cast a spell", sname: args[1].toLowerCase()});
		UTILS.msg(source, "+" + a.act + " (success)", true);
		overwrite();
	});

	register_scmd("bid", "<player name or number> <element name>", "Submit Action: Bid", "Submit an action for a player to bid on an element.\n\nSpecify the name of the element that the player is attempting to cast, with correct spelling but any form of capitalization.",
	{
		adminOnly: true, minArgs: 2, shortDesc: "Submit an action for a player to bid on an element.", slashOpts:
		[
			{datatype: "String", oname: "player", func: (str) => str.setDescription("Name or Number of a player")},
			{datatype: "String", oname: "element", func: (str) => str.setDescription("Name of an element")}
		]
	},
	(chn, source, e, args) =>
	{
		let data = SERVER_DATA[source.channel.parent.id];
		let player = UTILS.isInt(args[0])
				? data.players[Number(args[0])-1]
				: UTILS.getPlayerByName(data.players, args[0]);

		if(!player)
		{
			UTILS.msg(source, "-ERROR: Player \"" + args[0] + "\" is not valid.", true);
			return;
		}

		let elem = args[1].toLowerCase();

		let a = add_action(data, {type: "bid", elem, player: firstname(player), template: " bids on " + firstname(elem), result: " got"});
		UTILS.msg(source, "+" + a.act + " (success)", true);
		overwrite();
	});

	register_scmd(["misc_action", "miscaction", "misc", "action"], "<player name or number> <message...>", "Submit Action: Misc", "Submit an action with a custom submission source, and no further internal handling by this program. The primary use of this is that a player who submits a misc action will not be assumed to pass.\n\nYou don't need to write the player's name twice in order to include it as part of the source. It will be automatically included.",
	{
		adminOnly: true, minArgs: 2, shortDesc: "Submit an action with a custom submission source, and no further internal handling by this program.", slashOpts:
		[
			{datatype: "String", oname: "player", func: (str) => str.setDescription("Name or Number of a player")},
			{datatype: "String", oname: "message", func: (str) => str.setDescription("Custom action submission message")}
		]
	},
	(chn, source, e, args) =>
	{
		let data = SERVER_DATA[source.channel.parent.id];
		let player = UTILS.isInt(args[0])
				? data.players[Number(args[0])-1]
				: UTILS.getPlayerByName(data.players, args[0]);

		if(!player)
		{
			UTILS.msg(source, "-ERROR: Player \"" + args[0] + "\" is not valid.", true);
			return;
		}

		let template = "";

		for(let i = 1; i < args.length; i++)
			template += " " + args[i];

		let a = add_action(data, {type: "misc", player: firstname(player), template});
		UTILS.msg(source, "+" + a.act + " (success)", true);
		overwrite();
	});

	function hp_change(source, data, p, a, i)
	{
		let player = UTILS.isInt(p)
				? data.players[Number(p)]
				: UTILS.getPlayerByName(data.players, p);
		let amount = Number(a);

		if(!player)
		{
			UTILS.msg(source, "-ERROR: Player \"" + p + "\" is not valid.", true);
			return;
		}

		if(!UTILS.isInt(a))
		{
			UTILS.msg(source, "-ERROR: Amount \"" + a + "\" is not a whole number.", true);
			return;
		}

		if(i) amount = -amount;

		if(amount < 0)
		{
			if(-amount > player.getInt("damage")) amount = -player.getInt("damage");

			add_action(data, {type: "misc", player: firstname(player), result: " healed " + (-amount) + " HP" + (amount > 1 ? "s" : ""), res: "damage", amount});

			UTILS.msg(source, "Healing queued.", true);
		}
		else
		{
			add_action(data, {type: "misc", player: firstname(player), result: " took " + amount + " HP damage", res: "damage", amount});

			UTILS.msg(source, "Damage queued.", true);
		}

		overwrite();
	}

	register_scmd("heal", "<player name or number> <amount>", "Submit Effect: Heal", "Submit an action result that will heal a player at the end of this round. Note that this healing isn't intrinsically tied to any specific player action as far as this command is concerned. That is for you to manage.\n\nNegative healing is automatically counted as damage instead.",
	{
		adminOnly: true, minArgs: 2, shortDesc: "Submit an action result that will heal a player at the end of this round.", slashOpts:
		[
			{datatype: "String", oname: "player", func: (str) => str.setDescription("Name or Number of a player")},
			{datatype: "Integer", oname: "amount", func: (str) => str.setDescription("Amount of HP to heal | Negative healing counts as damage")}
		]
	},
	(chn, source, e, args) =>
	{
		hp_change(source, SERVER_DATA[source.channel.parent.id], args[0], args[1], true);
	});

	register_scmd("damage", "<player name or number> <amount>", "Submit Effect: Damage", "Submit an action result that will damage a player at the end of this round. Note that this damage isn't intrinsically tied to any specific player action as far as this command is concerned. That is for you to manage.\n\nNegative damage is automatically counted as healing instead.",
	{
		adminOnly: true, minArgs: 2, shortDesc: "Submit an action result that will damage a player at the end of this round.", slashOpts:
		[
			{datatype: "String", oname: "player", func: (str) => str.setDescription("Name or Number of a player")},
			{datatype: "Integer", oname: "amount", func: (str) => str.setDescription("Amount of HP to damage | Negative healing counts as healing")}
		]
	},
	(chn, source, e, args) =>
	{
		hp_change(source, SERVER_DATA[source.channel.parent.id], args[0], args[1], false);
	});

	function res_change(source, data, p, r, a, i)
	{
		let player = UTILS.isInt(p)
				? data.players[Number(p)]
				: UTILS.getPlayerByName(data.players, p);
		let resource = "res_" + r.toLowerCase();
		let amount = Number(a);

		if(!player)
		{
			UTILS.msg(source, "-ERROR: Player \"" + p + "\" is not valid.", true);
			return;
		}

		if(!UTILS.isInt(a))
		{
			UTILS.msg(source, "-ERROR: Amount \"" + a + "\" is not a whole number.", true);
			return;
		}

		if(i) amount = -amount;

		if(amount < 0)
		{
			if(-amount > player.getInt(resource)) amount = -player.getInt(resource);

			add_action(data, {type: "misc", player: firstname(player), result: " lost " + (-amount) + " " + r, res: resource, amount});

			UTILS.msg(source, "Loss queued.", true);
		}
		else
		{
			add_action(data, {type: "misc", player: firstname(player), result: " gained " + amount + " " + r, res: resource, amount});

			UTILS.msg(source, "Gain queued.", true);
		}

		overwrite();
	}

	register_scmd("take", "<player name or number> <resource> <amount>", "Submit Effect: Take", "Submit an action result that will take a resource (chel, elements, etc) from a player at the end of this round. Note that this isn't intrinsically tied to any specific player action as far as this command is concerned. That is for you to manage.\n\nTaking a negative amount is automatically counted as giving instead.",
	{
		adminOnly: true, minArgs: 3, shortDesc: "Submit an action result that will take a resource from a player at the end of this round.", slashOpts:
		[
			{datatype: "String", oname: "player", func: (str) => str.setDescription("Name or Number of a player")},
			{datatype: "String", oname: "resource", func: (str) => str.setDescription("Chel, a specific element, etc.")},
			{datatype: "Integer", oname: "amount", func: (str) => str.setDescription("Amount to take | Negative taking counts as giving")}
		]
	},
	(chn, source, e, args) =>
	{
		hp_change(source, SERVER_DATA[source.channel.parent.id], args[0], args[1], args[2], true);
	});

	register_scmd("give", "<player name or number> <resource> <amount>", "Submit Effect: Give", "Submit an action result that will give a resource (chel, elements, etc) to a player at the end of this round. Note that this isn't intrinsically tied to any specific player action as far as this command is concerned. That is for you to manage.\n\nGiving a negative amount is automatically counted as taking instead.",
	{
		adminOnly: true, minArgs: 3, shortDesc: "Submit an action result that will give a resource to a player at the end of this round.", slashOpts:
		[
			{datatype: "String", oname: "player", func: (str) => str.setDescription("Name or Number of a player")},
			{datatype: "String", oname: "resource", func: (str) => str.setDescription("Chel, a specific element, etc.")},
			{datatype: "Integer", oname: "amount", func: (str) => str.setDescription("Amount to give | Negative giving counts as taking")}
		]
	},
	(chn, source, e, args) =>
	{
		hp_change(source, SERVER_DATA[source.channel.parent.id], args[0], args[1], args[2], false);
	});

	register_scmd(["toggle_forcefail", "toggleforcefail", "forcefail"], "<action number>", "Toggle Forcefail", "Select an action and force it to fail at the end of the round, regardless of other conditions. This will also count the affected player as passing.\n\nThis is a toggle; if an action is actually meant to succeed, simply use this command on it again.\n\nSee the 'list_actions' command for action numbers.", {adminOnly: true, minArgs: 1, shortDesc: "Select an action and force it to fail at the end of the round, or undo a previous forcefail.", slashOps: [{datatype: "Integer", oname: "actionNumber", func: (str) => str.setDescription("Number of the action to forcefail (see /list_actions)")}]}, (chn, source, e, args) =>
	{
		let actions = SERVER_DATA[source.channel.parent.id].actions;
		let anum = Number(args[0]);

		if(!UTILS.isInt(args[0]))
		{
			UTILS.msg(source, "-ERROR: \"" + args[0] + "\" is not a whole number.", true);
			return;
		}

		if(!actions[anum-1])
		{
			UTILS.msg(source, "-ERROR: Action " + anum + " cannot be found.", true);
			return;
		}

		actions[anum-1].forcefail = !actions[anum-1].forcefail;
		UTILS.msg(source, "+Action " + anum + " will now " + (actions[anum-1].forcefail ? "forcefail" : "be processed as normal") + ".", true);
		overwrite();
	});

	register_scmd(["list_spells", "listspells", "spells"], "", "List Spells", "View a list of all registered spell names.", {adminOnly: true}, (chn, source, e, args) =>
	{
		let spells = Object.keys(SERVER_DATA[source.channel.parent.id].spells || []);

		if(spells.length === 0)
		{
			UTILS.msg(source, "-There are no spells to list.", true);
			return;
		}

		let list = "List of spells: " + spells[0];

		for(let i = 1; i < spells.length; i++)
			list += ", " + spells[i];

		UTILS.msg(source, list, true);
	});

	register_scmd(["view_spell", "viewspell", "spell"], "<spell name>", "View Spell", "View a specific registered spell, as well as its cost.", {adminOnly: true, minArgs: 1, slashOpts: [{datatype: "String", oname: "spell", func: (str) => str.setDescription("Name of a spell")}]}, (chn, source, e, args) =>
	{
		let spells = SERVER_DATA[source.channel.parent.id].spells || {};
		let sname = args[0].toLowerCase();

		if(!spells[sname])
		{
			UTILS.msg(source, "-Spell '" + sname + " not found.", true);
			return;
		}

		e.setAuthor({name: "Spell Details: " + UTILS.titleCase(sname)});

		for(let elem in spells[sname])
			e.addFields({name: firstname(elem), value: String(spells[sname][elem]), inline: true});

		UTILS.embed(source, e, true);
	});

	register_scmd(["add_spell", "addspell"], "<spell name> <element:amount> [element N:amount N]...", "Add Spell", "Instantly add a spell to this program's internal storage. Not tied to any specific player action.\n\nSpecify both the name of the spell, and at least one elemental cost, based on your final decision for the spell. This will ensure that future attempts to cast it can correctly check the elemental costs and automatically use up those elements upon completion of the round.\n\nThe name of the spell you use with this command is for internal use only, to represent the spell. Command arguments are separated using spaces, so spaces aren't allowed in internal names. Internal names are also non-case sensitive.\n\nUse the formal <ElementName>:<ElementCost> to represent each elemental cost. Multiple elemental costs can be specified, just separate them with spaces.\n\nAny other conditions or restrictions must be tracked manually.",
	{
		adminOnly: true, minArgs: 2, shortDesc: "Instantly add a spell to this program's internal storage. Not tied to any specific player action.", slashOpts:
		[
			{datatype: "String", oname: "spell_name", func: (str) => str.setDescription("Name of the spell to create.")},
			{datatype: "String", oname: "amount1", func: (str) => str.setDescription("First elemental requirement. Format is `element:amount`, i.e. `fire:1`")},
			{datatype: "String", oname: "amount2", func: (str) => str.setDescription("Second elemental requirement. Format is `element:amount`, i.e. `water:2`")},
			{datatype: "String", oname: "amount3", func: (str) => str.setDescription("Third elemental requirement. Format is `element:amount`, i.e. `air:3`")},
			{datatype: "String", oname: "amount4", func: (str) => str.setDescription("Fourth elemental requirement. Format is `element:amount`, i.e. `earth:4`")},
			{datatype: "String", oname: "amount5", func: (str) => str.setDescription("Fifth elemental requirement. Format is `element:amount`, i.e. `rule:9999`")}
		]
	},
	(chn, source, e, args) =>
	{
		let data = SERVER_DATA[source.channel.parent.id];
		data.spells = data.spells || {};
		let sname = args[0].toLowerCase();

		if(spells[sname])
		{
			UTILS.msg(source, "-A spell with the name '" + sname + "' already exists.");
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
				UTILS.msg(source, "-ERROR: No cost name specified for Element " + (i-1));
				return;
			}

			let elem = splits[0].toLowerCase();

			if(!UTILS.isInt(splits[1]))
			{
				UTILS.msg(source, "-ERROR: Cost \"" + splits[1] + " of Element \"" + splits[0] + "\" is not a whole number.");
				return;
			}

			costs[elem] = (costs[elem] || 0) + Number(splits[1]);
		}

		data.spells[sname] = costs;
		UTILS.msg(source, "+Spell '" + sname + "' registration successful.");
		overwrite();
	});

	register_scmd(["del_spell", "delspell"], "<spell name or *>", "Delete Spell", "Instantly delete a registered spell. Use the 'list_spells' command to check valid spell names.\n\nUse '*' to delete all registered spells.", {adminOnly: true, minArgs: 1, shortDesc: "Instantly delete a registered spell.", slashOpts: [{datatype: "String", oname: "spell", func: (str) => str.setDescription("Name of a spellr, or `*` to delete all spells")}]}, (chn, source, e, args) =>
	{
		let data = SERVER_DATA[source.channel.parent.id];
		data.spells = data.spells || {};

		if(args[0] === "*")
		{
			data.spells = {};
			UTILS.msg(source, "All spells deleted.", true);
		}
		else
		{
			let sname = args[0].toLowerCase();

			if(!spells[sname])
			{
				UTILS.msg(source, "-No spell with the name '" + sname + "' exists.", true);
				return;
			}

			delete data.spells[sname];
			UTILS.msg(source, "Spell '" + sname + "' deletion successful.", true);
		}

		overwrite();
	});

	register_scmd(["set_affinity", "setaffinity", "set_aff", "setaff"], "<player name or number or *> <element name> <true|false>", "Set Elemental Affinity", "Immediately set a player's specific elemental affinity as either 'true' or 'false', or all players if you use * instead.\n\nThis is probably easier than directly setting each player's 'affinities' tag.\n\nIf any given player already has the affinity you're trying to give them, this command will simply silently skip them.",
	{
		adminOnly: true, minArgs: 2, shortDesc: "Immediately set a specific affinity as true/false for one specific player, or all players.",
		slashOpts:
		[
			{datatype: "String", oname: "player", func: (str) => str.setDescription("Name or Number of a player, or `*` to apply to all players.")},
			{datatype: "String", oname: "element", func: (str) => str.setDescription("Name of an element")},
			{datatype: "Boolean", oname: "set_to", func: (str) => str.setDescription("Whether they should have this affinity or not. (Default: true)")}
		]
	},
	(chn, source, e, args) =>
	{
		let elem = args[1].toLowerCase();
		let data = SERVER_DATA[source.channel.parent.id];
		let output = "";
		let players = args[0] === "*" ? data.players : UTILS.isInt(args[0])
				? [data.players[Number(args[0])-1]]
				: [UTILS.getPlayerByName(data.players, args[0])];
		let val = UTILS.bool(args[2], true);

		for(let i = 0; i < players.length; i++)
		{
			let plr = players[i];

			if(!plr)
			{
				UTILS.msg(source, "-ERROR: Player \"" + (args[0] === "*" ? (i+1) : args[0]) + "\" is not valid.", true);
				return;
			}

			let aff = plr.setAffinity(elem, val);

			output += "\n" + firstname(plr) + "'s affinity for " + firstname(elem) + " set to: " + String(plr.hasAffinity(elem));
		}

		if(output.length > 0)
		{
			UTILS.msg(source, "+Results:" + output, true);
			overwrite();
		}
	});

	register_scmd(["get_round", "getround", "round"], "", "Get Round", "Displays the current Round number. (1 if undefined)", (chn, source, e, args) =>
	{
		UTILS.msg(source, "This is Round " + (SERVER_DATA[source.channel.parent.id].round || 1) + ".");
	});

	register_scmd(["set_round", "setround"], "<number>", "Set Round", "Set the Round number to a specific whole-number value.", {adminOnly: true, minArgs: 1, slashOpts: [{datatype: "Integer", oname: "round", func: (str) => str.setDescription("Desired round number.")}]}, (chn, source, e, args) =>
	{
		if(!UTILS.isInt(args[0]))
		{
			UTILS.msg(source, "-Error: The provided Round Number must be a whole number.");
			return;
		}

		SERVER_DATA[source.channel.parent.id].round = Number(args[0]);
		UTILS.msg(source, "It is now Round " + args[0] + ".");
	});

	register_scmd(["results", "result"], "[finalize? true/false]", "Preview/Finalize Results", "Show a preview of the round results according to all submitted actions. This includes both action submissions and action results.\n\nSpecify True/Yes or False/No as to if you wish for the posted results to be finalized. This will automatically commit all new spells, elements, hp changes, resource changes, etc. into internal memory and increment the Round value by 1. It will also clear out the Action Queue.\n\nDefault: False", {adminOnly: true, shortDesc: "Preview or finalize current round results according to all submitted actions. Default: Preview", slashOpts: [{datatype: "Boolean", oname: "finalize", func: (str) => str.setDescription("False: Only preview results | True: Commit results to memory and display them")}]}, (chn, source, e, args) =>
	{
		let final = UTILS.bool(args[0], false);
		let data = SERVER_DATA[source.channel.parent.id];
		let actions = data.actions;
		let results = [];
		let players = data.players;
		let spells = data.spells;
		let passers = [];
		let round = data.round || 1;
		let output = (final ? "(Final)" : "(Preview)") + "\n**Round " + round + " Action Summary**\n";

		for(let i = 0; i < players.length; i++)
			passers[i] = true;

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
					UTILS.msg(source, "-Error: Player '" + firstname(players[i]) + "' has a non-integer value for tag '" + t + "'");
					return;
				}
				else if(t === "bid_mult" && players[i].tags[t] && String(Number(players[i].tags[t])) !== players[i].tags[t])
				{
					UTILS.msg(source, "-Error: Player '" + firstname(players[i]) + "' has a non-number value for tag '" + t + "'");
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
					let plr = UTILS.getPlayerByName(players, actions[i].player);

					for(let elem in spell)
					{
						let res = plr.getInt("res_" + elem);

						if(!plr.hasAffinity(elem) || res < spell[elem])
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
				let plr = UTILS.getPlayerByName(players, actions[i].player);
				if(plr) passers[plr.num-1] = false;

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
			let plr = players[i];

			if(!passers[i]) continue;

			if(plr.isAlive())
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
						let plr = UTILS.getPlayerByName(players, results[i].player);
						let bid_mult = plr.getNum("bid_mult", 1);

						output += "\n" + firstname(results[i].player) + results[i].result + " ";

						if(elevels[results[i].elem] === 1)
							output += Math.ceil(elemult * bid_mult);
						else
							output += 1;

						if(final)
						{
							let ename = "res_" + results[i].elem;
							plr.setInt(ename, plr.getInt(ename) + (elevels[results[i].elem] === 1 ? Math.ceil(elemult * bid_mult) : 1));
						}

						output += " " + firstname(results[i].elem);
						results.splice(i, 1);
					}
				}

				if(round % 2 === 1)
				{
					for(let i = 0; i < players.length; i++)
					{
						let wot = players[i].getInt("wild_over_time");

						if(wot > 0 && players[i].isAlive())
						{
							output += "\n" + firstname(players[i]) + " got " + wot + " Wild";

							if(final)
								players[i].setInt("res_wild", players[i].getInt("res_wild") + wot);
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
						let player = UTILS.getPlayerByName(players, results[i].player);

						if(final && player)
						{
							let spell = spells[results[i].sname];

							for(let elem in spell)
								player.setInt("res_" + elem, player.getInt("res_" + elem) - spell[elem], true);
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
					let player = UTILS.getPlayerByName(players, results[i].player);

					if(player && final && results[i].res && results[i].amount)
						player.setInt(results[i].res, player.getInt(results[i].res) + results[i].amount, true);
				}

				for(let i = 0; i < players.length; i++)
				{
					if(!players[i].isAlive()) continue;

					let hot = players[i].getInt("hp_over_time");
					let cot = players[i].getInt("chel_over_time");

					if(hot !== 0)
					{
						if(hot > 0)
						{
							output += "\n**" + firstname(players[i]) + "** healed " + hot + " HP";

							if(final) players[i].heal(hot);
						}
						else
						{
							output += "\n**" + firstname(players[i]) + "** got " + (-hot) + " HP damage";

							if(final) players[i].damage(-hot);
						}
					}

					if(cot && final)
						players[i].setInt("res_chel", players[i].getInt(res_chel) + cot, true);
				}
			}
		}

		UTILS.msg(source, output);

		if(final)
		{
			data.actions = [];
			data.round = round + 1;
			overwrite(source);
		}
		else if(actionChanged)
			overwrite();
	});
};
