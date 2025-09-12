// Configuración global para Favoritos de la Semana
let supabaseClient = null;
let allFavoritosData = [];
let filteredFavoritosData = [];
let favoritosCharts = {};

// Configuración de Supabase
const SUPABASE_CONFIG_KEY = 'supabase_config';

// Elementos del DOM
const favoritosElements = {
    loadingFavoritos: document.getElementById('loadingFavoritos'),
    favoritosContent: document.getElementById('favoritosContent'),
    refreshFavoritos: document.getElementById('refreshFavoritos'),
    configBtn: document.getElementById('configBtn'),
    configModal: document.getElementById('configModal'),
    supabaseUrl: document.getElementById('supabaseUrl'),
    supabaseKey: document.getElementById('supabaseKey'),
    saveConfig: document.getElementById('saveConfig'),
    testConnection: document.getElementById('testConnection'),
    
    // Header Stats
    totalFavoritos: document.getElementById('totalFavoritos'),
    avgIncrease: document.getElementById('avgIncrease'),
    
    // Filters
    positionFilterFavoritos: document.getElementById('positionFilterFavoritos'),
    teamFilterFavoritos: document.getElementById('teamFilterFavoritos'),
    minStartedIncrease: document.getElementById('minStartedIncrease'),
    minStartedIncreaseValue: document.getElementById('minStartedIncreaseValue'),
    minCurrentStarted: document.getElementById('minCurrentStarted'),
    minCurrentStartedValue: document.getElementById('minCurrentStartedValue'),
    minRosteredFavoritos: document.getElementById('minRosteredFavoritos'),
    minRosteredFavoritosValue: document.getElementById('minRosteredFavoritosValue'),
    
    // Top Performers
    topPlayerName: document.getElementById('topPlayerName'),
    topPlayerIncrease: document.getElementById('topPlayerIncrease'),
    topQBName: document.getElementById('topQBName'),
    topQBIncrease: document.getElementById('topQBIncrease'),
    topRBName: document.getElementById('topRBName'),
    topRBIncrease: document.getElementById('topRBIncrease'),
    topWRName: document.getElementById('topWRName'),
    topWRIncrease: document.getElementById('topWRIncrease'),
    topTEName: document.getElementById('topTEName'),
    topTEIncrease: document.getElementById('topTEIncrease'),
    
    // Metrics
    maxIncreaseValue: document.getElementById('maxIncreaseValue'),
    maxIncreasePlayer: document.getElementById('maxIncreasePlayer'),
    totalFavoritosMetric: document.getElementById('totalFavoritosMetric'),
    avgIncreaseMetric: document.getElementById('avgIncreaseMetric'),
    hotTrendsCount: document.getElementById('hotTrendsCount'),
    
    // Charts
    favoritosChart: document.getElementById('favoritosChart'),
    
    // Players List
    favoritosPlayersList: document.getElementById('favoritosPlayersList'),
    favoritosSortBy: document.getElementById('favoritosSortBy'),
    favoritosSortOrder: document.getElementById('favoritosSortOrder'),
    
    // Modal
    favoritosPlayerModal: document.getElementById('favoritosPlayerModal'),
    favoritosModalPlayerName: document.getElementById('favoritosModalPlayerName'),
    favoritosModalStartedChange: document.getElementById('favoritosModalStartedChange'),
    favoritosModalCurrentStarted: document.getElementById('favoritosModalCurrentStarted'),
    favoritosModalPreviousStarted: document.getElementById('favoritosModalPreviousStarted'),
    favoritosModalRostered: document.getElementById('favoritosModalRostered'),
    favoritosModalPosition: document.getElementById('favoritosModalPosition'),
    favoritosModalTeam: document.getElementById('favoritosModalTeam'),
    favoritosModalRanking: document.getElementById('favoritosModalRanking'),
    
    // Modal Charts
    favoritosStartedChart: document.getElementById('favoritosStartedChart'),
    favoritosStartedChangeChart: document.getElementById('favoritosStartedChangeChart'),
    favoritosComparisonChart: document.getElementById('favoritosComparisonChart'),
    favoritosAddsDropsChart: document.getElementById('favoritosAddsDropsChart')
};

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    // Verificar que todas las librerías estén cargadas
    if (typeof Chart === 'undefined') {
        showFavoritosError('Error: Chart.js no se ha cargado correctamente. Verifica tu conexión a internet.');
        return;
    }
    
    if (typeof window.supabase === 'undefined') {
        showFavoritosError('Error: Supabase no se ha cargado correctamente. Verifica tu conexión a internet y recarga la página.');
        return;
    }

    console.log('Inicializando módulo de Favoritos de la Semana...');

    // Configurar eventos
    setupFavoritosEvents();
    
    // Verificar configuración de Supabase
    const config = getSupabaseConfig();
    if (config.url && config.key) {
        initializeSupabase(config.url, config.key);
        loadFavoritosData();
    } else {
        showConfigModal();
    }
});

