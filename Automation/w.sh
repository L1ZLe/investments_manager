#!/bin/bash

cd /home/l1zle/Investment-manager/Automation

# Run your last_run.js script and wait for it to finish
/home/l1zle/.nvm/versions/node/v20.12.1/bin/node last_run.js && wait

# Now, git commands will execute after both Node.js scripts have finished
cd /home/l1zle/Investment-manager/
git add .
git commit -m "saving weekly"
git push origin main
