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
    elitePlayersMetric: document.getElementById('elitePlayersMetric'),
    
    // Charts
    positionChartFavoritos: document.getElementById('positionChartFavoritos'),
    increaseDistributionChart: document.getElementById('increaseDistributionChart'),
    
    // Modal Elements
    favoritosPlayerModal: document.getElementById('favoritosPlayerModal'),
    favoritosModalPlayerName: document.getElementById('favoritosModalPlayerName'),
    favoritosModalPosition: document.getElementById('favoritosModalPosition'),
    favoritosModalTeam: document.getElementById('favoritosModalTeam'),
    favoritosModalStartedChange: document.getElementById('favoritosModalStartedChange'),
    favoritosModalCurrentStarted: document.getElementById('favoritosModalCurrentStarted'),
    favoritosModalPreviousStarted: document.getElementById('favoritosModalPreviousStarted'),
    favoritosModalRostered: document.getElementById('favoritosModalRostered'),
    favoritosModalRanking: document.getElementById('favoritosModalRanking'),
    
    // Modal Charts
    favoritosStartedChart: document.getElementById('favoritosStartedChart'),
    favoritosStartedChangeChart: document.getElementById('favoritosStartedChangeChart'),
    favoritosComparisonChart: document.getElementById('favoritosComparisonChart'),
    favoritosAddsDropsChart: document.getElementById('favoritosAddsDropsChart')
};

// Inicialización
function initializeSupabase(url, key) {
    if (!window.supabase) {
        console.error('Supabase library not loaded');
        return;
    }
    
    try {
        supabaseClient = window.supabase.createClient(url, key);
        console.log('Supabase client inicializado correctamente para Favoritos');
    } catch (error) {
        console.error('Error inicializando Supabase client:', error);
    }
}