// Configurar eventos
function setupFavoritosEvents() {
    // Eventos de navegación y configuración
    favoritosElements.refreshFavoritos.addEventListener('click', refreshFavoritosData);
    favoritosElements.configBtn.addEventListener('click', showConfigModal);
    favoritosElements.saveConfig.addEventListener('click', saveSupabaseConfig);
    favoritosElements.testConnection.addEventListener('click', testSupabaseConnection);
    
    // Eventos de filtros
    favoritosElements.positionFilterFavoritos.addEventListener('change', applyFavoritosFilters);
    favoritosElements.teamFilterFavoritos.addEventListener('change', applyFavoritosFilters);
    favoritosElements.minStartedIncrease.addEventListener('input', updateMinStartedIncreaseValue);
    favoritosElements.minCurrentStarted.addEventListener('input', updateMinCurrentStartedValue);
    favoritosElements.minRosteredFavoritos.addEventListener('input', updateMinRosteredFavoritosValue);
    
    // Eventos de ordenamiento
    favoritosElements.favoritosSortBy.addEventListener('change', sortFavoritosPlayers);
    favoritosElements.favoritosSortOrder.addEventListener('click', toggleFavoritosSortOrder);
    
    // Eventos del modal
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });
    
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });
}

// Actualizar valores de filtros
function updateMinStartedIncreaseValue() {
    favoritosElements.minStartedIncreaseValue.textContent = `${favoritosElements.minStartedIncrease.value}%`;
    applyFavoritosFilters();
}

function updateMinCurrentStartedValue() {
    favoritosElements.minCurrentStartedValue.textContent = `${favoritosElements.minCurrentStarted.value}%`;
    applyFavoritosFilters();
}

function updateMinRosteredFavoritosValue() {
    favoritosElements.minRosteredFavoritosValue.textContent = `${favoritosElements.minRosteredFavoritos.value}%`;
    applyFavoritosFilters();
}

// Inicializar Supabase
function initializeSupabase(url, key) {
    try {
        supabaseClient = window.supabase.createClient(url, key);
        console.log('Cliente Supabase inicializado correctamente para Favoritos');
    } catch (error) {
        console.error('Error inicializando Supabase:', error);
        showFavoritosError('Error al conectar con Supabase. Verifica tu configuración.');
    }
}

// Cargar datos de favoritos
async function loadFavoritosData() {
    try {
        showLoading(true);
        
        console.log('Cargando datos para Favoritos de la Semana...');
        
        const { data, error } = await supabaseClient
            .from('nfl_fantasy_trends')
            .select('*')
            .order('scraped_at', { ascending: false });
        
        if (error) {
            throw error;
        }
        
        console.log('Datos cargados:', data ? data.length : 0, 'registros');
        
        // Filtrar solo jugadores con cambio positivo en started
        const favoritosData = (data || []).filter(player => {
            const startedChange = player.percent_started_change || 0;
            return startedChange > 0;
        });
        
        console.log('Favoritos encontrados:', favoritosData.length, 'jugadores con aumento en Started');
        
        // Ordenar por mayor aumento en started
        allFavoritosData = favoritosData.sort((a, b) => {
            const changeA = a.percent_started_change || 0;
            const changeB = b.percent_started_change || 0;
            return changeB - changeA;
        });
        
        // Llenar filtros
        populateTeamFilter();
        
        // Aplicar filtros iniciales
        applyFavoritosFilters();
        
        showLoading(false);
        favoritosElements.favoritosContent.style.display = 'block';
        
    } catch (error) {
        console.error('Error cargando datos:', error);
        showFavoritosError('Error al cargar los datos. Verifica tu conexión y configuración.');
        showLoading(false);
    }
}

