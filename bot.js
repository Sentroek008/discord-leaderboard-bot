require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, REST, Routes } = require('discord.js');
const fetch = require('node-fetch');
const schedule = require('node-schedule');

// Konfigurasi dari environment variables
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const XFUN_API_KEY = process.env.XFUN_API_KEY;
const XFUN_API_URL = 'https://api.x.fun/api/affiliate/external';

// Default start date
const DEFAULT_START_DATE = '2025-03-24';

// Pesan reward default
const REWARD_MESSAGE = `**X.FUN LEADERBOARD REWARDS**
🥇$200
🥈$125
🥉$75`;

// Variabel untuk menyimpan ID pesan terakhir
let lastMessageId = null;

// Variabel untuk menyimpan pesan kustom tambahan
let customMessage = '';

// Inisialisasi bot Discord dengan intents yang benar
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages
    ]
});

// Fungsi untuk format angka dengan 2 desimal dan pemisah ribuan
function formatNumber(num) {
    return Number(num).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Fungsi untuk mendapatkan medal emoji berdasarkan ranking
function getMedal(index) {
    switch(index) {
        case 0: return '🥇';
        case 1: return '🥈';
        case 2: return '🥉';
        default: return '🎮';
    }
}

// Fungsi untuk mengambil data leaderboard
async function getLeaderboardData() {
    try {
        console.log('Trying to fetch data from API...');
        console.log('URL:', `${XFUN_API_URL}?code=CHROME`);
        console.log('Headers:', {
            'X-Apikey': XFUN_API_KEY,
            'Content-Type': 'application/json'
        });

        const response = await fetch(`${XFUN_API_URL}?code=CHROME`, {
            headers: {
                'X-Apikey': XFUN_API_KEY,
                'Content-Type': 'application/json'
            }
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response body:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
        }

        const data = await response.json();
        console.log('API Response:', JSON.stringify(data, null, 2));
        return data;
    } catch (error) {
        console.error('Error detail:', error);
        console.error('Stack trace:', error.stack);
        return null;
    }
}

// Fungsi untuk mengatur pesan kustom tambahan
function setCustomMessage(message) {
    customMessage = message;
    return '✅ Custom message has been set!';
}

// Fungsi untuk mengirim pesan leaderboard
async function sendLeaderboardMessage(interaction = null, startDate = DEFAULT_START_DATE) {
    try {
        if (interaction) {
            await interaction.deferReply();
        }

        const data = await getLeaderboardData();
        if (!data || !data.data) {
            const errorMessage = '❌ Sorry, there was an error fetching the leaderboard data.';
            if (interaction) {
                await interaction.editReply({ content: errorMessage });
            } else {
                const channel = client.channels.cache.get(CHANNEL_ID);
                if (channel) await channel.send(errorMessage);
            }
            return;
        }

        // Filter data berdasarkan tanggal
        const startDateTime = new Date(startDate).getTime();
        const filteredData = data.data.filter(item => {
            const itemDate = new Date(item.createdAt).getTime();
            return itemDate >= startDateTime;
        });

        // Hitung total wager dan deposit
        let totalWager = 0;
        let totalDeposit = 0;
        filteredData.forEach(item => {
            totalWager += Number(item.wagered) || 0;
            totalDeposit += Number(item.deposited) || 0;
        });

        const embed = new EmbedBuilder()
            .setTitle('🏆 X.fun Leaderboard - CHROME')
            .setDescription(
                `${REWARD_MESSAGE}\n\n` +
                `${customMessage ? `${customMessage}\n\n` : ''}` +
                `**📊 Statistics Overview**\n` +
                `> 👥 Total Players: **${filteredData.length}**\n` +
                `> 💰 Total Wagered: **$${formatNumber(totalWager)}**\n` +
                `> 💵 Total Deposited: **$${formatNumber(totalDeposit)}**\n` +
                `> 📅 Since: **${new Date(startDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                })}**\n\n` +
                `**🎯 Top 10 Players**`
            )
            .setColor('#FFD700')
            .setTimestamp()
            .setFooter({ 
                text: 'Last Updated', 
                iconURL: 'https://cdn.discordapp.com/embed/avatars/0.png' 
            });

        // Urutkan data berdasarkan wagered tertinggi
        const sortedData = filteredData.sort((a, b) => b.wagered - a.wagered);

        // Ambil 10 teratas
        sortedData.slice(0, 10).forEach((item, index) => {
            const medal = getMedal(index);
            const percentWager = totalWager > 0 ? ((item.wagered / totalWager) * 100).toFixed(1) : 0;
            embed.addFields({
                name: `${medal} ${index + 1}. ${item.name}`,
                value: `💵 **$${formatNumber(item.deposited)}** deposited • 💰 **$${formatNumber(item.wagered)}** wagered *(${percentWager}% of total)*`,
                inline: false
            });
        });

        const messageOptions = { embeds: [embed] };
        if (interaction) {
            await interaction.editReply(messageOptions);
        } else {
            const channel = client.channels.cache.get(CHANNEL_ID);
            if (channel) {
                try {
                    // Hapus pesan sebelumnya jika ada
                    if (lastMessageId) {
                        try {
                            const oldMessage = await channel.messages.fetch(lastMessageId);
                            if (oldMessage) {
                                await oldMessage.delete();
                                console.log('Previous message deleted successfully');
                            }
                        } catch (error) {
                            console.error('Error deleting previous message:', error);
                            // Reset lastMessageId jika pesan sudah tidak ada
                            if (error.code === 10008) { // Unknown Message error
                                lastMessageId = null;
                                console.log('Reset lastMessageId due to unknown message');
                            }
                        }
                    }

                    // Kirim pesan baru
                    const newMessage = await channel.send(messageOptions);
                    lastMessageId = newMessage.id;
                    console.log('New message sent with ID:', lastMessageId);
                } catch (error) {
                    console.error('Error in message management:', error);
                }
            }
        }
    } catch (error) {
        console.error('Error in sendLeaderboardMessage:', error);
        const errorMessage = '❌ An error occurred while processing the leaderboard data.';
        if (interaction) {
            if (interaction.deferred) {
                await interaction.editReply({ content: errorMessage });
            } else {
                await interaction.reply({ content: errorMessage, ephemeral: true });
            }
        }
    }
}

// Fungsi untuk mendapatkan detail user
async function getUserDetail(username) {
    try {
        const data = await getLeaderboardData();
        if (!data || !data.data) {
            return null;
        }

        // Cari user berdasarkan username (case insensitive)
        const user = data.data.find(item => 
            item.name.toLowerCase() === username.toLowerCase()
        );

        return user;
    } catch (error) {
        console.error('Error in getUserDetail:', error);
        return null;
    }
}

// Event saat bot siap
client.once('ready', async () => {
    console.log(`Bot has logged in as ${client.user.tag}`);
    
    // Mendaftarkan slash commands untuk setiap guild yang bot ada di dalamnya
    const guilds = client.guilds.cache;
    
    const commands = [
        {
            name: 'leaderboard',
            description: 'Display X.fun leaderboard for CHROME code',
            options: [
                {
                    name: 'start_date',
                    description: 'Start date for data (format: YYYY-MM-DD, default: 2025-03-24)',
                    type: 3,
                    required: false
                }
            ]
        },
        {
            name: 'setmessage',
            description: 'Set a custom message to display above the leaderboard',
            options: [
                {
                    name: 'message',
                    description: 'The message to display (leave empty to remove)',
                    type: 3,
                    required: false
                }
            ]
        },
        {
            name: 'user',
            description: 'Get detailed information about a specific user',
            options: [
                {
                    name: 'username',
                    description: 'Username to look up',
                    type: 3,
                    required: true
                }
            ]
        }
    ];

    for (const [guildId, guild] of guilds) {
        try {
            console.log(`Registering commands for guild ${guild.name}...`);
            const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
            await rest.put(
                Routes.applicationGuildCommands(client.user.id, guildId),
                { body: commands }
            );
            console.log(`Commands successfully registered in guild ${guild.name}!`);
        } catch (error) {
            console.error(`Error registering commands in guild ${guild.name}:`, error);
        }
    }
    
    // Jadwalkan update leaderboard setiap 30 menit
    schedule.scheduleJob('*/30 * * * *', () => {
        console.log(`Scheduled update at ${new Date().toLocaleString()}`);
        sendLeaderboardMessage();
    });
});

// Event untuk slash commands
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'leaderboard') {
        const startDate = interaction.options.getString('start_date') || DEFAULT_START_DATE;
        await sendLeaderboardMessage(interaction, startDate);
    } else if (interaction.commandName === 'setmessage') {
        const message = interaction.options.getString('message') || '';
        const response = setCustomMessage(message);
        await interaction.reply({ content: response, ephemeral: true });
    } else if (interaction.commandName === 'user') {
        const username = interaction.options.getString('username');
        await interaction.deferReply();

        const user = await getUserDetail(username);
        if (!user) {
            await interaction.editReply({ content: `❌ User "${username}" not found.` });
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle(`👤 User Details - ${user.name}`)
            .setDescription(
                `**📊 Statistics**\n` +
                `> 💵 Deposited: **$${formatNumber(user.deposited)}**\n` +
                `> 💰 Wagered: **$${formatNumber(user.wagered)}**\n` +
                `> 📅 Joined: **${new Date(user.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                })}**`
            )
            .setColor('#3498db')
            .setTimestamp()
            .setFooter({ 
                text: 'User Info', 
                iconURL: 'https://cdn.discordapp.com/embed/avatars/0.png' 
            });

        await interaction.editReply({ embeds: [embed] });
    }
});

// Login bot
client.login(DISCORD_TOKEN);
