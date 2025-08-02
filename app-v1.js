// Configuración global
let supabaseClient = null;
let allPlayersData = [];
let filteredPlayersData = [];
let currentPlayerData = null;
let charts = {};

// Configuración de Supabase
const SUPABASE_CONFIG_KEY = 'supabase_config';

// Elementos del DOM
const elements = {
    loadingIndicator: document.getElementById('loadingIndicator'),
    playersContainer: document.getElementById('playersContainer'),
    playersList: document.getElementById('playersList'),
    playerSearch: document.getElementById('playerSearch'),
    positionFilter: document.getElementById('positionFilter'),
    teamFilter: document.getElementById('teamFilter'),
    weekFilter: document.getElementById('weekFilter'),
    rosteredFilter: document.getElementById('rosteredFilter'),
    rosteredValue: document.getElementById('rosteredValue'),
    sortBy: document.getElementById('sortBy'),
    sortOrder: document.getElementById('sortOrder'),
    refreshBtn: document.getElementById('refreshBtn'),
    totalPlayers: document.getElementById('totalPlayers'),
    filteredPlayers: document.getElementById('filteredPlayers'),
    lastUpdate: document.getElementById('lastUpdate'),
    playerModal: document.getElementById('playerModal'),
    configModal: document.getElementById('configModal'),
    configBtn: document.getElementById('configBtn'),
    supabaseUrl: document.getElementById('supabaseUrl'),
    supabaseKey: document.getElementById('supabaseKey'),
    saveConfig: document.getElementById('saveConfig'),
    testConnection: document.getElementById('testConnection'),
    statusInfo: document.getElementById('statusInfo')
};

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    // Verificar que todas las librerías estén cargadas
    if (typeof Chart === 'undefined') {
        showError('Error: Chart.js no se ha cargado correctamente. Verifica tu conexión a internet.');
        return;
    }
    
    if (typeof supabase === 'undefined') {
        showError('Error: Supabase no se ha cargado correctamente. Verifica tu conexión a internet y recarga la página.');
        return;
    }
    
    console.log('Todas las librerías cargadas correctamente (Supabase v1)');
    initializeApp();
    setupEventListeners();
    loadSavedConfig();
});

// Configuración inicial de la aplicación
function initializeApp() {
    updateRosteredValue();
    showLoadingState();
    
    // Ocultar mensaje de estado después de 5 segundos
    setTimeout(() => {
        if (elements.statusInfo) {
            elements.statusInfo.style.display = 'none';
        }
    }, 5000);
    
    // Verificar si hay configuración guardada
    const savedConfig = localStorage.getItem(SUPABASE_CONFIG_KEY);
    if (!savedConfig) {
        showConfigModal();
    } else {
        const config = JSON.parse(savedConfig);
        initializeSupabase(config.url, config.key);
    }
}

// Configurar todos los event listeners
function setupEventListeners() {
    // Búsqueda y filtros
    elements.playerSearch.addEventListener('input', debounce(filterPlayers, 300));
    elements.positionFilter.addEventListener('change', filterPlayers);
    elements.teamFilter.addEventListener('change', filterPlayers);
    elements.weekFilter.addEventListener('change', filterPlayers);
    elements.rosteredFilter.addEventListener('input', updateRosteredValue);
    elements.rosteredFilter.addEventListener('change', filterPlayers);
    
    // Ordenamiento
    elements.sortBy.addEventListener('change', sortPlayers);
    elements.sortOrder.addEventListener('click', toggleSortOrder);
    
    // Botones de acción
    elements.refreshBtn.addEventListener('click', refreshData);
    elements.configBtn.addEventListener('click', showConfigModal);
    elements.saveConfig.addEventListener('click', saveSupabaseConfig);
    elements.testConnection.addEventListener('click', testSupabaseConnection);
    
    // Modales
    setupModalEvents();
}

// Configurar eventos de modales
function setupModalEvents() {
    // Cerrar modales
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });
    
    // Cerrar modal al hacer clic fuera
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });
}

