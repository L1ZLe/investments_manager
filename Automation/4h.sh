#!/bin/bash

# Change directory to where your Node.js script is located
cd /data/data/com.termux/files/home/Investment-manager/4H

# Run your Node.js script and store its output in last_output.tx
/data/data/com.termux/files/usr/bin/node index.js &> /data/data/com.termux/files/home/Investment-manager/Automation/last_output_4h.txt && wait

cd /data/data/com.termux/files/home/Investment-manager/Automation

# Run your last_run.js script (output not stored)
node last_run.js && wait

# Now, git commands will execute after both Node.js scripts have finished
cd  /data/data/com.termux/files/home/Investment-manager/
git add .
git commit -m "saving 4h"
git push origin main
