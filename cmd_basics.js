function help(commands, e, cmd, pre)
{
	let data = commands[cmd];
	
	if(!data)
	{
		e.setAuthor({name: "Command Not Found"});
		e.setColor("#FF0000");
		e.setDescription("The command \"" + pre + cmd + "\" does not exist.");
	}
	else
	{
		e.setAuthor({name: pre + cmd});
		e.setColor("#0000FF");
		e.setDescription(data.desc);
		e.addFields([{name: "Category", value: data.cat}, {name: "Usage", value: pre + cmd + " " + data.param}]);

		let alts = [];
		for(let c in commands)
			if(c !== cmd && commands[c].id === data.id)
				alts[alts.length] = c;

		if(alts.length > 0)
		{
			let forms = pre + alts[0];
			
			for(let i = 1; i < alts.length; i++)
				forms = forms + "\n" + pre + alts[i];
			
			e.addFields([{name: "Aliases", value: forms}]);
		}
	}
}

module.exports = (g) =>
{
	const {PRE, UTILS, add_cmd, add_scmd, commands, aliases, overwrite} = g;
	let i = 0;
	
	function _cmd(cmd, name, param, title, desc, meta, func)
	{
		if(!func)
		{
			func = meta;
			meta = {};
		}
	
		cmd(name, {
			id: "b" + i,
			cat: "Basic",
			title,
			desc,
			param,
			meta,
			func
		});

		i = i + 1;
	}

	function register_cmd(name, param, title, desc, meta, func)
	{
		_cmd(add_cmd, name, param, title, desc, meta, func)
	}

	function register_scmd(name, param, title, desc, meta, func)
	{
		_cmd(add_scmd, name, param, title, desc, meta, func)
	}

	register_cmd("list", "[category[:subcategory]...]...", "List", "Create a list of all registered commands, organized by category, and when applicable, subcategory. Commands with alternate forms will have each form listed on the same line.\n\nYou may optionally provide category names as parameters. This will limit the created list to only commands from those categories.\n\nYou may also specify a subcategory for each category. This is done using the format of `category:subcategory`. The same category can have more than one listed subcategory, e.g. `category:apple:bannana:cyanide`\n\nPut a - or a ! before specified categories or subcategories to instead exclude them.\n\nSee =categories for a list of categories and subcategories.\n\nExact spelling will be required when specifying categories and subcategories, but they will not be case-sensitive.", (chn, source, e, args) =>
	{
		let list = "Command List:";
		let ordered = {};
		let atLeastOne = false;
		let specs = null;
		let exSpecs = null;
		let showSubs = Object.keys(commands).length > 200;

		if(args.length > 0)
		{
			for(let i = 0; i < args.length; i++)
			{
				let splits = args[i].toLowerCase().split(':');

				let cat = splits[0];
				let exc = false;

				if(UTILS.isNeg(cat))
				{
					cat = cat.substring(1);
					exc = true;
				}

				if(aliases[cat.toLowerCase()])
					cat = aliases[cat.toLowerCase()].toLowerCase();

				if(exc)
				{
					if(!exSpecs)
						exSpecs = {};

					if(!exSpecs[cat])
						exSpecs[cat] = {};

					for(let n = 1; n < splits.length; n++)
					{
						let sub = splits[n];

						if(UTILS.isNeg(sub))
							sub = sub.substring(1);

						exSpecs[cat][sub] = true;
					}
				}
				else
				{
					if(!specs)
						specs = {};

					if(!specs[cat])
						specs[cat] = {};

					for(let n = 1; n < splits.length; n++)
					{
						let sub = splits[n];
						let exs = false;

						if(UTILS.isNeg(sub))
						{
							sub = sub.substring(1);
							exs = true;
						}

						if(exs)
						{
							if(!exSpecs)
								exSpecs = {};

							if(!exSpecs[cat])
								exSpecs[cat] = {};

							exSpecs[cat][sub] = true;
						}
						else
							specs[cat][sub] = true;
					}
				}

				if(splits.length > 1)
					showSubs = true;
			}
		}

		for(let cmd in commands)
		{
			let data = commands[cmd];

			if(specs && !specs[data.cat.toLowerCase()])
				continue;

			if(specs && Object.keys(specs[data.cat.toLowerCase()]).length > 0 && (!data.meta.subCat || !specs[data.cat.toLowerCase()][data.meta.subCat.toLowerCase()]))
				continue;

			if(exSpecs && exSpecs[data.cat.toLowerCase()] && Object.keys(exSpecs[data.cat.toLowerCase()]).length === 0)
				continue;

			if(exSpecs && Object.keys(exSpecs[data.cat.toLowerCase()] || {}).length > 0 && data.meta.subCat && exSpecs[data.cat.toLowerCase()][data.meta.subCat.toLowerCase()])
				continue;

			atLeastOne = true;

			if(!ordered[data.cat])
				ordered[data.cat] = {};

			let subCat = data.meta.subCat;
			if(!subCat)
				subCat = "(none)";

			if(!ordered[data.cat][subCat])
				ordered[data.cat][subCat] = {}

			if(ordered[data.cat][subCat][data.id])
				ordered[data.cat][subCat][data.id] = ordered[data.cat][subCat][data.id] + " " + PRE + cmd;
			else
				ordered[data.cat][subCat][data.id] = (data.meta.adminOnly ? "-" : " ") + PRE + cmd;
		}

		if(!atLeastOne)
		{
			UTILS.msg(source, "-No commands could be found under those specifications.");
			return;
		}

		if(showSubs)
		{
			for(let cat in ordered)
			{
				for(let sub in ordered[cat])
				{
					if(Object.keys(ordered[cat]).length > 1 || sub !== "(none)")
						list = list + "\n\n" + cat + ' ' + sub;
					else
						list = list + "\n\n" + cat;

					for(let cmd in ordered[cat][sub])
						list = list + "\n" + ordered[cat][sub][cmd];
				}
			}
		}
		else
		{
			for(let cat in ordered)
			{
				list = list + "\n\n" + cat;

				for(let sub in ordered[cat])
					for(let cmd in ordered[cat][sub])
						list = list + "\n" + ordered[cat][sub][cmd];
			}
		}

		UTILS.msg(source, list);
	});

	register_cmd(["categories", "cats"], "", "Categories", "Retrieve a list of all known categories that contain at least one command, as well as any subcategories within them. They can be used with " + PRE + "list [Category:Subcategory]", (chn, source) =>
	{
		let output = "List of Categories:\n";
		let cats = {}

		for(let cmd in commands)
		{
			let data = commands[cmd];

			if(!cats[data.cat])
				cats[data.cat] = {};

			if(data.meta.subCat)
				cats[data.cat][data.meta.subCat] = true;
		}

		for(let cat in cats)
		{
			let cstr = cat;

			if(Object.keys(cats[cat]).length > 0)
			{
				cstr = cstr + " - ";

				for(let sub in cats[cat])
					cstr = cstr + sub + ", ";

				cstr = cstr.substring(0, cstr.length-2);
			}

			output = output + '\n' + cstr;
		}

		UTILS.msg(source, output);
	});

	register_scmd("help", "[command]", "Help", "Recieve extra info about the usage and purpose of a provided command.", {slashOpts: [{datatype: "String", oname: "command", func: (str) => str.setDescription("Name of the command you need info about.")}]}, (chn, source, e, args) =>
	{
		if(!args[0])
			help(commands, e, "help", PRE);
		else
			help(commands, e, (args[0] || "").toLowerCase(), PRE);

		UTILS.embed(source, e);
	});

	register_scmd("meta", "<command>", "Meta", "See a command's metadata, which affects how it can be used in terms of parameters, permissions, etc.\n\nYou should not include any prefix when specifying the command's name, unless it happens to be separately part of the command's name.", {minArgs: 1, slashOpts: [{datatype: "String", oname: "command", func: (str) => str.setDescription("Name of the command you need info about.")}], shortDesc: "See a command's metadata, which affects how it can be used in terms of parameters, permissions, etc."}, (chn, source, e, args) =>
	{
		let cname = args[0];
		let cmd = commands[cname];

		if(!cmd)
		{
			UTILS.msg(source, "-ERROR: Command " + PRE + cname + " not found.");
			return;
		}

		let meta = cmd.meta;
		let keys = Object.keys(meta);

		if(keys.length === 0)
		{
			UTILS.msg(source, "Command " + PRE + cname + " has no meta.");
			return;
		}

		let output = "Meta for command " + PRE + cname + "\n{";

		for(let i = 0; i < keys.length; i++)
			output = output + "\n\t" + keys[i] + ": " + UTILS.display(meta[keys[i]], 1);

		UTILS.msg(source, output + "\n}");
	});

	register_scmd("ping", "", "Ping", "Debug; Send a signal to the bot and recieve a response.", (chn, source) =>
	{
		UTILS.msg(source, "+Pong!");
	});

	register_scmd("overwrite", "", "Overwrite", "Manually write current data to internal storage.", {adminOnly: true}, (chn, source) =>
	{
		overwrite(source);
	});
};