// Cargar configuración guardada
function loadSavedConfig() {
    const savedConfig = localStorage.getItem(SUPABASE_CONFIG_KEY);
    if (savedConfig) {
        const config = JSON.parse(savedConfig);
        elements.supabaseUrl.value = config.url || '';
        elements.supabaseKey.value = config.key || '';
    }
}

// Inicializar cliente de Supabase (versión 1)
function initializeSupabase(url, key) {
    try {
        // Para Supabase v1, usar directamente supabase.createClient
        supabaseClient = supabase.createClient(url, key);
        console.log('Cliente de Supabase v1 inicializado correctamente');
        loadPlayersData();
    } catch (error) {
        console.error('Error inicializando Supabase:', error);
        showError('Error al conectar con Supabase: ' + error.message + '. Por favor, verifica tu configuración y recarga la página.');
        showConfigModal();
    }
}

// Cargar datos de jugadores
async function loadPlayersData() {
    if (!supabaseClient) {
        showError('Supabase no está configurado');
        return;
    }
    
    showLoadingState();
    
    try {
        const { data, error } = await supabaseClient
            .from('nfl_fantasy_trends')
            .select('*')
            .order('scraped_at', { ascending: false });
        
        if (error) {
            throw error;
        }
        
        allPlayersData = data || [];
        filteredPlayersData = [...allPlayersData];
        
        populateFilters();
        updateStats();
        renderPlayersList();
        hideLoadingState();
        
    } catch (error) {
        console.error('Error cargando datos:', error);
        showError('Error al cargar los datos de jugadores: ' + error.message);
        hideLoadingState();
    }
}

// Poblar filtros dinámicamente
function populateFilters() {
    const teams = [...new Set(allPlayersData.map(player => player.team))].sort();
    const weeks = [...new Set(allPlayersData.map(player => player.semana))].sort((a, b) => a - b);
    
    // Poblar filtro de equipos
    elements.teamFilter.innerHTML = '<option value="">Todos los equipos</option>';
    teams.forEach(team => {
        if (team) {
            const option = document.createElement('option');
            option.value = team;
            option.textContent = team;
            elements.teamFilter.appendChild(option);
        }
    });
    
    // Poblar filtro de semanas
    elements.weekFilter.innerHTML = '<option value="">Todas las semanas</option>';
    weeks.forEach(week => {
        if (week) {
            const option = document.createElement('option');
            option.value = week;
            option.textContent = `Semana ${week}`;
            elements.weekFilter.appendChild(option);
        }
    });
}

