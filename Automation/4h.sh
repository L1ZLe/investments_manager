#!/bin/bash

# Change directory to where your Node.js script is located
cd ~/investments_manager/4H

# Run your Node.js script and store its output in last_output.tx
node index.js &> ~/investments_manager/Automation/last_output_4h.txt && wait

cd ~/investments_manager/Automation

# Run your last_run.js script (output not stored)
node last_run.js && wait

# Now, git commands will execute after both Node.js scripts have finished
cd ~/investments_manager/
git add .
git commit -m "saving 4h"
git push origin main
