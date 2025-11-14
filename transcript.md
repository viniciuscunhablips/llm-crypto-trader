**YouTube Video Transcript: Alpha Arena Crypto LLM Competition**

[Intro Music]

Hey folks, welcome back to Euclidean AI. This week, we're diving into an interesting benchmark called the Alpha Arena which is an LLM Cryptocurrency Competition ran by a research lab called nof1.ai.

What is this benchmark about? It's a competition putting six frontier large language models against each other. These include GPT-5, Claude Sonnet 4.5, Gemini 2.5 Pro, Grok 4, DeepSeek Chat V3.1, and Qwen 3 Max. These are some of the most advanced large language models available on the market today.

The task is designed to measure AI's investing capabilities. Each model is given $10,000 of real money in real markets, with identical prompts and input data.

The goal of Alpha Arena is to make benchmarks more like the real world. Financial markets are perfect for this—they're dynamic, adversarial, open-ended, and endlessly unpredictable. They challenge AI in ways that static benchmarks simply cannot.

Here are the simple competition rules:

- Starting capital: Each model gets $10,000 of real capital.
- They compete in crypto perpetuals on Hyperliquid.
- The objective is to maximize risk-adjusted returns.
- All model outputs and their corresponding traces are public.
- Each model must produce alpha, time trades, and manage risk effectively.

TIP: Alpha, in this context, refers to the extra returns a trading model generates compared to the overall market or a benchmark. If a model produces positive alpha, it means it's outperforming the market through its strategy.

The first season has already ended. It ran from October 18th to November 3rd, 2025.

Qwen was the standout performer, showing a dramatic trajectory over the two-week competition. It started off slowly, dipped a bit, then ramped up to nearly a 100% return at the midpoint before settling back down and finishing with a solid 22.88% gain. DeepSeek V3.1 came in second, kicking off with strong returns—over 40% in just two days—then fluctuating before peaking at 130%. It eventually stabilized around 40%, but just before the finish line, its returns dropped to 24.76%. Notably, only Qwen and DeepSeek managed to outperform the Bitcoin benchmark, which served as a reference point for the competition.

Looking at the chart, you can see that around October 28th, the market turned bullish, and four models hit their highest returns at that time. However, only Qwen and DeepSeek ended up above the Bitcoin reference line. The other models lagged behind: Claude Sonnet 4.5 finished third but lost about a third of its starting capital, ending with $6,740 from an initial $10,000. Grok 4 ended with $5,226, nearly half its starting capital. Gemini 2.5 Pro and GPT-5 performed surprisingly poorly, each losing more than half their initial $10,000 over the two-week trading period.
 

What's Crypto Perpetuals on Hyperliquid

For those of you who don’t frequently trade crypto futures or perpetuals including myself, let's talk about derivatives and derivative contracts. A derivative is a financial product whose value is based on, or "derived from," something else—like a stock, commodity, or cryptocurrency. For example, imagine you and a friend make a bet on whether the price of Bitcoin will go up or down next week. The bet itself doesn't involve owning Bitcoin, but its value depends on Bitcoin's price. That's the idea behind derivatives.

Derivative contracts, like futures, are formal agreements to buy or sell an asset at a specific price on a future date. In traditional markets, futures contracts always have an expiry date. For instance, if you buy a gold futures contract that expires in December, you must settle the contract—either by selling it or taking delivery—when December comes. The expiry date matters because it forces traders to close or settle their positions, which can lead to sudden price changes as the date approaches.

Crypto perpetual contracts are a special kind of derivative. Unlike traditional futures, they never expire. This means traders can hold their positions for as long as they want, without worrying about a settlement date. The lack of expiry makes perpetuals more flexible, but it also means prices can move differently compared to traditional futures, especially since there's no deadline forcing trades to close.

So, how does the "betting" work if there's no expiry date? Let's break it down with a simple example. Suppose you think the price of Bitcoin will go up, so you buy a Bitcoin perpetual contract with $500. You're essentially betting that Bitcoin's price will rise. If it does, you can sell your contract later for a profit. If the price drops, you lose money. The key is, you can choose when to close your position—there's no deadline forcing you to settle.

Now, what if you think Bitcoin's price will fall? You can "short" the perpetual contract. This means you profit if the price goes down and lose if it goes up. In both cases, your gain or loss depends on how much the price moves after you enter the trade and when you decide to exit. Perpetuals let you stay in the trade as long as you want, but you need to watch your position carefully, because the market can move quickly and leverage can amplify both profits and losses.

Let's walk through a full example to make this crystal clear. Imagine one of the LLMs in the competition starts with $10,000 and decides to invest in Bitcoin perpetuals. Suppose the model thinks Bitcoin's price will drop, so it chooses to "short" Bitcoin. It opens a short position with $2,000. This means if Bitcoin's price goes down, the model makes money; if it goes up, the model loses money.
 
Now, the model can choose to use leverage. For example, with 5x leverage, that $2,000 controls a $10,000 position. If Bitcoin drops by 10%, the model could make $1,000 (10% of $10,000), but if Bitcoin rises by 10%, it could lose $1,000. Leverage amplifies both gains and losses, so it's powerful but risky.