// Llenar filtro de equipos
function populateTeamFilter() {
    const teams = [...new Set(allFavoritosData.map(player => player.team).filter(team => team))];
    teams.sort();
    
    favoritosElements.teamFilterFavoritos.innerHTML = '<option value="">Todos los equipos</option>';
    teams.forEach(team => {
        const option = document.createElement('option');
        option.value = team;
        option.textContent = team;
        favoritosElements.teamFilterFavoritos.appendChild(option);
    });
}

// Aplicar filtros a favoritos
function applyFavoritosFilters() {
    let filtered = [...allFavoritosData];
    
    // Filtro por posición
    const position = favoritosElements.positionFilterFavoritos.value;
    if (position) {
        filtered = filtered.filter(player => player.position === position);
    }
    
    // Filtro por equipo
    const team = favoritosElements.teamFilterFavoritos.value;
    if (team) {
        filtered = filtered.filter(player => player.team === team);
    }
    
    // Filtro por aumento mínimo en started
    const minIncrease = parseFloat(favoritosElements.minStartedIncrease.value);
    filtered = filtered.filter(player => (player.percent_started_change || 0) >= minIncrease);
    
    // Filtro por % started actual mínimo
    const minCurrentStarted = parseFloat(favoritosElements.minCurrentStarted.value);
    filtered = filtered.filter(player => (player.percent_started || 0) >= minCurrentStarted);
    
    // Filtro por % rostered mínimo
    const minRostered = parseFloat(favoritosElements.minRosteredFavoritos.value);
    filtered = filtered.filter(player => (player.percent_rostered || 0) >= minRostered);
    
    filteredFavoritosData = filtered;
    
    // Actualizar UI
    updateFavoritosUI();
    updateFavoritosMetrics();
    createFavoritosChart();
    displayFavoritosPlayers();
}

// Actualizar UI con estadísticas principales
function updateFavoritosUI() {
    const totalFavoritos = filteredFavoritosData.length;
    const avgIncrease = totalFavoritos > 0 
        ? (filteredFavoritosData.reduce((sum, player) => sum + (player.percent_started_change || 0), 0) / totalFavoritos).toFixed(1)
        : 0;
    
    favoritosElements.totalFavoritos.textContent = totalFavoritos;
    favoritosElements.avgIncrease.textContent = `${avgIncrease}%`;
}

// Actualizar métricas de favoritos
function updateFavoritosMetrics() {
    if (filteredFavoritosData.length === 0) {
        // Limpiar métricas si no hay datos
        favoritosElements.maxIncreaseValue.textContent = '-';
        favoritosElements.maxIncreasePlayer.textContent = '-';
        favoritosElements.totalFavoritosMetric.textContent = '0';
        favoritosElements.avgIncreaseMetric.textContent = '-';
        favoritosElements.hotTrendsCount.textContent = '0';
        
        // Limpiar top performers
        clearTopPerformers();
        return;
    }
    
    // Jugador con mayor aumento
    const topPlayer = filteredFavoritosData[0];
    favoritosElements.maxIncreaseValue.textContent = `+${(topPlayer.percent_started_change || 0).toFixed(1)}%`;
    favoritosElements.maxIncreasePlayer.textContent = topPlayer.player_name;
    
    // Total de favoritos
    favoritosElements.totalFavoritosMetric.textContent = filteredFavoritosData.length;
    
    // Promedio de aumento
    const avgIncrease = filteredFavoritosData.reduce((sum, player) => sum + (player.percent_started_change || 0), 0) / filteredFavoritosData.length;
    favoritosElements.avgIncreaseMetric.textContent = `+${avgIncrease.toFixed(1)}%`;
    
    // Tendencias calientes (>5% aumento)
    const hotTrends = filteredFavoritosData.filter(player => (player.percent_started_change || 0) > 5);
    favoritosElements.hotTrendsCount.textContent = hotTrends.length;
    
    // Actualizar top performers por posición
    updateTopPerformers();
}

