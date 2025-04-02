# Discord Leaderboard Bot

A Discord bot that displays X.fun leaderboard data with automatic updates.

## Features

- Display leaderboard data with `/leaderboard` command
- Automatic updates every 30 minutes
- Filter data by start date
- Custom messages support
- Reward information display

## Environment Variables

Create a `.env` file with:
```
DISCORD_TOKEN=your_discord_bot_token
CHANNEL_ID=your_channel_id
XFUN_API_KEY=your_xfun_api_key
```

## Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables
4. Run the bot:
   ```bash
   npm start
   ```

## Deployment

This bot can be deployed to various cloud platforms:

### Heroku
1. Create a Heroku account
2. Create a new app
3. Connect your GitHub repository
4. Set environment variables in Settings > Config Vars
5. Deploy from GitHub

### Railway
1. Create a Railway account
2. Create a new project
3. Connect your GitHub repository
4. Add environment variables
5. Deploy

## Commands

- `/leaderboard [start_date]` - Display leaderboard data
- `/setmessage [message]` - Set custom message above leaderboard

## Support

For support, please contact the developer.