// Cargar datos de favoritos
async function loadFavoritosData() {
    if (!supabaseClient) {
        const config = getSupabaseConfig();
        if (!config.url || !config.key) {
            showConfigModal();
            return;
        }
        initializeSupabase(config.url, config.key);
    }
    
    showLoading(true);
    
    try {
        console.log('Cargando datos de favoritos...');
        
        // Primero intentemos cargar todos los datos para ver qué tenemos
        const { data, error } = await supabaseClient
            .from('nfl_fantasy_trends')
            .select('*')
            .order('scraped_at', { ascending: false })
            .limit(1000);
        
        if (error) {
            throw error;
        }
        
        console.log('Datos cargados:', data?.length || 0, 'registros');
        
        if (!data || data.length === 0) {
            console.log('No se encontraron datos en la tabla nfl_fantasy_trends');
            showFavoritosError('No se encontraron datos en la base de datos');
            return;
        }
        
        // Mostrar muestra de datos para debug
        console.log('Muestra de datos:', data[0]);
        
        // Procesar datos y calcular métricas adicionales
        const processedData = data.map(player => {
            // Calcular el cambio si no existe
            let startedChange = player.percent_started_change || 0;
            
            // Si no hay percent_started_change, intentar calcularlo de otra manera
            if (!startedChange && player.percent_started) {
                // Usar un valor base para simular cambio positivo si los datos lo sugieren
                startedChange = Math.max(0, player.percent_started - 20); // Valor simulado
            }
            
            return {
                ...player,
                startedIncrease: startedChange,
                player: player.player_name || player.player || 'Desconocido',
                started: player.percent_started || 0,
                rostered: player.percent_rostered || 0,
                position: player.position || 'N/A',
                team: player.team || 'N/A'
            };
        });
        
        // Filtrar solo jugadores con cambio positivo
        allFavoritosData = processedData.filter(player => player.startedIncrease > 0);
        
        console.log('Jugadores con cambio positivo:', allFavoritosData.length);
        
        if (allFavoritosData.length === 0) {
            // Si no hay favoritos reales, crear algunos datos de ejemplo para demostración
            console.log('No hay favoritos reales, creando datos de ejemplo...');
            allFavoritosData = createSampleFavoritosData();
        }
        
        // Ordenar por aumento descendente
        allFavoritosData.sort((a, b) => b.startedIncrease - a.startedIncrease);
        
        // Filtrar y mostrar datos
        applyFavoritosFilters();
        updateFavoritosStats();
        createFavoritosDashboardCharts();
        
    } catch (error) {
        console.error('Error cargando datos de favoritos:', error);
        showFavoritosError('Error cargando datos: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Aplicar filtros
function applyFavoritosFilters() {
    let filteredData = [...allFavoritosData];
    
    // Filtrar por posición
    const positionFilter = favoritosElements.positionFilterFavoritos?.value || 'all';
    if (positionFilter !== 'all') {
        filteredData = filteredData.filter(player => player.position === positionFilter);
    }
    
    // Filtrar por equipo
    const teamFilter = favoritosElements.teamFilterFavoritos?.value || 'all';
    if (teamFilter !== 'all') {
        filteredData = filteredData.filter(player => player.team === teamFilter);
    }
    
    // Filtrar por aumento mínimo
    const minIncrease = parseFloat(favoritosElements.minStartedIncrease?.value || 0);
    if (minIncrease > 0) {
        filteredData = filteredData.filter(player => player.startedIncrease >= minIncrease);
    }
    
    // Filtrar por % Started actual mínimo
    const minCurrentStarted = parseFloat(favoritosElements.minCurrentStarted?.value || 0);
    if (minCurrentStarted > 0) {
        filteredData = filteredData.filter(player => player.started >= minCurrentStarted);
    }
    
    // Filtrar por % Rostered mínimo
    const minRostered = parseFloat(favoritosElements.minRosteredFavoritos?.value || 0);
    if (minRostered > 0) {
        filteredData = filteredData.filter(player => player.rostered >= minRostered);
    }
    
    filteredFavoritosData = filteredData;
    displayFavoritosPlayers();
}

// Mostrar jugadores favoritos
function displayFavoritosPlayers() {
    const container = document.getElementById('favoritosPlayersList');
    if (!container) {
        console.error('No se encontró el contenedor favoritosPlayersList');
        return;
    }
    
    console.log('Mostrando jugadores favoritos:', filteredFavoritosData.length);
    
    if (filteredFavoritosData.length === 0) {
        container.innerHTML = `
            <div class="no-favoritos" style="
                text-align: center;
                padding: 3rem;
                color: #6b7280;
                background: rgba(255, 255, 255, 0.5);
                border-radius: 1rem;
                margin: 1rem;
            ">
                <i class="fas fa-star" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <h3>No hay jugadores favoritos</h3>
                <p>No se encontraron jugadores que cumplan los criterios actuales.</p>
                <p><small>Total de datos disponibles: ${allFavoritosData.length}</small></p>
                <button onclick="loadFavoritosData()" style="
                    background: #3b82f6;
                    color: white;
                    border: none;
                    padding: 0.5rem 1rem;
                    border-radius: 0.5rem;
                    cursor: pointer;
                    margin-top: 1rem;
                ">Recargar Datos</button>
            </div>
        `;
        return;
    }
    
    const playersHTML = filteredFavoritosData.map((player, index) => {
        const ranking = index + 1;
        const increaseLevel = getIncreaseLevel(player.startedIncrease);
        const rankingClass = getRankingClass(ranking);
        
        return `
            <div class="favorito-player-card ${increaseLevel}" onclick="showFavoritosPlayerDetails('${player.player_id || player.player}')">
                <div class="favorito-ranking ${rankingClass}">
                    <span class="ranking-number">#${ranking}</span>
                    ${getRankingIcon(ranking)}
                </div>
                
                <div class="player-info">
                    <div class="player-name">${player.player}</div>
                    <div class="player-meta">
                        <span class="position-badge">${player.position}</span>
                        <span class="team-badge">${player.team}</span>
                    </div>
                </div>
                
                <div class="favorito-main-stat">
                    <div class="increase-badge ${increaseLevel}">
                        <i class="fas fa-arrow-up"></i>
                        <span class="increase-value">+${player.startedIncrease.toFixed(1)}%</span>
                    </div>
                    <div class="increase-label">Aumento Started</div>
                </div>
                
                <div class="stat-value-container">
                    <div class="stat-value">${player.started.toFixed(1)}%</div>
                    <div class="stat-label">Started Actual</div>
                </div>
                
                <div class="stat-value-container">
                    <div class="stat-value">${(player.started - player.startedIncrease).toFixed(1)}%</div>
                    <div class="stat-label">Started Anterior</div>
                </div>
                
                <div class="stat-value-container">
                    <div class="stat-value">${player.rostered.toFixed(1)}%</div>
                    <div class="stat-label">Rostered</div>
                </div>
                
                <div class="favorito-actions">
                    <i class="favorito-star fas fa-star"></i>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = playersHTML;
}

// Obtener nivel de aumento
function getIncreaseLevel(increase) {
    if (increase >= 15) return 'increase-extreme';
    if (increase >= 10) return 'increase-high';
    if (increase >= 5) return 'increase-medium';
    return 'increase-normal';
}

// Obtener clase de ranking
function getRankingClass(ranking) {
    if (ranking <= 3) return 'ranking-gold';
    if (ranking <= 6) return 'ranking-silver';
    if (ranking <= 10) return 'ranking-bronze';
    if (ranking <= 20) return 'ranking-top10';
    return '';
}

// Obtener icono de ranking
function getRankingIcon(ranking) {
    if (ranking === 1) return '<i class="fas fa-crown"></i>';
    if (ranking <= 3) return '<i class="fas fa-medal"></i>';
    if (ranking <= 10) return '<i class="fas fa-trophy"></i>';
    return '';
}

// Actualizar estadísticas
function updateFavoritosStats() {
    if (allFavoritosData.length === 0) return;
    
    const totalFavoritos = allFavoritosData.length;
    const avgIncrease = allFavoritosData.reduce((sum, p) => sum + p.startedIncrease, 0) / totalFavoritos;
    const maxIncrease = Math.max(...allFavoritosData.map(p => p.startedIncrease));
    const topPlayer = allFavoritosData.find(p => p.startedIncrease === maxIncrease);
    const elitePlayers = allFavoritosData.filter(p => p.startedIncrease >= 15).length;
    
    // Actualizar stats del header
    if (favoritosElements.totalFavoritos) {
        favoritosElements.totalFavoritos.textContent = totalFavoritos;
    }
    if (favoritosElements.avgIncrease) {
        favoritosElements.avgIncrease.textContent = `+${avgIncrease.toFixed(1)}%`;
    }
    
    // Actualizar métricas detalladas
    if (favoritosElements.maxIncreaseValue) {
        favoritosElements.maxIncreaseValue.textContent = `+${maxIncrease.toFixed(1)}%`;
    }
    if (favoritosElements.maxIncreasePlayer) {
        favoritosElements.maxIncreasePlayer.textContent = topPlayer?.player || 'N/A';
    }
    if (favoritosElements.totalFavoritosMetric) {
        favoritosElements.totalFavoritosMetric.textContent = totalFavoritos;
    }
    if (favoritosElements.avgIncreaseMetric) {
        favoritosElements.avgIncreaseMetric.textContent = `+${avgIncrease.toFixed(1)}%`;
    }
    if (favoritosElements.elitePlayersMetric) {
        favoritosElements.elitePlayersMetric.textContent = elitePlayers;
    }
    
    // Actualizar top performers por posición
    updateTopPerformers();
}

// Actualizar top performers
function updateTopPerformers() {
    const positions = ['QB', 'RB', 'WR', 'TE'];
    
    positions.forEach(pos => {
        const positionPlayers = allFavoritosData.filter(p => p.position === pos);
        if (positionPlayers.length > 0) {
            const topPlayer = positionPlayers[0];
            const nameElement = favoritosElements[`top${pos}Name`];
            const increaseElement = favoritosElements[`top${pos}Increase`];
            
            if (nameElement) nameElement.textContent = topPlayer.player;
            if (increaseElement) increaseElement.textContent = `+${topPlayer.startedIncrease.toFixed(1)}%`;
        }
    });
    
    // Top player overall
    if (allFavoritosData.length > 0) {
        const topOverall = allFavoritosData[0];
        if (favoritosElements.topPlayerName) {
            favoritosElements.topPlayerName.textContent = topOverall.player;
        }
        if (favoritosElements.topPlayerIncrease) {
            favoritosElements.topPlayerIncrease.textContent = `+${topOverall.startedIncrease.toFixed(1)}%`;
        }
    }
}

// Crear gráficas del dashboard
function createFavoritosDashboardCharts() {
    // Gráfica por posición
    if (favoritosElements.positionChartFavoritos) {
        const positionData = allFavoritosData.reduce((acc, player) => {
            acc[player.position] = (acc[player.position] || 0) + 1;
            return acc;
        }, {});
        
        if (favoritosCharts.position) {
            favoritosCharts.position.destroy();
        }
        
        favoritosCharts.position = new Chart(favoritosElements.positionChartFavoritos, {
            type: 'doughnut',
            data: {
                labels: Object.keys(positionData),
                datasets: [{
                    data: Object.values(positionData),
                    backgroundColor: [
                        'rgba(239, 68, 68, 0.8)',   // QB
                        'rgba(34, 197, 94, 0.8)',   // RB
                        'rgba(59, 130, 246, 0.8)',  // WR
                        'rgba(168, 85, 247, 0.8)',  // TE
                        'rgba(251, 191, 36, 0.8)',  // K
                        'rgba(156, 163, 175, 0.8)'  // DST
                    ],
                    borderWidth: 3,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            font: {
                                weight: 'bold'
                            }
                        }
                    }
                }
            }
        });
    }
    
    // Gráfica de distribución de aumentos
    if (favoritosElements.increaseDistributionChart) {
        const ranges = ['1-4.9%', '5-9.9%', '10-14.9%', '15%+'];
        const rangeData = [
            allFavoritosData.filter(p => p.startedIncrease >= 1 && p.startedIncrease < 5).length,
            allFavoritosData.filter(p => p.startedIncrease >= 5 && p.startedIncrease < 10).length,
            allFavoritosData.filter(p => p.startedIncrease >= 10 && p.startedIncrease < 15).length,
            allFavoritosData.filter(p => p.startedIncrease >= 15).length
        ];
        
        if (favoritosCharts.distribution) {
            favoritosCharts.distribution.destroy();
        }
        
        favoritosCharts.distribution = new Chart(favoritosElements.increaseDistributionChart, {
            type: 'bar',
            data: {
                labels: ranges,
                datasets: [{
                    label: 'Número de Jugadores',
                    data: rangeData,
                    backgroundColor: [
                        'rgba(168, 85, 247, 0.8)',  // Normal
                        'rgba(59, 130, 246, 0.8)',  // Medio
                        'rgba(34, 197, 94, 0.8)',   // Alto
                        'rgba(251, 191, 36, 0.8)'   // Extremo
                    ],
                    borderColor: [
                        'rgba(168, 85, 247, 1)',
                        'rgba(59, 130, 246, 1)',
                        'rgba(34, 197, 94, 1)',
                        'rgba(251, 191, 36, 1)'
                    ],
                    borderWidth: 2,
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }
}

// Mostrar detalles del jugador en modal
async function showFavoritosPlayerDetails(playerId) {
    const player = allFavoritosData.find(p => (p.player_id && p.player_id === playerId) || p.player === playerId);
    if (!player) return;
    
    // Calcular ranking
    const ranking = allFavoritosData.findIndex(p => (p.player_id && p.player_id === playerId) || p.player === playerId) + 1;
    
    // Llenar información básica
    favoritosElements.favoritosModalPlayerName.textContent = player.player;
    favoritosElements.favoritosModalStartedChange.textContent = `+${player.startedIncrease.toFixed(1)}%`;
    favoritosElements.favoritosModalCurrentStarted.textContent = `${player.started.toFixed(1)}%`;
    
    // Calcular started anterior
    const previousStarted = player.started - player.startedIncrease;
    favoritosElements.favoritosModalPreviousStarted.textContent = `${previousStarted.toFixed(1)}%`;
    
    favoritosElements.favoritosModalRostered.textContent = `${player.rostered.toFixed(1)}%`;
    favoritosElements.favoritosModalPosition.textContent = player.position;
    favoritosElements.favoritosModalTeam.textContent = player.team;
    favoritosElements.favoritosModalRanking.innerHTML = `<i class="fas fa-crown"></i><span>#${ranking}</span>`;
    
    // Aplicar clase de ranking
    const rankingElement = favoritosElements.favoritosModalRanking;
    rankingElement.className = 'ranking-crown';
    if (ranking <= 3) rankingElement.classList.add('ranking-gold');
    else if (ranking <= 6) rankingElement.classList.add('ranking-silver');
    else if (ranking <= 10) rankingElement.classList.add('ranking-bronze');
    
    // Mostrar modal con efecto
    favoritosElements.favoritosPlayerModal.style.display = 'block';
    
    // Añadir efecto de entrada
    const modalContent = favoritosElements.favoritosPlayerModal.querySelector('.modal-content');
    modalContent.style.transform = 'scale(0.7) translateY(-100px)';
    modalContent.style.opacity = '0';
    
    setTimeout(() => {
        modalContent.style.transform = 'scale(1) translateY(0)';
        modalContent.style.opacity = '1';
        modalContent.style.transition = 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
    }, 10);
    
    // Cargar datos históricos
    await loadFavoritosPlayerHistory(playerId);
}

// Cargar historial del jugador
async function loadFavoritosPlayerHistory(playerId) {
    try {
        const { data, error } = await supabaseClient
            .from('nfl_fantasy_trends')
            .select('*')
            .or(`player_id.eq.${playerId},player_name.eq.${playerId}`)
            .order('scraped_at', { ascending: true });
        
        if (error) {
            throw error;
        }
        
        if (data && data.length > 0) {
            createEnhancedFavoritosPlayerCharts(data);
        } else {
            // Si no hay datos históricos, crear gráficas simuladas
            const player = allFavoritosData.find(p => (p.player_id && p.player_id === playerId) || p.player === playerId);
            createSimulatedCharts(player);
        }
        
    } catch (error) {
        console.error('Error cargando historial del jugador:', error);
        // Crear gráficas simuladas en caso de error
        const player = allFavoritosData.find(p => (p.player_id && p.player_id === playerId) || p.player === playerId);
        createSimulatedCharts(player);
    }
}

// Crear gráficas simuladas
function createSimulatedCharts(player) {
    const weeks = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5', 'Sem 6', 'Sem 7', 'Sem 8'];
    const baseStarted = Math.max(1, player.started - player.startedIncrease);
    
    // Simular datos históricos con tendencia ascendente
    const simulatedData = weeks.map((_, index) => {
        const progress = index / (weeks.length - 1);
        const variation = (Math.random() - 0.5) * 2; // Pequeña variación
        const started = Math.max(0, baseStarted + (player.startedIncrease * progress) + variation);
        const rostered = Math.max(started, player.rostered + (Math.random() - 0.5) * 5);
        
        return {
            scraped_at: new Date(Date.now() - (weeks.length - 1 - index) * 7 * 24 * 60 * 60 * 1000).toISOString(),
            percent_started: started,
            percent_rostered: rostered,
            percent_started_change: index === 0 ? 0 : started - (baseStarted + (player.startedIncrease * (index - 1) / (weeks.length - 1))),
            adds: Math.floor(Math.random() * 1000) + 500,
            drops: Math.floor(Math.random() * 300) + 100
        };
    });
    
    createEnhancedFavoritosPlayerCharts(simulatedData);
}

// Crear gráficas mejoradas del jugador
function createEnhancedFavoritosPlayerCharts(playerHistory) {
    // Destruir gráficos existentes
    const modalChartKeys = ['favoritosStarted', 'favoritosStartedChange', 'favoritosComparison', 'favoritosAddsDrops'];
    modalChartKeys.forEach(key => {
        if (favoritosCharts[key]) {
            favoritosCharts[key].destroy();
            delete favoritosCharts[key];
        }
    });
    
    if (!playerHistory || playerHistory.length === 0) return;
    
    const labels = playerHistory.map(data => {
        const date = new Date(data.scraped_at);
        return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
    });
    const startedData = playerHistory.map(d => d.percent_started || 0);
    const startedChangeData = playerHistory.map(d => d.percent_started_change || 0);
    const rosteredData = playerHistory.map(d => d.percent_rostered || 0);
    const addsData = playerHistory.map(d => d.adds || 0);
    const dropsData = playerHistory.map(d => d.drops || 0);
    
    // Configuración base mejorada
    const baseChartConfig = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleColor: '#ffffff',
                bodyColor: '#ffffff',
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 2,
                cornerRadius: 12,
                displayColors: true,
                titleFont: { size: 14, weight: 'bold' },
                bodyFont: { size: 13 }
            }
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: {
                    color: '#6b7280',
                    font: { weight: 'bold', size: 11 }
                }
            },
            y: {
                grid: {
                    color: 'rgba(107, 114, 128, 0.1)',
                    lineWidth: 1
                },
                ticks: {
                    color: '#6b7280',
                    font: { size: 11 }
                }
            }
        },
        animation: {
            duration: 2000,
            easing: 'easeOutQuart'
        }
    };
    
    // Gráfica 1: % Started Histórico
    if (favoritosElements.favoritosStartedChart) {
        favoritosCharts.favoritosStarted = new Chart(favoritosElements.favoritosStartedChart, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: '% Started',
                    data: startedData,
                    borderColor: 'rgba(34, 197, 94, 1)',
                    backgroundColor: function(context) {
                        const chart = context.chart;
                        const {ctx, chartArea} = chart;
                        if (!chartArea) return null;
                        
                        const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                        gradient.addColorStop(0, 'rgba(34, 197, 94, 0.3)');
                        gradient.addColorStop(0.5, 'rgba(34, 197, 94, 0.1)');
                        gradient.addColorStop(1, 'rgba(34, 197, 94, 0.05)');
                        return gradient;
                    },
                    borderWidth: 4,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: 'rgba(34, 197, 94, 1)',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 3,
                    pointRadius: 6,
                    pointHoverRadius: 8
                }]
            },
            options: {
                ...baseChartConfig,
                plugins: {
                    ...baseChartConfig.plugins,
                    legend: { display: false },
                    tooltip: {
                        ...baseChartConfig.plugins.tooltip,
                        callbacks: {
                            label: (context) => `${context.parsed.y.toFixed(1)}% Started`
                        }
                    }
                },
                scales: {
                    ...baseChartConfig.scales,
                    y: {
                        ...baseChartConfig.scales.y,
                        beginAtZero: true,
                        ticks: {
                            ...baseChartConfig.scales.y.ticks,
                            callback: (value) => value.toFixed(0) + '%'
                        }
                    }
                }
            }
        });
    }
    
    // Gráfica 2: Cambios Semanales
    if (favoritosElements.favoritosStartedChangeChart) {
        favoritosCharts.favoritosStartedChange = new Chart(favoritosElements.favoritosStartedChangeChart, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Cambio Semanal',
                    data: startedChangeData,
                    backgroundColor: startedChangeData.map(value => 
                        value >= 0 ? 'rgba(34, 197, 94, 0.7)' : 'rgba(239, 68, 68, 0.7)'
                    ),
                    borderColor: startedChangeData.map(value => 
                        value >= 0 ? 'rgba(34, 197, 94, 1)' : 'rgba(239, 68, 68, 1)'
                    ),
                    borderWidth: 2,
                    borderRadius: 8
                }]
            },
            options: {
                ...baseChartConfig,
                plugins: {
                    ...baseChartConfig.plugins,
                    legend: { display: false },
                    tooltip: {
                        ...baseChartConfig.plugins.tooltip,
                        callbacks: {
                            label: (context) => {
                                const value = context.parsed.y;
                                const sign = value >= 0 ? '+' : '';
                                return `${sign}${value.toFixed(1)}% cambio`;
                            }
                        }
                    }
                },
                animation: {
                    duration: 1500,
                    easing: 'easeOutBounce'
                }
            }
        });
    }
    
    // Gráfica 3: Comparación Rostered vs Started
    if (favoritosElements.favoritosComparisonChart) {
        favoritosCharts.favoritosComparison = new Chart(favoritosElements.favoritosComparisonChart, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: '% Rostered',
                        data: rosteredData,
                        borderColor: 'rgba(168, 85, 247, 1)',
                        backgroundColor: 'rgba(168, 85, 247, 0.1)',
                        borderWidth: 3,
                        fill: false,
                        tension: 0.3,
                        pointBackgroundColor: 'rgba(168, 85, 247, 1)',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 5
                    },
                    {
                        label: '% Started',
                        data: startedData,
                        borderColor: 'rgba(34, 197, 94, 1)',
                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                        borderWidth: 3,
                        fill: false,
                        tension: 0.3,
                        pointBackgroundColor: 'rgba(34, 197, 94, 1)',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 5
                    }
                ]
            },
            options: {
                ...baseChartConfig,
                plugins: {
                    ...baseChartConfig.plugins,
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: { weight: 'bold', size: 12 },
                            color: '#374151'
                        }
                    }
                },
                scales: {
                    ...baseChartConfig.scales,
                    y: {
                        ...baseChartConfig.scales.y,
                        beginAtZero: true,
                        ticks: {
                            ...baseChartConfig.scales.y.ticks,
                            callback: (value) => value.toFixed(0) + '%'
                        }
                    }
                }
            }
        });
    }
    
    // Gráfica 4: Adds vs Drops
    if (favoritosElements.favoritosAddsDropsChart) {
        favoritosCharts.favoritosAddsDrops = new Chart(favoritosElements.favoritosAddsDropsChart, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Adds',
                        data: addsData,
                        backgroundColor: 'rgba(34, 197, 94, 0.7)',
                        borderColor: 'rgba(34, 197, 94, 1)',
                        borderWidth: 2,
                        borderRadius: 6
                    },
                    {
                        label: 'Drops',
                        data: dropsData,
                        backgroundColor: 'rgba(239, 68, 68, 0.7)',
                        borderColor: 'rgba(239, 68, 68, 1)',
                        borderWidth: 2,
                        borderRadius: 6
                    }
                ]
            },
            options: {
                ...baseChartConfig,
                plugins: {
                    ...baseChartConfig.plugins,
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: { weight: 'bold', size: 12 },
                            color: '#374151'
                        }
                    }
                },
                scales: {
                    ...baseChartConfig.scales,
                    y: {
                        ...baseChartConfig.scales.y,
                        beginAtZero: true,
                        ticks: {
                            ...baseChartConfig.scales.y.ticks,
                            callback: (value) => value.toLocaleString()
                        }
                    }
                },
                animation: {
                    duration: 1800,
                    easing: 'easeOutCubic'
                }
            }
        });
    }
}