// Actualizar top performers por posición
function updateTopPerformers() {
    const positions = ['QB', 'RB', 'WR', 'TE'];
    
    positions.forEach(position => {
        const positionPlayers = filteredFavoritosData.filter(player => player.position === position);
        const topPlayer = positionPlayers.length > 0 ? positionPlayers[0] : null;
        
        const nameElement = favoritosElements[`top${position}Name`];
        const increaseElement = favoritosElements[`top${position}Increase`];
        
        if (topPlayer) {
            nameElement.textContent = topPlayer.player_name;
            increaseElement.textContent = `+${(topPlayer.percent_started_change || 0).toFixed(1)}%`;
        } else {
            nameElement.textContent = '-';
            increaseElement.textContent = '-';
        }
    });
    
    // Overall top player
    if (filteredFavoritosData.length > 0) {
        const topOverall = filteredFavoritosData[0];
        favoritosElements.topPlayerName.textContent = topOverall.player_name;
        favoritosElements.topPlayerIncrease.textContent = `+${(topOverall.percent_started_change || 0).toFixed(1)}%`;
    } else {
        favoritosElements.topPlayerName.textContent = '-';
        favoritosElements.topPlayerIncrease.textContent = '-';
    }
}

// Limpiar top performers
function clearTopPerformers() {
    const positions = ['QB', 'RB', 'WR', 'TE'];
    positions.forEach(position => {
        favoritosElements[`top${position}Name`].textContent = '-';
        favoritosElements[`top${position}Increase`].textContent = '-';
    });
    favoritosElements.topPlayerName.textContent = '-';
    favoritosElements.topPlayerIncrease.textContent = '-';
}

// Crear gráfico de favoritos
function createFavoritosChart() {
    // Destruir gráfico existente
    if (favoritosCharts.favoritos) {
        favoritosCharts.favoritos.destroy();
    }
    
    if (!favoritosElements.favoritosChart || filteredFavoritosData.length === 0) {
        return;
    }
    
    // Top 15 jugadores
    const top15 = filteredFavoritosData.slice(0, 15);
    
    const ctx = favoritosElements.favoritosChart;
    
    const data = {
        labels: top15.map(player => player.player_name),
        datasets: [{
            label: 'Aumento % Started',
            data: top15.map(player => player.percent_started_change || 0),
            backgroundColor: top15.map((_, index) => {
                // Gradiente de colores del oro al verde
                const ratio = index / Math.max(1, top15.length - 1);
                if (ratio < 0.33) {
                    return `rgba(255, 215, 0, ${0.8 - ratio * 0.3})`; // Oro
                } else if (ratio < 0.66) {
                    return `rgba(255, 165, 0, ${0.8 - ratio * 0.3})`; // Naranja
                } else {
                    return `rgba(34, 197, 94, ${0.8 - ratio * 0.3})`; // Verde
                }
            }),
            borderColor: top15.map((_, index) => {
                const ratio = index / Math.max(1, top15.length - 1);
                if (ratio < 0.33) {
                    return 'rgba(255, 215, 0, 1)';
                } else if (ratio < 0.66) {
                    return 'rgba(255, 165, 0, 1)';
                } else {
                    return 'rgba(34, 197, 94, 1)';
                }
            }),
            borderWidth: 2
        }]
    };
    
    favoritosCharts.favoritos = new Chart(ctx, {
        type: 'bar',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Top 15 Jugadores - Mayor Aumento en % Started'
                },
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Aumento (%)'
                    },
                    ticks: {
                        callback: function(value) {
                            return '+' + value + '%';
                        }
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Jugadores'
                    },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            },
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const player = top15[index];
                    showFavoritosPlayerDetails(player.player_id);
                }
            }
        }
    });
}

