echo "Starting"

while : 
do
	node index.js

	if [ -f ".reset.txt" ]; then
		echo "Program exited successfully! Restarting immediately."
		rm ".reset.txt"
	else
		echo "Program terminated! Initiating sleep period."
		sleep 60
	fi
done

echo "Error: Something went horribly wrong."
