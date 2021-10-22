import dotenv from "dotenv";
import Discord from "discord.js";
import CoinGecko from "coingecko-api";
import Cron from "node-cron";
import memoize from "memoizee";

dotenv.config();

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const LOCAL_CURRENCY = process.env.LOCAL_CURRENCY;
const CURRENCY_SYMBOL = process.env.CURRENCY_SYMBOL;
const BOT_PRICE_STATUS = process.env.BOT_PRICE_STATUS;

const COINS_MAP = {
	slp: "smooth-love-potion",
	axs: "axie-infinity",
};

const DiscordClient = new Discord.Client();
const CoinGeckoClient = new CoinGecko();

const pingApi = async () => {
	const data = await CoinGeckoClient.ping();

	return data;
};

const getCoin = (coinId) => {
	if (!COINS_MAP.hasOwnProperty(coinId)) {
		coinId = "slp";
	}

	return {
		id: COINS_MAP[coinId],
		symbol: coinId.toUpperCase(),
	};
};

const getPrice = memoize(
	async (coinId) => {
		const response = await CoinGeckoClient.simple.price({
			ids: [coinId],
			vs_currencies: [LOCAL_CURRENCY],
			include_last_updated_at: true,
		});

		console.log(Date.now(), response.data?.[coinId]);

		return response?.data?.[coinId]?.[LOCAL_CURRENCY] ?? null;
	},
	{
		maxAge: 60 * 1000,
	}
);

const replyUser = (msg, coin) => {
	const result = getPrice(coin.id);

	result
		.then((value) => {
			msg.reply(`Current ${coin.symbol} price is ${CURRENCY_SYMBOL}${value}`);
		})
		.catch((error) => {
			console.log(error);
		});
};

const setStatus = (coin) => {
	const result = getPrice(coin.id);

	result
		.then((value) => {
			DiscordClient.user.setActivity(
				`${coin.symbol} (${CURRENCY_SYMBOL}${value})`,
				{
					type: "WATCHING",
				}
			);
		})
		.catch((error) => {
			console.log(error);
		});
};

DiscordClient.on("ready", () => {
	console.log(`Logged in as ${DiscordClient.user.tag}!`);

	pingApi()
		.then((response) => console.log(response))
		.catch((error) => console.log(error));

	Cron.schedule("* * * * *", () => {
		setStatus(getCoin(BOT_PRICE_STATUS));
	});
});

DiscordClient.on("message", (msg) => {
	if (msg.content === "!slp") {
		replyUser(msg, getCoin("slp"));
	} else if (msg.content === "!axs") {
		replyUser(msg, getCoin("axs"));
	}
});

DiscordClient.login(DISCORD_TOKEN);