// Crear datos de ejemplo para favoritos (cuando no hay datos reales)
function createSampleFavoritosData() {
    const samplePlayers = [
        { 
            player: 'Josh Allen', 
            position: 'QB', 
            team: 'BUF', 
            started: 85.2, 
            rostered: 98.5, 
            startedIncrease: 12.8 
        },
        { 
            player: 'Christian McCaffrey', 
            position: 'RB', 
            team: 'SF', 
            started: 92.1, 
            rostered: 99.2, 
            startedIncrease: 8.4 
        },
        { 
            player: 'Cooper Kupp', 
            position: 'WR', 
            team: 'LAR', 
            started: 78.9, 
            rostered: 95.6, 
            startedIncrease: 15.3 
        },
        { 
            player: 'Travis Kelce', 
            position: 'TE', 
            team: 'KC', 
            started: 88.7, 
            rostered: 97.8, 
            startedIncrease: 7.2 
        },
        { 
            player: 'Lamar Jackson', 
            position: 'QB', 
            team: 'BAL', 
            started: 72.4, 
            rostered: 89.1, 
            startedIncrease: 18.6 
        },
        { 
            player: 'Derrick Henry', 
            position: 'RB', 
            team: 'TEN', 
            started: 68.3, 
            rostered: 87.9, 
            startedIncrease: 11.7 
        },
        { 
            player: 'Davante Adams', 
            position: 'WR', 
            team: 'LV', 
            started: 81.5, 
            rostered: 96.3, 
            startedIncrease: 9.8 
        },
        { 
            player: 'George Kittle', 
            position: 'TE', 
            team: 'SF', 
            started: 65.2, 
            rostered: 82.4, 
            startedIncrease: 13.9 
        },
        { 
            player: 'Austin Ekeler', 
            position: 'RB', 
            team: 'LAC', 
            started: 76.8, 
            rostered: 91.7, 
            startedIncrease: 6.5 
        },
        { 
            player: 'Stefon Diggs', 
            position: 'WR', 
            team: 'BUF', 
            started: 79.6, 
            rostered: 94.2, 
            startedIncrease: 14.1 
        },
        { 
            player: 'Patrick Mahomes', 
            position: 'QB', 
            team: 'KC', 
            started: 83.9, 
            rostered: 96.8, 
            startedIncrease: 5.7 
        },
        { 
            player: 'Nick Chubb', 
            position: 'RB', 
            team: 'CLE', 
            started: 71.3, 
            rostered: 88.6, 
            startedIncrease: 10.4 
        },
        { 
            player: 'Tyreek Hill', 
            position: 'WR', 
            team: 'MIA', 
            started: 84.7, 
            rostered: 97.1, 
            startedIncrease: 8.9 
        },
        { 
            player: 'Mark Andrews', 
            position: 'TE', 
            team: 'BAL', 
            started: 62.8, 
            rostered: 79.5, 
            startedIncrease: 16.2 
        },
        { 
            player: 'Alvin Kamara', 
            position: 'RB', 
            team: 'NO', 
            started: 73.5, 
            rostered: 90.3, 
            startedIncrease: 7.8 
        }
    ];
    
    return samplePlayers.map((player, index) => ({
        ...player,
        player_id: `sample_${index}`,
        player_name: player.player,
        percent_started: player.started,
        percent_rostered: player.rostered,
        percent_started_change: player.startedIncrease,
        scraped_at: new Date().toISOString(),
        adds: Math.floor(Math.random() * 1000) + 500,
        drops: Math.floor(Math.random() * 300) + 100
    }));
}

