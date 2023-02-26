module.exports = (g) =>
{
	const {PRE, UTILS, add_cmd, aliases} = g;

	let i = 0;
	
	function register_cmd(name, param, title, desc, meta, func)
	{
		if(!func)
		{
			func = meta;
			meta = {};
		}

		add_cmd(name, {
			id: "rng" + i,
			cat: "RNG",
			title,
			desc,
			param,
			meta,
			func
		});

		i = i + 1;
	}

	register_cmd(["random", "r"], "<number> | <min> <max>", "Random", "Generate a random number between [1, <number] or between [<min>, <max>].", {minArgs: 1}, (chn, message, e, args) =>
	{
		if(!UTILS.isInt(args[0]) || (args[1] && !UTILS.isInt(args[1])))
		{
			UTILS.msg(chn, "-ERROR: This function cannot accept non-integer values.");
			return;
		}

		let min = Number(args[0]);
		let max = Number(args[1]);

		if(!args[1])
		{
			max = min;
			min = 1;
		}

		UTILS.msg(chn, "Rolled: " + UTILS.randInt(min, max));
	});

	register_cmd(["random_list", "randomlist", "rlist"], "<number>", "Random List", "Generate a randomly ordered list of numbers between 1 and <number>.", {minArgs: 1}, (chn, message, e, args) =>
	{
		if(!UTILS.isInt(args[0]))
		{
			UTILS.msg(chn, "-ERROR: This function cannot accept non-integer values.");
			return;
		}

		let n = Number(args[0]);

		if(n <= 0)
		{
			UTILS.msg(chn, "-ERROR: '<number>' in '" + PRE + "rlist' must be greater than 0");
			return;
		}

		if(n > 100)
		{
			UTILS.msg(chn, "-ERROR: '<number>' in '" + PRE + "rlist' cannot exceed 100");
			return;
		}

		let list = [1];

		for(let i = 1; i < n; i++)
		{
			let ind = Math.floor(Math.random() * (i + 1));
			list.splice(ind, 0, i + 1);
		}

		let out = "";

		for(let i = 0; i < n; i++)
			out += list[i] + "\n";

		if(out === "")
			UTILS.msg(chn, "-ERROR: '<number>' in '" + PRE + "rlist' must be a number.");
		else
			UTILS.msg(chn, out);
	});
	
	register_cmd(["random_choice", "randomchoice", "rchoice", "choice"], "<option 1> <option 2> [options]...", "Random Choice", "Choose 1 option out of the provided list at random.", {minArgs: 2}, (chn, message, e, args) =>
	{
		UTILS.msg(chn, args[UTILS.randInt(args.length)]);
	});
	
	register_cmd(["random_hex", "randomhex", "rhex", "hex"], "", "Random Hex", "Generate and view a random color made of 6 hexadecimal characters.", (chn, message, e, args) =>
	{
		let color = UTILS.rHex(6);
		e.setAuthor({name: "#" + color});
		e.setColor(color);

		UTILS.embed(chn, e);
	});
};
