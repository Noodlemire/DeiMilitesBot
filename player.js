module.exports = (g) =>
{
	const {UTILS} = g;

	class Player
	{
		id;
		num;
		nicknames;
		dispname;
		tags = {};

		constructor(id, num, nicknames, dispname, tags)
		{
			if(typeof id === "object")
			{
				for(let k in id)
					this[k] = id[k];
			}
			else
			{
				this.id = id;
				this.num = num;
				this.nicknames = nicknames;
				this.dispname = dispname;

				if(tags)
					for(let k in tags)
						this.tags[k] = tags[k];
			}
		}

		getStr(tagName, def)
		{
			let tag = this.tags[tagName.toLowerCase()];
			def = def || "";

			if(!tag) return def;

			return tag;
		}

		setStr(tagName, val)
		{
			this.tags[tagName.toLowerCase()] = String(val);
		}

		getInt(tagName, def)
		{
			let tag = this.tags[tagName.toLowerCase()];
			def = def || 0;

			if(!tag) return def;

			return parseInt(tag, 10);
		}

		setInt(tagName, val, nonNeg)
		{
			if(nonNeg && val < 0)
				this.tags[tagName.toLowerCase()] = "0";
			else
				this.tags[tagName.toLowerCase()] = String(val);
		}

		getNum(tagName, def)
		{
			let tag = this.tags[tagName.toLowerCase()];
			def = def || 0;

			if(!tag) return def;

			return parseFloat(tag);
		}

		setNum(tagName, val, nonNeg)
		{
			if(nonNeg && val < 0)
				this.tags[tagName.toLowerCase()] = "0";
			else
				this.tags[tagName.toLowerCase()] = String(val);
		}

		isAlive()
		{
			let damage = this.getInt("damage");
			let max_hp = this.getInt("max_hp", 1);

			return damage < max_hp;
		}

		getBool(tagName, def)
		{
			def = def || false;

			return UTILS.bool(this.tags[tagName.toLowerCase()], def);
		}

		setBool(tagName, val)
		{
			this.tags[tagName.toLowerCase()] = String(val);
		}

		hasAffinity(element)
		{
			let aff = this.tags.affinities;

			if(!aff) return false;

			aff = UTILS.libSplit(aff, ",", ":");

			return UTILS.bool(aff[element], false);
		}

		setAffinity(element, val)
		{
			let res = this.tags.affinities;
			let aff = UTILS.libSplit(this.tags.affinities, ",", ":");

			if(aff[element])
			{
				aff[element] = val;
				res = "";

				for(let k in aff)
					res += k + ":" + aff[k] + ",";

				this.tags.affinities = res.substring(0, res.length-2);
			}
			else
				this.tags.affinities = (res ? res + "," : "") + element + ":" + val;
		}

		heal(amount, canRevive)
		{
			if(amount < 0) amount = 0;

			let damage = this.getInt("damage");

			amount = Math.min(damage, amount);
			damage -= amount;

			this.setInt("damage", damage, true);
		}

		damage(amount)
		{
			if(amount < 0) amount = 0;

			let damage = this.getInt("damage");
			let max_hp = this.getInt("max_hp");

			this.setInt("damage", Math.min(damage + amount, max_hp), true);
		}
	}

	return Player;
};