// Mostrar jugadores de favoritos
function displayFavoritosPlayers() {
    if (!filteredFavoritosData || filteredFavoritosData.length === 0) {
        favoritosElements.favoritosPlayersList.innerHTML = '<p class="no-favoritos">No hay favoritos que coincidan con los filtros aplicados.</p>';
        return;
    }
    
    // Ordenar según criterios actuales
    const sortedPlayers = sortPlayersByCurrentCriteria(filteredFavoritosData);
    
    const html = sortedPlayers.map((player, index) => {
        const startedChange = player.percent_started_change || 0;
        const ranking = index + 1;
        
        // Determinar clase de ranking
        let rankingClass = 'ranking-normal';
        if (ranking === 1) rankingClass = 'ranking-gold';
        else if (ranking === 2) rankingClass = 'ranking-silver';
        else if (ranking === 3) rankingClass = 'ranking-bronze';
        else if (ranking <= 10) rankingClass = 'ranking-top10';
        
        // Determinar nivel de aumento
        let increaseClass = 'increase-normal';
        if (startedChange >= 10) increaseClass = 'increase-extreme';
        else if (startedChange >= 5) increaseClass = 'increase-high';
        else if (startedChange >= 2) increaseClass = 'increase-medium';
        
        return `
            <div class="favorito-player-card ${increaseClass}" onclick="showFavoritosPlayerDetails('${player.player_id}')">
                <div class="favorito-ranking ${rankingClass}">
                    <span class="ranking-number">#${ranking}</span>
                    ${ranking <= 3 ? '<i class="fas fa-trophy"></i>' : ''}
                </div>
                
                <div class="player-info">
                    <h3>${player.player_name}</h3>
                    <div class="player-meta">
                        <span class="position-badge position-${player.position}">${player.position}</span>
                        <span class="team-name">${player.team}</span>
                    </div>
                </div>
                
                <div class="favorito-main-stat">
                    <div class="increase-badge ${increaseClass}">
                        <i class="fas fa-arrow-up"></i>
                        <span class="increase-value">+${startedChange.toFixed(1)}%</span>
                    </div>
                    <span class="increase-label">Aumento Started</span>
                </div>
                
                <div class="stat-card">
                    <span class="stat-value">${(player.percent_started || 0).toFixed(1)}%</span>
                    <span class="stat-label">Started Actual</span>
                </div>
                
                <div class="stat-card">
                    <span class="stat-value">${(player.percent_rostered || 0).toFixed(1)}%</span>
                    <span class="stat-label">Rostered</span>
                </div>
                
                <div class="stat-card">
                    <span class="stat-value">${player.adds || 0}</span>
                    <span class="stat-label">Adds</span>
                </div>
                
                <div class="favorito-actions">
                    <i class="fas fa-star favorito-star"></i>
                </div>
            </div>
        `;
    }).join('');
    
    favoritosElements.favoritosPlayersList.innerHTML = html;
}

// Ordenar jugadores según criterios actuales
function sortPlayersByCurrentCriteria(players) {
    const sortBy = favoritosElements.favoritosSortBy.value;
    const order = favoritosElements.favoritosSortOrder.dataset.order;
    
    return players.sort((a, b) => {
        let valueA, valueB;
        
        switch (sortBy) {
            case 'player_name':
                valueA = (a.player_name || '').toLowerCase();
                valueB = (b.player_name || '').toLowerCase();
                break;
            case 'percent_started_change':
                valueA = a.percent_started_change || 0;
                valueB = b.percent_started_change || 0;
                break;
            case 'percent_started':
                valueA = a.percent_started || 0;
                valueB = b.percent_started || 0;
                break;
            case 'percent_rostered':
                valueA = a.percent_rostered || 0;
                valueB = b.percent_rostered || 0;
                break;
            default:
                valueA = a.percent_started_change || 0;
                valueB = b.percent_started_change || 0;
        }
        
        if (order === 'desc') {
            return valueB > valueA ? 1 : valueB < valueA ? -1 : 0;
        } else {
            return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
        }
    });
}

// Eventos de ordenamiento
function sortFavoritosPlayers() {
    displayFavoritosPlayers();
}

