const CONTENT_LIMIT = 1950

module.exports = (g) =>
{
	const {MessageActionRow, MessageEmbed, menus, interactions} = g;
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
		level = level || 1;

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

					let disp = "[" + UTILS.display(value[0]);

					for(let i = 1; i < value.length; i++)
						disp = disp + ", " + UTILS.display(value[i]);

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

	UTILS.embed = (c, e) =>
	{
		let auth = (e.author ? e.author.name : "");
		let sum = auth.length;
		let embeds = [e];
		let pages = [{fields: [], sum: 0}];
		let curPage = 0;
		let sumPage = 0;

		if(auth.length > 256) {UTILS.msg(c, "-ERROR: Embed Title \"" + auth + "\" is longer than 256 characters!"); return;}

		if(e.description)
		{
			if(e.description.length > 4096) {UTILS.msg(c, "-ERROR: Embed \"" + auth + "\"'s Description is longer than 4096 characters!"); return;}
			sum += e.description.length;
		}

		if(e.footer)
		{
			if(e.footer.text.length > 2048) {UTILS.msg(c, "-ERROR: Embed \"" + auth + "\"'s Footer text is longer than 2048 characters!"); return;}
			sum += e.footer.text.length;
		}

		if(auth.length + (e.description ? e.description.length : 0) + (e.footer ? e.footer.text.length : 0) > 4700) {UTILS.msg(c, "-ERROR: Embed \"" + auth + "\"'s Title, Description, and/or Footer are too long! They must allow for at least one full Field (Sum <= 4700)"); return;}

		for(let f in e.fields)
		{
			if(e.fields[f].name.length > 256) {UTILS.msg(c, "-ERROR: Embed \"" + auth + "\"'s Field " + f + " contains a Name which is longer than 256 characters!"); return;}
			if(e.fields[f].value.length > 1024) {UTILS.msg(c, "-ERROR: Embed \"" + auth + "\"'s Field " + f + " contains a Value which is longer than 1024 characters!"); return;}

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

		c.send({embeds}).then((sent) =>
		{
			if(pages.length > 1)
			{
				menus[sent.id] = {type: "embed", message: sent, page: 1, list: [pages[0].fields], time: new Date().getTime()};

				for(let i = 1; i < pages.length; i++)
					menus[sent.id].list[i] = pages[i].fields;

				menus[sent.id].buttons = new MessageActionRow({components: [
					{type: "BUTTON", customId: "__utils:frst", style: "PRIMARY", label: "First Page", emoji: "⏪", disabled: true},
					{type: "BUTTON", customId: "__utils:prev", style: "SECONDARY", label: "Previous Page", emoji: "⬅️", disabled: true},
					{type: "BUTTON", customId: "__utils:next", style: "SECONDARY", label: "Next Page", emoji: "➡️"},
					{type: "BUTTON", customId: "__utils:last", style: "PRIMARY", label: "Last Page", emoji: "⏩"},
				]});

				if(menus[sent.id].list.length <= 2)
					menus[sent.id].buttons.components[3].disabled = true;

				sent.edit({components: [menus[sent.id].buttons], embeds});
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

	UTILS.isInt = (v, trueIfNull) =>
	{
		if(!v && trueIfNull)
			return true;

		if(typeof v !== "string")
			v = String(v);

		return parseInt(v, 10).toString() === v;
	}

	UTILS.isNeg = (arg) =>
	{
		if(typeof arg !== "string" || arg.length === 0)
			return false;

		return arg.charAt(0) === "-" || arg.charAt(0) === "!";
	}

	UTILS.libSplit = (s, d1, d2) =>
	{
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

	UTILS.msg = (chn, txt, nodiff, line, sent) =>
	{
		let size = CONTENT_LIMIT;
		line = (line || 0);
		txt = (txt || "").toString();

		if(line + size < txt.length)
			while(txt[line+size-1] && txt[line+size-1] != '\n')
				size -= 1;

		if(size <= 0)
			size = CONTENT_LIMIT;

		let t = txt.substring(line, line + size);
		let message = (nodiff && t || "```diff\n" + t + "```");

		if(!sent)
		{
			return chn.send(message).then((sent) =>
			{
				if(line + t.length < txt.length)
				{
					menus[sent.id] = {type: "text", message: sent, page: 1, list: [message], time: new Date().getTime()};
					UTILS.msg(chn, txt, nodiff, line + size, sent);
				}
			});
		}
		else
		{
			menus[sent.id].list[menus[sent.id].list.length] = message;

			if(line + t.length < txt.length)
				UTILS.msg(chn, txt, nodiff, line + size, sent);
			else
			{
				menus[sent.id].buttons = new MessageActionRow({components: [
					{type: "BUTTON", customId: "__utils:frst", style: "PRIMARY", label: "First Page", emoji: "⏪", disabled: true},
					{type: "BUTTON", customId: "__utils:prev", style: "SECONDARY", label: "Previous Page", emoji: "⬅️", disabled: true},
					{type: "BUTTON", customId: "__utils:next", style: "SECONDARY", label: "Next Page", emoji: "➡️"},
					{type: "BUTTON", customId: "__utils:last", style: "PRIMARY", label: "Last Page", emoji: "⏩"},
				]});

				if(menus[sent.id].list.length <= 2)
					menus[sent.id].buttons.components[3].disabled = true;

				sent.edit({components: [menus[sent.id].buttons], content: menus[sent.id].list[0] + "\nPage 1 of " + menus[sent.id].list.length});
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

		for(let i = 0; i < level-1; i++)
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

		menu.buttons.components[0].disabled = (menu.page <= 2);
		menu.buttons.components[1].disabled = (menu.page <= 1);
		menu.buttons.components[2].disabled = (menu.page >= menu.list.length);
		menu.buttons.components[3].disabled = (menu.page >= menu.list.length-1);

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
