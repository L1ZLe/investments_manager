import fs from "fs"

const date = new Date().toISOString()
console.log(`The Date is : ${date}`)
fs.writeFileSync("last_run.txt", date)