function toggleFavoritosSortOrder() {
    const currentOrder = favoritosElements.favoritosSortOrder.dataset.order;
    const newOrder = currentOrder === 'desc' ? 'asc' : 'desc';
    
    favoritosElements.favoritosSortOrder.dataset.order = newOrder;
    favoritosElements.favoritosSortOrder.innerHTML = newOrder === 'desc' 
        ? '<i class="fas fa-sort-amount-down"></i>' 
        : '<i class="fas fa-sort-amount-up"></i>';
    
    displayFavoritosPlayers();
}

// Mostrar detalles del jugador en modal
async function showFavoritosPlayerDetails(playerId) {
    const player = allFavoritosData.find(p => p.player_id === playerId);
    if (!player) return;
    
    // Calcular ranking
    const ranking = allFavoritosData.findIndex(p => p.player_id === playerId) + 1;
    
    // Llenar información básica
    favoritosElements.favoritosModalPlayerName.textContent = player.player_name;
    favoritosElements.favoritosModalStartedChange.textContent = `+${(player.percent_started_change || 0).toFixed(1)}%`;
    favoritosElements.favoritosModalCurrentStarted.textContent = `${(player.percent_started || 0).toFixed(1)}%`;
    
    // Calcular started anterior
    const previousStarted = (player.percent_started || 0) - (player.percent_started_change || 0);
    favoritosElements.favoritosModalPreviousStarted.textContent = `${previousStarted.toFixed(1)}%`;
    
    favoritosElements.favoritosModalRostered.textContent = `${(player.percent_rostered || 0).toFixed(1)}%`;
    favoritosElements.favoritosModalPosition.textContent = player.position || 'N/A';
    favoritosElements.favoritosModalTeam.textContent = player.team || 'N/A';
    favoritosElements.favoritosModalRanking.textContent = `#${ranking}`;
    
    // Mostrar modal
    favoritosElements.favoritosPlayerModal.style.display = 'block';
    
    // Cargar datos históricos
    await loadFavoritosPlayerHistory(playerId);
}

// Cargar historial del jugador
async function loadFavoritosPlayerHistory(playerId) {
    try {
        const { data, error } = await supabaseClient
            .from('nfl_fantasy_trends')
            .select('*')
            .eq('player_id', playerId)
            .order('scraped_at', { ascending: true });
        
        if (error) {
            throw error;
        }
        
        if (data && data.length > 0) {
            createFavoritosPlayerCharts(data);
        }
        
    } catch (error) {
        console.error('Error cargando historial del jugador:', error);
    }
}

