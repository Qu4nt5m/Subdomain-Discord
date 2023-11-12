const { Client, GatewayIntentBits, InteractionType, REST, Routes, ApplicationCommandOptionType, EmbedBuilder } = require('discord.js');
const { token, clientId, guildId, cloudflare } = require('./config.json');
const axios = require('axios');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {

    const commands = [{
        name: 'createsubdomain',
        description: 'Crea un subdominio para un servidor de Minecraft',
        options: [
            {
                name: 'nombre',
                type: ApplicationCommandOptionType.String,
                description: 'El nombre del subdominio',
                required: true,
            },
            {
                name: 'nodo',
                type: ApplicationCommandOptionType.String,
                description: 'El nombre del nodo',
                required: true,
            },
            {
                name: 'puerto',
                type: ApplicationCommandOptionType.Integer,
                description: 'El puerto del servidor',
                required: true,
            },
        ],
    }];      

    const rest = new REST({ version: '10' }).setToken(token);

    try {
        console.log('Empezando a actualizar los comandos de aplicación (/)');

        await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands },
        );

        console.log('Comandos de aplicación (/) actualizados con éxito');
    } catch (error) {
        console.error(error);
    }
});

const nodoToSubdomainMap = {
    'alameda': 'alameda.devifyme.lat',
};

function nodoToSubdomain(nodo) {
    return nodoToSubdomainMap[nodo] || null;
}

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === 'createsubdomain') {
        const nombre = interaction.options.getString('nombre');
        const nodo = interaction.options.getString('nodo');
        const puerto = interaction.options.getInteger('puerto');

        let target = nodoToSubdomain(nodo);

        if (!target) {
            await interaction.reply(`No se encontró un subdominio para el nodo: ${nodo}`);
            return;
        }

        const data = {
            type: 'SRV',
            name: nombre,
            data: {
                service: '_minecraft',
                proto: '_tcp',
                name: nombre,
                priority: 1,
                weight: 0,
                port: puerto,
                target: target,
            }
        };

        try {
            const response = await axios.post(`https://api.cloudflare.com/client/v4/zones/${cloudflare.zoneId}/dns_records`, data, {
                headers: {
                    'X-Auth-Email': cloudflare.email,
                    'X-Auth-Key': cloudflare.apiKey,
                    'Content-Type': 'application/json'
                }
            });
            const successEmbed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle('Subdominio Creado')
                .setDescription(`El subdominio ${nombre} ha sido creado con éxito.`)
                .setThumbnail('https://i.imgur.com/kf7I4Cy.png')
                .setTimestamp();
            await interaction.reply({ embeds: [successEmbed] });
            return response.data;
            
        } catch (error) {
            console.error('Error al crear el subdominio:', error);
            if (error.response) {
                console.error('Respuesta de Cloudflare:', error.response.data);
                if (error.response.data && error.response.data.errors && error.response.data.errors.some(e => e.code === 81057)) {
                    const errorEmbed = new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle('Error al Crear Subdominio')
                        .setDescription(`Hubo un error al crear el subdominio: ${error.message}`)
                        .setThumbnail('https://i.imgur.com/kf7I4Cy.png')
                        .setTimestamp();
                        await interaction.reply({ embeds: [errorEmbed] });
                } else {
                    await interaction.reply(`Hubo un error al crear el subdominio: ${error.message}`);
                }
            } else {
                await interaction.reply(`Hubo un error al crear el subdominio: ${error.message}`);
            }
        }
    }
});

client.login(token);
