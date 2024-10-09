"use strict";

const mysql  = require("promise-mysql");
const config = require("../config/db/exam.json");
let db;




(async function() {
    db = await mysql.createConnection(config);

    process.on("exit", () => {
        db.end();
    });
})();


module.exports= {
    "meny": meny
};

const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function exitprogram(exitcode=0) {
    console.log("Exiting program.");
    process.exit(exitcode);
}

function showmenu() {
    console.log(`
        Choose something from the menu:

        exit, quit                  Exits the program.
        menu, help                  Show this menu.
        rapporter
        search (??)
    `);
}

async function meny() {
    rl.setPrompt("Enter input: ");
    rl.prompt();
    rl.on("close", exitprogram);
    rl.on("line", async function(input) {
        input = input.trim();
        let parts = input.split(" ");


        switch (parts[0]) {
            case "quit":
            case "exit":
                exitprogram();
                break;
            case "menu":
            case "help":
                showmenu();
                break;
            case "rapporter":
                rapporter();
                break;
            case "search":
                search(parts[1]);
                break;
            case "report":
                report();
                break;
            default:
                showmenu();
                break;
        }
    });
}

async function rapporter() {
    const db = await mysql.createConnection(config);
    let res;
    let sql;

    sql=  `
    call rapport2();
    `;
    res = await db.query(sql);
    console.table(res[0]);
}

async function search(search) {
    let sql= `CALL search2(?);`;
    let res;

    res = await db.query(sql, [search]);
    console.table(res[0]);
}

async function report() {
    let sql1= `CALL rapport3();`;
    let res1;

    res1 = await db.query(sql1);
    console.table(res1[0]);
}
