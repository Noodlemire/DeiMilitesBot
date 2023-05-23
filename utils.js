const CONTENT_LIMIT = 1950

module.exports = (g) =>
{
	const {ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, menus, interactions} = g;
	const UTILS = {};

	UTILS.arrayToChecklist = (a) =>
	{
		let c = {};

		for(let i = 0; i < a.length; i++)
			c[a[i]] = true;

		return c;
	}

	UTILS.bool = (str, def) =>
	{
		let s = str ? str.toLowerCase() : "";

		if(s === "true" || s === "t" || s === "yes" || s == "y")
			return true;
		else if(s === "false" || s === "f" || s === "no" || s === "n")
			return false;
		else
			return def;
	}

	UTILS.cloneClass = (obj) =>
	{
		let cls = obj.constructor;
		return new cls(JSON.parse(JSON.stringify(obj)));
	}

	//<table>, <string>
	UTILS.containsString = (t, s) =>
	{
		if(!t || !s)
			return false;

		for(let i in t)
			if(String(t[i]).toLowerCase() === String(s).toLowerCase())
				return true;

		return false;
	}

	UTILS.display = (value, level) =>
	{
		level = level || 0;

		if(level > 5) return "...";

		switch(typeof value)
		{
			case "string":
				return '"' + value + '"';

			case "object":
				if(!value)
					return "null";
				else if(Array.isArray(value))
				{
					if(value.length === 0)
						return "[]";

					let disp = "[" + UTILS.display(value[0], level);

					for(let i = 1; i < value.length; i++)
						disp = disp + ", " + UTILS.display(value[i], level);

					return disp + "]";
				}
				else
				{
					let keys = Object.keys(value);

					if(keys.length === 0)
						return "{}";

					let disp = "{\n" + UTILS.tabLevel(level+1) + UTILS.display(keys[0]) + ": " + UTILS.display(value[keys[0]], level+1);

					for(let i = 1; i < keys.length; i++)
						disp = disp + ",\n" + UTILS.tabLevel(level+1) + UTILS.display(keys[i]) + ": " + UTILS.display(value[keys[i]], level+1);

					return disp + "\n" + UTILS.tabLevel(level) + "}";
				}

			default:
				return String(value);
		}
	}

	UTILS.embed = (s, e, eph) =>
	{
		let auth = (e.author ? e.author.name : "");
		let sum = auth.length;
		let embeds = [e];
		let pages = [{fields: [], sum: 0}];
		let curPage = 0;
		let sumPage = 0;

		if(auth.length > 256) {UTILS.msg(s, "-ERROR: Embed Title \"" + auth + "\" is longer than 256 characters!"); return;}

		if(e.description)
		{
			if(e.description.length > 4096) {UTILS.msg(s, "-ERROR: Embed \"" + auth + "\"'s Description is longer than 4096 characters!"); return;}
			sum += e.description.length;
		}

		if(e.footer)
		{
			if(e.footer.text.length > 2048) {UTILS.msg(s, "-ERROR: Embed \"" + auth + "\"'s Footer text is longer than 2048 characters!"); return;}
			sum += e.footer.text.length;
		}

		if(auth.length + (e.description ? e.description.length : 0) + (e.footer ? e.footer.text.length : 0) > 4700) {UTILS.msg(s, "-ERROR: Embed \"" + auth + "\"'s Title, Description, and/or Footer are too long! They must allow for at least one full Field (Sum <= 4700)"); return;}

		for(let f in e.fields)
		{
			if(e.fields[f].name.length > 256) {UTILS.msg(s, "-ERROR: Embed \"" + auth + "\"'s Field " + f + " contains a Name which is longer than 256 characters!"); return;}
			if(e.fields[f].value.length > 1024) {UTILS.msg(s, "-ERROR: Embed \"" + auth + "\"'s Field " + f + " contains a Value which is longer than 1024 characters!"); return;}

			let page = pages[curPage];

			if(page.fields.length >= 25 || sum + page.sum + e.fields[f].name.length + e.fields[f].value.length > 6000)
			{
				sumPage += page.fields.length;
				curPage++;
				pages[curPage] = {fields: [e.fields[f]], sum: e.fields[f].name.length + e.fields[f].value.length}
			}
			else
			{
				page.fields[f - sumPage] = e.fields[f];
				page.sum += e.fields[f].name.length + e.fields[f].value.length;
			}
		}

		if(pages.length > 1)
		{
			e.setFields(pages[0].fields);
			embeds[1] = new MessageEmbed();
			embeds[1].setColor(e.color);
			embeds[1].setDescription("Page 1 of " + pages.length);
		}

		let buttons = null; 

		if(pages.length > 1)
		{
			buttons = new ActionRowBuilder({components: [
				new ButtonBuilder({customId: "__utils:frst", style: ButtonStyle.Primary, label: "First Page", emoji: "⏪", disabled: true}),
				new ButtonBuilder({customId: "__utils:prev", style: ButtonStyle.Secondary, label: "Previous Page", emoji: "⬅️", disabled: true}),
				new ButtonBuilder({customId: "__utils:next", style: ButtonStyle.Secondary, label: "Next Page", emoji: "➡️"}),
				new ButtonBuilder({customId: "__utils:last", style: ButtonStyle.Primary, label: "Last Page", emoji: "⏩"}),
			]});

			if(line + t.length + CONTENT_LIMIT >= txt.length)
				buttons.components[3].setDisabled(true);
		}

		s.reply({embeds, components: (buttons ? [buttons] : null), allowedMentions: {repliedUser: false}, ephemeral: eph, fetchReply: true}).then((sent) =>
		{
			if(pages.length > 1)
			{
				menus[sent.id] = {type: "embed", message: sent, page: 1, buttons, list: [pages[0].fields], time: new Date().getTime()};

				for(let i = 1; i < pages.length; i++)
					menus[sent.id].list[i] = pages[i].fields;
			}
		});
	}

	UTILS.gate = (min, value, max) =>
	{
		if(min > max)
		{
			let temp = min;
			min = max;
			max = temp;
		}

		if(min >= value)
			return min;
		else if(max <= value)
			return max;
		else
			return value;
	}

	UTILS.getPlayerByID = (players, id) =>
	{
		for(let i = 0; i < players.length; i++)
			if(players[i].id === id)
				return players[i]
	}

	UTILS.getPlayerByName = (players, name) =>
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

	UTILS.isInt = (v, trueIfNull) =>
	{
		if(!v && trueIfNull)
			return true;

		if(typeof v !== "string")
			v = String(v);

		return parseInt(v, 10).toString() === v;
	}

	UTILS.isLong = (v, trueIfNull) =>
	{
		if(!v && trueIfNull)
			return true;

		if(typeof v !== "string")
			v = String(v);

		for(let i = 0; i < v.length; i++)
			if(!UTILS.isInt(v[i]))
				return false;

		return true;
	}

	UTILS.isNeg = (arg) =>
	{
		if(typeof arg !== "string" || arg.length === 0)
			return false;

		return arg.charAt(0) === "-" || arg.charAt(0) === "!";
	}

	UTILS.libSplit = (s, d1, d2) =>
	{
		if(!s) return {};

		let splits1 = s.split(d1);
		let lib = {};

		if(splits1.length === 1 && splits1[0].search(d2) === -1)
			return splits1[0].trim();

		for(let i = 0; i < splits1.length; i++)
		{
			let splits2 = splits1[i].split(d2);
			lib[String(splits2[0]).trim()] = (splits2[1] ? splits2[1].trim() : null);
		}

		return lib;
	}

	UTILS.msg = (src, txt, eph, nodiff, line, menu) =>
	{
		let size = CONTENT_LIMIT;
		line = (line || 0);
		txt = (txt || "").toString();

		if(line + size < txt.length)
			while(txt[line+size-1] && txt[line+size-1] != '\n')
				size--;

		if(size <= 0)
			size = CONTENT_LIMIT;

		let t = txt.substring(line, line + size);
		let message = (nodiff && t || "```diff\n" + t + "```");

		if(!menu)
		{
			if(line + t.length < txt.length)
			{
				let buttons = new ActionRowBuilder({components: [
					new ButtonBuilder({customId: "__utils:frst", style: ButtonStyle.Primary, label: "First Page", emoji: "⏪", disabled: true}),
					new ButtonBuilder({customId: "__utils:prev", style: ButtonStyle.Secondary, label: "Previous Page", emoji: "⬅️", disabled: true}),
					new ButtonBuilder({customId: "__utils:next", style: ButtonStyle.Secondary, label: "Next Page", emoji: "➡️"}),
					new ButtonBuilder({customId: "__utils:last", style: ButtonStyle.Primary, label: "Last Page", emoji: "⏩"}),
				]});

				if(line + t.length + CONTENT_LIMIT >= txt.length)
					buttons.components[3].setDisabled(true);

				menu = {type: "text", buttons, page: 1, list: [message], time: new Date().getTime()};
				return UTILS.msg(src, txt, eph, nodiff, line + size, menu);
			}
			else
				return src.reply({content: message, allowedMentions: {repliedUser: false}, ephemeral: eph, fetchReply: true});
		}
		else
		{
			menu.list[menu.list.length] = message;

			if(line + t.length < txt.length)
				return UTILS.msg(src, txt, eph, nodiff, line + size, menu);
			else
			{
				return src.reply({content: menu.list[0] + "\nPage 1 of " + menu.list.length, components: [menu.buttons], allowedMentions: {repliedUser: false}, ephemeral: eph, fetchReply: true}).then((sent) =>
				{
					menu.message = sent;
					menus[sent.id] = menu;
				});
			}
		}
	}

	//<Object: {rate}>
	UTILS.randChances = (t) =>
	{
		let sum = 0;

		for(let i in t)
			sum = sum + Math.max(Math.round(100 * t[i].rate), 0);

		let choice = UTILS.randInt(sum);
		sum = 0;

		for(let i in t)
		{
			sum = sum + Math.max(Math.round(100 * t[i].rate), 0);

			if(sum > choice)
				return t[i];
		}

		console.log("Warning: randChances returned null! Sum: " + sum + ", Choice: " + choice);
	}

	UTILS.randElem = (arr) =>
	{
		if(arr.length === 0)
			return null;

		return arr[UTILS.randInt(arr.length)];
	}

	//[<min>, <max>] or [0, <max>)
	UTILS.randInt = (min, max) =>
	{
		if(!max)
		{
			max = min - 1;
			min = 0;
		}

		if(max < min)
		{
			let n = min;
			min = max;
			max = n;
		}

		return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	UTILS.registerInteraction = (name, func) =>
	{
		if(interactions[name])
			throw "Error: Duplicate Interaction Custom ID: " + name;

		interactions[name] = func;
	}

	UTILS.rHex = (n) =>
	{
		if(n)
		{
			let output = "";

			for(let i = 0; i < n; i++)
				output = output + UTILS.rHex();

			return output;
		}

		let h = Math.floor(Math.random() * 16);

		if(h >= 10)
			return String.fromCharCode(55 + h);
		else
			return String(h);
	}

	UTILS.split = (str, d) =>
	{
		let splits = str.split(d);

		for(let i = splits.length-1; i >= 0; i--)
			if(splits[i].length === 0)
				splits.splice(i, 1);

		return splits;
	}

	UTILS.tabLevel = (level) =>
	{
		let tabs = "";

		for(let i = 0; i < level; i++)
			tabs = tabs + '\t';

		return tabs;
	}

	UTILS.titleCase = (str) =>
	{
		str = String(str);
		let output = "";

		for(let i = 0; i < str.length; i++)
		{
			if(str[i] === "_")	
				output += " ";
			else if(output[i-1] === " " || !output[i-1])
				output += str[i].toUpperCase();
			else
				output += str[i].toLowerCase();
		}

		return output;
	}

	function updateMenu(interaction, pageChange)
	{
		let menu = menus[interaction.message.id];

		if(menu.type === "embed" && (!menu.message.embeds[0] || !menu.message.embeds[1]))
		{
			delete menus[interaction.message.id];
			return;
		}

		menu.page = UTILS.gate(1, pageChange(menu), menu.list.length);

		menu.buttons.components[0].setDisabled(menu.page <= 2);
		menu.buttons.components[1].setDisabled(menu.page <= 1);
		menu.buttons.components[2].setDisabled(menu.page >= menu.list.length);
		menu.buttons.components[3].setDisabled(menu.page >= menu.list.length-1);

		if(menu.type === "text")
			interaction.update({components: [menu.buttons], content: menu.list[menu.page-1] + "\nPage " + menu.page + " of " + menu.list.length});
		else
		{
			menu.message.embeds[0].setFields(menu.list[menu.page-1]);
			menu.message.embeds[1].setDescription("Page " + menu.page + " of " + menu.list.length);
			interaction.update({components: [menu.buttons], embeds: menu.message.embeds});
		}

		menu.time = new Date().getTime();
	}

	UTILS.registerInteraction("__utils:frst", (interaction) =>
	{
		if(menus[interaction.message.id])
			updateMenu(interaction, (m) => {return 1;});

		return true;
	});

	UTILS.registerInteraction("__utils:prev", (interaction) =>
	{
		if(menus[interaction.message.id])
			updateMenu(interaction, (m) => {return m.page - 1;});

		return true;
	});

	UTILS.registerInteraction("__utils:next", (interaction) =>
	{
		if(menus[interaction.message.id])
			updateMenu(interaction, (m) => {return m.page + 1;});

		return true;
	});

	UTILS.registerInteraction("__utils:last", (interaction) =>
	{
		if(menus[interaction.message.id])
			updateMenu(interaction, (m) => {return m.list.length;});

		return true;
	});

	return UTILS;
}
