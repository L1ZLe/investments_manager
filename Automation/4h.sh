#!/bin/bash

# Change directory to where your Node.js script is located
cd /home/l1zle/Investment-manager/4H

# Run your Node.js script and store its output in last_output.txt
/home/l1zle/.nvm/versions/node/v20.12.1/bin/node index.js &> /home/l1zle/Investment-manager/Automation/last_output_4h.txt && wait

cd /home/l1zle/Investment-manager/Automation

# Run your last_run.js script (output not stored)
/home/l1zle/.nvm/versions/node/v20.12.1/bin/node last_run.js && wait

# Now, git commands will execute after both Node.js scripts have finished
cd /home/l1zle/Investment-manager/
git add .
git commit -m "saving 4h"
git push origin main