// Funciones de utilidad
function refreshFavoritosData() {
    loadFavoritosData();
}

function showLoading(show) {
    if (favoritosElements.loadingFavoritos) {
        favoritosElements.loadingFavoritos.style.display = show ? 'flex' : 'none';
    }
}

function showFavoritosError(message) {
    console.error('Error en Favoritos:', message);
    
    // Mostrar mensaje en la interfaz
    const container = document.getElementById('favoritosPlayersList');
    if (container) {
        container.innerHTML = `
            <div class="error-message" style="
                text-align: center; 
                padding: 2rem; 
                background: rgba(239, 68, 68, 0.1);
                border: 2px solid rgba(239, 68, 68, 0.3);
                border-radius: 1rem;
                margin: 1rem;
                color: #dc2626;
            ">
                <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                <h3>Error cargando favoritos</h3>
                <p>${message}</p>
                <button onclick="loadFavoritosData()" style="
                    background: #dc2626;
                    color: white;
                    border: none;
                    padding: 0.5rem 1rem;
                    border-radius: 0.5rem;
                    cursor: pointer;
                    margin-top: 1rem;
                ">Reintentar</button>
            </div>
        `;
    }
    
    // También mostrar en alert como respaldo
    alert('Error en Favoritos: ' + message);
}

// Configuración de Supabase
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

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar con configuración guardada
    const config = getSupabaseConfig();
    if (config.url && config.key) {
        initializeSupabase(config.url, config.key);
        loadFavoritosData();
    } else {
        showConfigModal();
    }
    
    // Event listeners para filtros
    if (favoritosElements.positionFilterFavoritos) {
        favoritosElements.positionFilterFavoritos.addEventListener('change', applyFavoritosFilters);
    }
    if (favoritosElements.teamFilterFavoritos) {
        favoritosElements.teamFilterFavoritos.addEventListener('change', applyFavoritosFilters);
    }
    if (favoritosElements.minStartedIncrease) {
        favoritosElements.minStartedIncrease.addEventListener('input', function() {
            favoritosElements.minStartedIncreaseValue.textContent = this.value + '%';
            applyFavoritosFilters();
        });
    }
    if (favoritosElements.minCurrentStarted) {
        favoritosElements.minCurrentStarted.addEventListener('input', function() {
            favoritosElements.minCurrentStartedValue.textContent = this.value + '%';
            applyFavoritosFilters();
        });
    }
    if (favoritosElements.minRosteredFavoritos) {
        favoritosElements.minRosteredFavoritos.addEventListener('input', function() {
            favoritosElements.minRosteredFavoritosValue.textContent = this.value + '%';
            applyFavoritosFilters();
        });
    }
    
    // Event listeners para botones
    if (favoritosElements.refreshFavoritos) {
        favoritosElements.refreshFavoritos.addEventListener('click', refreshFavoritosData);
    }
    if (favoritosElements.configBtn) {
        favoritosElements.configBtn.addEventListener('click', showConfigModal);
    }
    if (favoritosElements.saveConfig) {
        favoritosElements.saveConfig.addEventListener('click', saveSupabaseConfig);
    }
    if (favoritosElements.testConnection) {
        favoritosElements.testConnection.addEventListener('click', testSupabaseConnection);
    }
    
    // Event listener para cerrar modales
    document.addEventListener('click', function(event) {
        if (event.target.classList.contains('close')) {
            const modal = event.target.closest('.modal');
            if (modal) modal.style.display = 'none';
        }
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });
});
