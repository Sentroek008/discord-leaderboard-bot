import os
import discord
import requests
import schedule
import time
import asyncio
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
DISCORD_TOKEN = os.getenv('DISCORD_TOKEN')
CHANNEL_ID = int(os.getenv('CHANNEL_ID'))
XFUN_API_KEY = os.getenv('XFUN_API_KEY')
XFUN_API_URL = 'https://api.x.fun/api/affiliate/external'

# Inisialisasi bot Discord
intents = discord.Intents.default()
client = discord.Client(intents=intents)

async def get_leaderboard_data():
    """Mengambil data leaderboard dari X.fun API"""
    headers = {
        'Authorization': f'Bearer {XFUN_API_KEY}',
        'Content-Type': 'application/json'
    }
    
    params = {
        'code': 'CHROME'  # Parameter untuk kode affiliasi
    }
    
    try:
        response = requests.get(XFUN_API_URL, headers=headers, params=params)
        response.raise_for_status()
        print(f"API Response: {response.text}")  # Debug: melihat response dari API
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error mengambil data leaderboard: {e}")
        return None

async def send_leaderboard_message():
    """Mengirim pesan leaderboard ke channel Discord"""
    channel = client.get_channel(CHANNEL_ID)
    if channel is None:
        print(f"Error: Channel dengan ID {CHANNEL_ID} tidak ditemukan")
        return

    data = await get_leaderboard_data()
    if data is None:
        await channel.send("Maaf, terjadi kesalahan saat mengambil data leaderboard.")
        return

    # Format pesan leaderboard
    embed = discord.Embed(
        title="X.fun Leaderboard - CHROME",
        description="Update terakhir: " + datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        color=discord.Color.blue()
    )

    # Debug: tampilkan struktur data yang diterima
    print(f"Data structure: {data}")

    # Coba tampilkan data yang tersedia
    if isinstance(data, dict):
        for key, value in data.items():
            embed.add_field(
                name=str(key),
                value=str(value),
                inline=False
            )
    elif isinstance(data, list):
        for item in data[:10]:  # Ambil 10 item pertama jika datanya berbentuk list
            embed.add_field(
                name="Entry",
                value=str(item),
                inline=False
            )

    await channel.send(embed=embed)

async def schedule_checker():
    """Mengecek dan menjalankan tugas terjadwal"""
    while True:
        schedule.run_pending()
        await asyncio.sleep(1)

@client.event
async def on_ready():
    print(f'{client.user} telah berhasil login!')
    
    # Jadwalkan pengiriman leaderboard setiap 6 jam
    schedule.every(6).hours.do(lambda: asyncio.create_task(send_leaderboard_message()))
    
    # Tambahkan command untuk mengecek leaderboard secara manual
    @client.event
    async def on_message(message):
        if message.author == client.user:
            return

        if message.content.lower() == '!leaderboard':
            await send_leaderboard_message()
    
    # Mulai schedule checker
    await schedule_checker()

# Jalankan bot
client.run(DISCORD_TOKEN)
