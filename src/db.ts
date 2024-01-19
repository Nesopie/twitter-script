import { pg } from "./db/connector";
import axios from "axios";
require("dotenv").config();

const token = process.env.TOKEN;
async function processLineByLine() {
    console.log("---------------------------------------------");
    console.log(new Date().toLocaleString());
    const headers = { Authorization: `Bearer ${token}` };
    let tweets = [];

    try {
        const result = await axios.get(
            "https://api.twitter.com/2/tweets/search/recent?query=garden_finance+planted&max_results=100",
            {
                headers,
            }
        );

        let next = result.data.meta.next_token;
        tweets = result.data.data;
        console.log(tweets.length);
        // while (next) {
        //     const result = await axios.get(
        //         "https://api.twitter.com/2/tweets/search/recent?query=garden_finance+planted&max_results=100&next_token=" +
        //             next,
        //         {
        //             headers,
        //         }
        //     );
        //     tweets = [...tweets, ...result.data.data];
        //     console.log(tweets.length);
        //     next = result.data.meta.next_token;
        // }
    } catch (err) {
        console.log(err);
    }

    const texts = tweets.map((datum) => datum.text);
    let hashes = texts.map((text) => {
        const words = text.split("\n");
        if (words[words.length - 1].length != 32) return undefined;
        return words[words.length - 1];
    });
    hashes = hashes.filter(Boolean);
    const map = new Map();
    hashes.forEach((hash) => map.set(hash, 1));

    console.log(map.size);
    let counter = 0;

    for (let [hash, _] of map) {
        const id = await pg
            .select("l.id")
            .from("leaderboard as l")
            .where(pg.raw(`l.twitter_hash like '${hash}'`))
            .orWhere(pg.raw(`l.new_twitter_hash like '${hash}'`));
        if (id.length == 0 || !id[0].id) continue;

        await pg.raw(
            `update leaderboard as l set is_tweeted = true where l.id = ${id[0].id}`
        );
        counter++;
    }

    console.log(counter);
}

(async () => {
    while (true) {
        await processLineByLine();
        await new Promise((resolve) => setTimeout(resolve, 60 * 1000));
    }
})();
