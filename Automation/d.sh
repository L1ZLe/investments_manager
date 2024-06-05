#!/bin/bash

# Change directory to where your Node.js script is located
cd ~/investments_manager/d

# Run your Node.js script and wait for it to finish
node index.js &> ~/investments_manager/Automation/last_output_d.txt && wait

cd ~/investments_manager/Automation

# Run your last_run.js script and wait for it to finish
node last_run.js && wait

# Now, git commands will execute after both Node.js scripts have finished
cd ~/investments_manager/
git add .
git commit -m "saving daily"
git push origin main