// Actualizar estadísticas
function updateStats() {
    const uniquePlayers = new Set(allPlayersData.map(player => player.player_id)).size;
    elements.totalPlayers.textContent = uniquePlayers;
    elements.filteredPlayers.textContent = new Set(filteredPlayersData.map(player => player.player_id)).size;
    
    if (allPlayersData.length > 0) {
        const latestDate = new Date(Math.max(...allPlayersData.map(player => new Date(player.scraped_at))));
        elements.lastUpdate.textContent = latestDate.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// Filtrar jugadores
function filterPlayers() {
    const searchTerm = elements.playerSearch.value.toLowerCase();
    const positionFilter = elements.positionFilter.value;
    const teamFilter = elements.teamFilter.value;
    const weekFilter = elements.weekFilter.value;
    const rosteredMin = parseInt(elements.rosteredFilter.value);
    
    filteredPlayersData = allPlayersData.filter(player => {
        const matchesSearch = player.player_name.toLowerCase().includes(searchTerm);
        const matchesPosition = !positionFilter || player.position === positionFilter;
        const matchesTeam = !teamFilter || player.team === teamFilter;
        const matchesWeek = !weekFilter || player.semana === parseInt(weekFilter);
        const matchesRostered = player.percent_rostered >= rosteredMin;
        
        return matchesSearch && matchesPosition && matchesTeam && matchesWeek && matchesRostered;
    });
    
    updateStats();
    renderPlayersList();
}

// Renderizar lista de jugadores
function renderPlayersList() {
    const latestPlayerData = getLatestPlayerData();
    
    elements.playersList.innerHTML = '';
    
    if (latestPlayerData.length === 0) {
        elements.playersList.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <p>No se encontraron jugadores con los filtros aplicados</p>
            </div>
        `;
        return;
    }
    
    latestPlayerData.forEach(player => {
        const playerCard = createPlayerCard(player);
        elements.playersList.appendChild(playerCard);
    });
}

// Obtener datos más recientes por jugador
function getLatestPlayerData() {
    const playerMap = new Map();
    
    filteredPlayersData.forEach(player => {
        const existing = playerMap.get(player.player_id);
        if (!existing || new Date(player.scraped_at) > new Date(existing.scraped_at)) {
            playerMap.set(player.player_id, player);
        }
    });
    
    return Array.from(playerMap.values());
}

// Crear tarjeta de jugador
function createPlayerCard(player) {
    const card = document.createElement('div');
    card.className = 'player-card fade-in';
    card.onclick = () => showPlayerDetail(player);
    
    const rosteredChange = player.percent_rostered_change || 0;
    const startedChange = player.percent_started_change || 0;
    
    card.innerHTML = `
        <div class="player-info">
            <h3>${player.player_name}</h3>
            <div class="player-meta">
                <span class="position-badge position-${player.position}">${player.position}</span>
                <span>${player.team}</span>
                <span>vs ${player.opponent}</span>
                <span>Semana ${player.semana}</span>
            </div>
        </div>
        <div class="stat-card">
            <span class="stat-value">${player.percent_rostered.toFixed(1)}%</span>
            <span class="stat-label">Rostered</span>
        </div>
        <div class="stat-card">
            <span class="stat-value ${rosteredChange >= 0 ? 'change-positive' : 'change-negative'}">
                ${rosteredChange >= 0 ? '+' : ''}${rosteredChange.toFixed(1)}%
            </span>
            <span class="stat-label">Cambio R.</span>
        </div>
        <div class="stat-card">
            <span class="stat-value">${player.percent_started.toFixed(1)}%</span>
            <span class="stat-label">Started</span>
        </div>
        <div class="stat-card">
            <span class="stat-value ${startedChange >= 0 ? 'change-positive' : 'change-negative'}">
                ${startedChange >= 0 ? '+' : ''}${startedChange.toFixed(1)}%
            </span>
            <span class="stat-label">Cambio S.</span>
        </div>
        <div class="stat-card">
            <span class="stat-value">${player.adds}</span>
            <span class="stat-label">Adds</span>
        </div>
        <div class="stat-card">
            <span class="stat-value">${player.drops}</span>
            <span class="stat-label">Drops</span>
        </div>
    `;
    
    return card;
}

// Mostrar detalle del jugador
async function showPlayerDetail(player) {
    currentPlayerData = player;
    
    // Actualizar información del jugador
    document.getElementById('modalPlayerName').textContent = player.player_name;
    document.getElementById('modalPosition').textContent = player.position;
    document.getElementById('modalTeam').textContent = player.team;
    document.getElementById('modalOpponent').textContent = player.opponent;
    document.getElementById('modalRostered').textContent = `${player.percent_rostered.toFixed(1)}%`;
    document.getElementById('modalStarted').textContent = `${player.percent_started.toFixed(1)}%`;
    document.getElementById('modalAdds').textContent = player.adds;
    document.getElementById('modalDrops').textContent = player.drops;
    
    // Obtener datos históricos del jugador
    await loadPlayerHistory(player.player_id);
    
    // Mostrar modal
    elements.playerModal.style.display = 'block';
}

// Cargar historial del jugador
async function loadPlayerHistory(playerId) {
    try {
        const { data, error } = await supabaseClient
            .from('nfl_fantasy_trends')
            .select('*')
            .eq('player_id', playerId)
            .order('scraped_at', { ascending: true });
        
        if (error) {
            throw error;
        }
        
        createPlayerCharts(data);
        
    } catch (error) {
        console.error('Error cargando historial:', error);
        showError('Error al cargar el historial del jugador');
    }
}

// Crear gráficos del jugador
function createPlayerCharts(playerHistory) {
    const labels = playerHistory.map(data => new Date(data.scraped_at).toLocaleDateString('es-ES'));
    
    // Destruir gráficos existentes
    Object.values(charts).forEach(chart => {
        if (chart) chart.destroy();
    });
    
    // Configuración base para gráficos
    const baseConfig = {
        type: 'line',
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Fecha'
                    }
                },
                y: {
                    display: true,
                    beginAtZero: true
                }
            },
            elements: {
                line: {
                    tension: 0.4
                },
                point: {
                    radius: 4,
                    hoverRadius: 6
                }
            }
        }
    };
    
    // Gráfico % Rostered
    charts.rostered = new Chart(document.getElementById('rosteredChart'), {
        ...baseConfig,
        data: {
            labels: labels,
            datasets: [{
                label: '% Rostered',
                data: playerHistory.map(data => data.percent_rostered),
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                fill: true
            }]
        },
        options: {
            ...baseConfig.options,
            scales: {
                ...baseConfig.options.scales,
                y: {
                    ...baseConfig.options.scales.y,
                    title: {
                        display: true,
                        text: 'Porcentaje (%)'
                    }
                }
            }
        }
    });
    
    // Gráfico Cambios % Rostered
    charts.rosteredChange = new Chart(document.getElementById('rosteredChangeChart'), {
        ...baseConfig,
        data: {
            labels: labels,
            datasets: [{
                label: 'Cambio % Rostered',
                data: playerHistory.map(data => data.percent_rostered_change || 0),
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                fill: true
            }]
        },
        options: {
            ...baseConfig.options,
            scales: {
                ...baseConfig.options.scales,
                y: {
                    ...baseConfig.options.scales.y,
                    title: {
                        display: true,
                        text: 'Cambio (%)'
                    }
                }
            }
        }
    });
    
    // Gráfico % Started
    charts.started = new Chart(document.getElementById('startedChart'), {
        ...baseConfig,
        data: {
            labels: labels,
            datasets: [{
                label: '% Started',
                data: playerHistory.map(data => data.percent_started),
                borderColor: '#f59e0b',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                fill: true
            }]
        },
        options: {
            ...baseConfig.options,
            scales: {
                ...baseConfig.options.scales,
                y: {
                    ...baseConfig.options.scales.y,
                    title: {
                        display: true,
                        text: 'Porcentaje (%)'
                    }
                }
            }
        }
    });
    
    // Gráfico Cambios % Started
    charts.startedChange = new Chart(document.getElementById('startedChangeChart'), {
        ...baseConfig,
        data: {
            labels: labels,
            datasets: [{
                label: 'Cambio % Started',
                data: playerHistory.map(data => data.percent_started_change || 0),
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                fill: true
            }]
        },
        options: {
            ...baseConfig.options,
            scales: {
                ...baseConfig.options.scales,
                y: {
                    ...baseConfig.options.scales.y,
                    title: {
                        display: true,
                        text: 'Cambio (%)'
                    }
                }
            }
        }
    });
    
    // Gráfico Adds
    charts.adds = new Chart(document.getElementById('addsChart'), {
        ...baseConfig,
        data: {
            labels: labels,
            datasets: [{
                label: 'Adds',
                data: playerHistory.map(data => data.adds),
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                fill: true
            }]
        },
        options: {
            ...baseConfig.options,
            scales: {
                ...baseConfig.options.scales,
                y: {
                    ...baseConfig.options.scales.y,
                    title: {
                        display: true,
                        text: 'Cantidad'
                    }
                }
            }
        }
    });
    
    // Gráfico Drops
    charts.drops = new Chart(document.getElementById('dropsChart'), {
        ...baseConfig,
        data: {
            labels: labels,
            datasets: [{
                label: 'Drops',
                data: playerHistory.map(data => data.drops),
                borderColor: '#dc2626',
                backgroundColor: 'rgba(220, 38, 38, 0.1)',
                fill: true
            }]
        },
        options: {
            ...baseConfig.options,
            scales: {
                ...baseConfig.options.scales,
                y: {
                    ...baseConfig.options.scales.y,
                    title: {
                        display: true,
                        text: 'Cantidad'
                    }
                }
            }
        }
    });
}

// Ordenar jugadores
function sortPlayers() {
    const sortBy = elements.sortBy.value;
    const isAscending = elements.sortOrder.dataset.order === 'asc';
    
    filteredPlayersData.sort((a, b) => {
        let valueA = a[sortBy];
        let valueB = b[sortBy];
        
        if (typeof valueA === 'string') {
            valueA = valueA.toLowerCase();
            valueB = valueB.toLowerCase();
        }
        
        if (isAscending) {
            return valueA > valueB ? 1 : -1;
        } else {
            return valueA < valueB ? 1 : -1;
        }
    });
    
    renderPlayersList();
}

// Alternar orden de clasificación
function toggleSortOrder() {
    const currentOrder = elements.sortOrder.dataset.order;
    const newOrder = currentOrder === 'asc' ? 'desc' : 'asc';
    
    elements.sortOrder.dataset.order = newOrder;
    elements.sortOrder.innerHTML = newOrder === 'asc' 
        ? '<i class="fas fa-sort-amount-up"></i>' 
        : '<i class="fas fa-sort-amount-down"></i>';
    
    sortPlayers();
}

// Actualizar valor del slider de rostered
function updateRosteredValue() {
    const value = elements.rosteredFilter.value;
    elements.rosteredValue.textContent = `${value}%`;
}

// Refrescar datos
function refreshData() {
    elements.refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Actualizando...';
    elements.refreshBtn.disabled = true;
    
    loadPlayersData().finally(() => {
        elements.refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Actualizar';
        elements.refreshBtn.disabled = false;
    });
}

// Mostrar modal de configuración
function showConfigModal() {
    elements.configModal.style.display = 'block';
}

// Guardar configuración de Supabase
function saveSupabaseConfig() {
    const url = elements.supabaseUrl.value.trim();
    const key = elements.supabaseKey.value.trim();
    
    if (!url || !key) {
        showError('Por favor, completa todos los campos de configuración');
        return;
    }
    
    const config = { url, key };
    localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify(config));
    
    initializeSupabase(url, key);
    elements.configModal.style.display = 'none';
    
    showSuccess('Configuración guardada exitosamente');
}

// Probar conexión con Supabase (versión 1)
async function testSupabaseConnection() {
    const url = elements.supabaseUrl.value.trim();
    const key = elements.supabaseKey.value.trim();
    
    if (!url || !key) {
        showError('Por favor, completa todos los campos antes de probar la conexión');
        return;
    }
    
    elements.testConnection.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Probando...';
    elements.testConnection.disabled = true;
    
    try {
        const testClient = supabase.createClient(url, key);
        const { data, error } = await testClient
            .from('nfl_fantasy_trends')
            .select('id')
            .limit(1);
        
        if (error) {
            throw error;
        }
        
        showSuccess('¡Conexión exitosa! Los datos se pueden acceder correctamente.');
        
    } catch (error) {
        console.error('Error de conexión:', error);
        showError('Error de conexión: ' + error.message);
    } finally {
        elements.testConnection.innerHTML = '<i class="fas fa-link"></i> Probar Conexión';
        elements.testConnection.disabled = false;
    }
}

// Estados de carga
function showLoadingState() {
    elements.loadingIndicator.style.display = 'flex';
    elements.playersContainer.style.display = 'none';
}

function hideLoadingState() {
    elements.loadingIndicator.style.display = 'none';
    elements.playersContainer.style.display = 'block';
}

// Utilidades
function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

function showError(message) {
    removeMessages();
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;
    document.querySelector('.main-content').prepend(errorDiv);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

function showSuccess(message) {
    removeMessages();
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    document.querySelector('.main-content').prepend(successDiv);
    
    setTimeout(() => {
        successDiv.remove();
    }, 3000);
}

function removeMessages() {
    document.querySelectorAll('.error-message, .success-message').forEach(msg => {
        msg.remove();
    });
}

// Exportar funciones para uso global si es necesario
window.dashboardApp = {
    refreshData,
    showPlayerDetail,
    filterPlayers,
    sortPlayers
};