// Crear gráficos del jugador para el modal
function createFavoritosPlayerCharts(playerHistory) {
    // Destruir gráficos existentes del modal
    const modalChartKeys = ['favoritosStarted', 'favoritosStartedChange', 'favoritosComparison', 'favoritosAddsDrops'];
    modalChartKeys.forEach(key => {
        if (favoritosCharts[key]) {
            favoritosCharts[key].destroy();
            delete favoritosCharts[key];
        }
    });
    
    if (!playerHistory || playerHistory.length === 0) {
        return;
    }
    
    const labels = playerHistory.map(data => new Date(data.scraped_at).toLocaleDateString('es-ES'));
    const startedData = playerHistory.map(d => d.percent_started || 0);
    const startedChangeData = playerHistory.map(d => d.percent_started_change || 0);
    const rosteredData = playerHistory.map(d => d.percent_rostered || 0);
    const addsData = playerHistory.map(d => d.adds || 0);
    const dropsData = playerHistory.map(d => d.drops || 0);
    
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: true }
        },
        scales: {
            x: {
                display: true,
                title: { display: true, text: 'Fecha' }
            },
            y: { 
                beginAtZero: true,
                title: { display: true, text: 'Valor' }
            }
        }
    };
    
    // Gráfico % Started
    if (favoritosElements.favoritosStartedChart) {
        favoritosCharts.favoritosStarted = new Chart(favoritosElements.favoritosStartedChart, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: '% Started',
                    data: startedData,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                ...chartOptions,
                scales: {
                    ...chartOptions.scales,
                    y: { ...chartOptions.scales.y, max: 100, title: { display: true, text: 'Porcentaje (%)' }}
                }
            }
        });
    }
    
    // Gráfico Cambios Started
    if (favoritosElements.favoritosStartedChangeChart) {
        favoritosCharts.favoritosStartedChange = new Chart(favoritosElements.favoritosStartedChangeChart, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Cambio % Started',
                    data: startedChangeData,
                    backgroundColor: startedChangeData.map(val => val > 0 ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)'),
                    borderColor: startedChangeData.map(val => val > 0 ? 'rgba(34, 197, 94, 1)' : 'rgba(239, 68, 68, 1)'),
                    borderWidth: 1
                }]
            },
            options: {
                ...chartOptions,
                scales: {
                    ...chartOptions.scales,
                    y: { 
                        beginAtZero: false,
                        title: { display: true, text: 'Cambio (%)' }
                    }
                }
            }
        });
    }
    
    // Gráfico Comparación Rostered vs Started
    if (favoritosElements.favoritosComparisonChart) {
        favoritosCharts.favoritosComparison = new Chart(favoritosElements.favoritosComparisonChart, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: '% Rostered',
                        data: rosteredData,
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderWidth: 2,
                        fill: false
                    },
                    {
                        label: '% Started',
                        data: startedData,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        borderWidth: 2,
                        fill: false
                    }
                ]
            },
            options: {
                ...chartOptions,
                scales: {
                    ...chartOptions.scales,
                    y: { ...chartOptions.scales.y, max: 100, title: { display: true, text: 'Porcentaje (%)' }}
                }
            }
        });
    }
    
    // Gráfico Adds vs Drops
    if (favoritosElements.favoritosAddsDropsChart) {
        favoritosCharts.favoritosAddsDrops = new Chart(favoritosElements.favoritosAddsDropsChart, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Adds',
                        data: addsData,
                        backgroundColor: 'rgba(34, 197, 94, 0.8)',
                        borderColor: 'rgba(34, 197, 94, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Drops',
                        data: dropsData,
                        backgroundColor: 'rgba(239, 68, 68, 0.8)',
                        borderColor: 'rgba(239, 68, 68, 1)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                ...chartOptions,
                scales: {
                    ...chartOptions.scales,
                    y: { ...chartOptions.scales.y, title: { display: true, text: 'Cantidad' }}
                }
            }
        });
    }
}

// Funciones de utilidad
function refreshFavoritosData() {
    loadFavoritosData();
}

function showLoading(show) {
    favoritosElements.loadingFavoritos.style.display = show ? 'flex' : 'none';
}

function showFavoritosError(message) {
    alert(message);
}

// Funciones de configuración de Supabase (reutilizadas)
function getSupabaseConfig() {
    const config = localStorage.getItem(SUPABASE_CONFIG_KEY);
    return config ? JSON.parse(config) : { url: '', key: '' };
}

function saveSupabaseConfig() {
    const url = favoritosElements.supabaseUrl.value.trim();
    const key = favoritosElements.supabaseKey.value.trim();
    
    if (!url || !key) {
        alert('Por favor completa todos los campos de configuración.');
        return;
    }
    
    const config = { url, key };
    localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify(config));
    
    initializeSupabase(url, key);
    favoritosElements.configModal.style.display = 'none';
    
    loadFavoritosData();
}

function testSupabaseConnection() {
    const url = favoritosElements.supabaseUrl.value.trim();
    const key = favoritosElements.supabaseKey.value.trim();
    
    if (!url || !key) {
        alert('Por favor completa la configuración antes de probar la conexión.');
        return;
    }
    
    try {
        const testClient = window.supabase.createClient(url, key);
        alert('Configuración válida. La conexión parece correcta.');
    } catch (error) {
        alert('Error en la configuración. Verifica los datos ingresados.');
    }
}

function showConfigModal() {
    const config = getSupabaseConfig();
    favoritosElements.supabaseUrl.value = config.url || '';
    favoritosElements.supabaseKey.value = config.key || '';
    favoritosElements.configModal.style.display = 'block';
}