If the model decides to hold the position, it simply keeps the trade open, watching how the market moves. There's no expiry date, so it can close the position whenever it wants. When the model chooses to close the trade—whether it's a short or a long (betting the price will go up)—it either locks in a profit or takes a loss, depending on how the price changed while the position was open.

This flexibility to buy, sell, go long or short, and use leverage is what makes crypto perpetuals so interesting for both human and AI traders. It allows for a wide range of strategies, but also requires careful risk management.

---

**Part 2: How to Use the LLM Crypto Trader Python Repository**

Now, the second part of this video is a hands-on demonstration of the repository I built to replicate the data pipeline and trading algorithm that Alpha Areana benchmark uses. While some basic Python knowledge is helpful, you don't need deep technical experience. Entry level Python skills with the support of AI coding tools are enough to get started. Python is a great choice for trading and analytics in general because of its huge ecosystem and active community. So, let's dive in and see how it works!

> **Disclaimer:** This content is for educational and research purposes only. It is not financial advice. If you choose to use these tools or strategies for real trading, you do so at your own risk. Always do your own research and consult with a professional before participating crypto markets.

First, what does this repository do? It's a modular Python backend for simulating LLM-driven cryptocurrency perpetual trading, commonly known as "paper trading." The bot fetches market data from Binance every 3 minutes, including the latest candle data for supported coins. Each Binance candle contains the open, high, low, and close prices, trading volume, and timestamp for a specific interval—providing a snapshot of market activity and price movement. The bot calculates technical indicators such as EMA, RSI, and MACD, then sends this information to Google Gemini AI to generate trading signals. The bot manages open positions, calculates profit and loss, and tracks your portfolio equity. All activity and data—including trades, AI decisions, and portfolio changes—are logged to CSV files for easy analysis and monitoring.

Ok.Let's just spin up this repository locally and see it in action. 

**How to set it up:**

1. Install the `uv` package manager (if you don't have it already).
2. Install dependencies by running `uv sync` in your terminal.
3. Create a `.env` file with your Binance and Gemini API keys. 
5. Start the bot by running `uv run python main.py`.

**Architecture overview:**
- `src/market_data.py`: Handles market data fetching.
- `src/indicators.py`: Calculates technical indicators.
- `src/llm_client.py`: Connects to Google Gemini AI.
- `src/position_manager.py`: Manages positions and P&L.
- `src/trading_bot.py`: Orchestrates the whole process.
- `main.py`: Entry point to run the bot.

**Configuration:**
- You can trade ETH, SOL, XRP, BTC, DOGE, and BNB.
- The bot runs every 3 minutes and starts with a $10,000 paper trading balance.

**Logging and simulation:**
- The bot supports different logging levels—set `ENVIRONMENT=development` for detailed logs, or `production` for standard logs.
- All trading is simulated (paper trading), so no real money is at risk. The bot assumes perfect execution, instant order fills, and no hidden fees, making it ideal for testing strategies.

**Data files:**
- `data/portfolio_state.csv`: Tracks your portfolio over time.
- `data/trade_history.csv`: Records every trade.
- `data/ai_decisions.csv`: Logs AI decisions.
- `data/market_snapshots.csv`: Saves market data and indicators.

**Onboarding Instructions:**

Once you join my website, you will find the link to the repository in one of the courses there. Getting started is straightforward—just follow the instructions in the README file. The README provides detailed steps on how to run the repository and explains key concepts.

To hit the ground running, the first step is to install UV, a Python package and runtime manager. If you don't have UV on your machine, visit the UV website to download and install it. Once you have the repository link, you can clone it and run it locally.

After cloning, use UV to install the required dependencies by running `uv sync`. Next, create a `.env` file. You'll find a `.env.example` in the repository. You need two API keys: one from Binance (for market data, which requires a free Binance account), and one from your chosen LLM provider. For demo purposes, Gemini 2.5 Flash is used, but you can use Gemini 2.5 Pro or other LLMs via orchestrators like OpenRouter, or by registering and obtaining API keys individually.

To run the bot, simply execute `uv run python main.py`. This will start the bot.

Here's a quick overview of the modules in the `src` directory:

- **market_data.py**: Fetches market data from Binance every 3 minutes, including candle data (timestamp, open, high, low, close, volume, etc.).
- **indicators.py**: Calculates market indicators such as EMA (Exponential Moving Average), RSI (Relative Strength Index), and MACD (Moving Average Convergence Divergence).
- **llm_client.py**: A wrapper class for LLM models, handling decision-making based on market indicators.
- **position_manager.py**: Calculates unrealized P&L and total equity at the end of each trading cycle.
- **trading_bot.py**: Orchestrates the main bot workflow.

Once you have the bot up and running, I just want to show you where the data is saved—it's under the `data` directory. If you open `market_snapshots.csv`, you'll see all the market indicators saved at every trading cycle. You also have `portfolio_state.csv`, which records your net position at each trading cycle, and `trade_history.csv`, which logs every trade decision made by the LLM.

**Final thoughts:**
Ok, that's the end of this episode. 

If you have questions or want to see more tutorials, let me know in the comments. Don't forget to like and subscribe for more content!

[Outro Music]










