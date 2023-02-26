-------------------------------------------------------------------------------------------------------------
Dei Milites Bot
-------------------------------------------------------------------------------------------------------------

This is a bot configured to help with running the Discord game known as Dei Milites. It allows you to manage players and their actions each round. It can auto-process bidding, casting, and spell creation as far as names and costs are concerned, among other things.

The two most important commands are "help", which brings up info about how to use any particular command, and "list", which can give you a list of all commands.

-------------------------------------------------------------------------------------------------------------
Making your own Dei Milites Bot
-------------------------------------------------------------------------------------------------------------

First, create a bot account and add it to your own server.
https://discordpy.readthedocs.io/en/stable/discord.html

Then, install Node.js and discord.js onto your PC, or whatever you decide to use for hosting. Make sure it's something that will allow the program to write its own local storage.
https://nodejs.org/en/
https://discord.js.org/

Lastly, put your bot account's TOKEN into the file "example.store.json" and then rename it to ".store.json"

From there, you should be able to run the bot using the Terminal prompt command: "./server.sh" as long as it's situated within the root of the bot's code. You want that file in particular, as it can automatically restart the bot in case anything ever goes wrong, as long as your machine itself is still running.
