# Ticket Bot

Just a super quick ticket bot for [my freelancing & homework help Discord](https://discord.gg/SSwhHH3GUr). This gave me a chance to try out upcoming technologies, like `Bun` and `Biome`.

## Todo

- [x] Basic Tickets Opening & Closing
- [x] Stripe Intergated Payments
    - [ ] Automatically Updating Invoice Status
    - [ ] Customer Information Handling
- [ ] Message Transcript
- [ ] Ticket Info
    - [ ] Set Ticket Price
    - [ ] Paid Status
- [ ] Close Ticket Prompt (for reason)

## Tech Stack

- `Biome`: All inclusive formatting and linting. No massive bloat from prettier and eslint plugins.
- `Bun`: For its simplicity, speed, and TypeScript compatibility.
- `LowDB`: Chosen over Mongo for its simplicity. Avoids hosting a server, store all data in memory (yay!), persist in a JSON file.
- `Orbiting`: Easy pop-up control panel for controlling the live app. Removes the need for me to setup configuration commands.
