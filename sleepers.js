// Configuración global para Sleepers
let supabaseClient = null;
let allSleeperData = [];
let filteredSleeperData = [];
let sleeperCharts = {};

// Configuración de Supabase
const SUPABASE_CONFIG_KEY = 'supabase_config';

// Elementos del DOM
const sleeperElements = {
    loadingSleepers: document.getElementById('loadingSleepers'),
    sleeperContent: document.getElementById('sleeperContent'),
    sleeperMode: document.getElementById('sleeperMode'),
    refreshSleepers: document.getElementById('refreshSleepers'),
    configBtn: document.getElementById('configBtn'),
    configModal: document.getElementById('configModal'),
    supabaseUrl: document.getElementById('supabaseUrl'),
    supabaseKey: document.getElementById('supabaseKey'),
    saveConfig: document.getElementById('saveConfig'),
    testConnection: document.getElementById('testConnection'),
    
    // Filtros
    positionFilterSleeper: document.getElementById('positionFilterSleeper'),
    weekFilterSleeper: document.getElementById('weekFilterSleeper'),
    maxRostered: document.getElementById('maxRostered'),
    maxRosteredValue: document.getElementById('maxRosteredValue'),
    minStarted: document.getElementById('minStarted'),
    minStartedValue: document.getElementById('minStartedValue'),
    minStartedChange: document.getElementById('minStartedChange'),
    minStartedChangeValue: document.getElementById('minStartedChangeValue'),
    
    // Métricas
    topSleeperMetric: document.getElementById('topSleeperMetric'),
    topSleeperPosition: document.getElementById('topSleeperPosition'),
    momentumSleeperMetric: document.getElementById('momentumSleeperMetric'),
    momentumSleeperChange: document.getElementById('momentumSleeperChange'),
    hiddenSleeperMetric: document.getElementById('hiddenSleeperMetric'),
    hiddenSleeperRostered: document.getElementById('hiddenSleeperRostered'),
    hottestSleeperMetric: document.getElementById('hottestSleeperMetric'),
    hottestSleeperAdds: document.getElementById('hottestSleeperAdds'),
    
    // Resumen
    totalSleepers: document.getElementById('totalSleepers'),
    highPotentialSleepers: document.getElementById('highPotentialSleepers'),
    topSleeperName: document.getElementById('topSleeperName'),
    avgSleeperScore: document.getElementById('avgSleeperScore'),
    
    // Lista
    sleepersList: document.getElementById('sleepersList'),
    sortBySleeper: document.getElementById('sortBySleeper'),
    sortOrderSleeper: document.getElementById('sortOrderSleeper'),
    
    // Modal
    sleeperPlayerModal: document.getElementById('sleeperPlayerModal'),
    sleeperModalPlayerName: document.getElementById('sleeperModalPlayerName'),
    sleeperModalScore: document.getElementById('sleeperModalScore'),
    sleeperModalPosition: document.getElementById('sleeperModalPosition'),
    sleeperModalTeam: document.getElementById('sleeperModalTeam'),
    sleeperModalRostered: document.getElementById('sleeperModalRostered'),
    sleeperModalStarted: document.getElementById('sleeperModalStarted'),
    sleeperModalStartedChange: document.getElementById('sleeperModalStartedChange'),
    sleeperModalOpportunity: document.getElementById('sleeperModalOpportunity')
};

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    if (typeof Chart === 'undefined') {
        showSleeperError('Error: Chart.js no se ha cargado correctamente.');
        return;
    }
    
    if (typeof window.supabase === 'undefined') {
        showSleeperError('Error: Supabase no se ha cargado correctamente.');
        return;
    }
    
    console.log('Inicializando Sleepers Dashboard');
    initializeSleepers();
    setupSleeperEventListeners();
    loadSavedConfig();
});

// Configuración inicial
function initializeSleepers() {
    showSleeperLoadingState();
    
    const savedConfig = localStorage.getItem(SUPABASE_CONFIG_KEY);
    if (!savedConfig) {
        showConfigModal();
    } else {
        const config = JSON.parse(savedConfig);
        initializeSupabase(config.url, config.key);
    }
}

// Event listeners
function setupSleeperEventListeners() {
    sleeperElements.sleeperMode.addEventListener('change', changeSleeperMode);
    sleeperElements.refreshSleepers.addEventListener('click', refreshSleeperData);
    sleeperElements.configBtn.addEventListener('click', showConfigModal);
    sleeperElements.saveConfig.addEventListener('click', saveSupabaseConfig);
    sleeperElements.testConnection.addEventListener('click', testSupabaseConnection);
    
    // Filtros
    sleeperElements.positionFilterSleeper.addEventListener('change', applySleeperFilters);
    sleeperElements.weekFilterSleeper.addEventListener('change', applySleeperFilters);
    sleeperElements.maxRostered.addEventListener('input', updateMaxRosteredFilter);
    sleeperElements.minStarted.addEventListener('input', updateMinStartedFilter);
    sleeperElements.minStartedChange.addEventListener('input', updateMinStartedChangeFilter);
    
    // Ordenamiento
    sleeperElements.sortBySleeper.addEventListener('change', sortSleepers);
    sleeperElements.sortOrderSleeper.addEventListener('click', toggleSleeperSortOrder);
    
    setupModalEvents();
}

// Configurar eventos de modales
function setupModalEvents() {
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

// Cargar configuración guardada
function loadSavedConfig() {
    const savedConfig = localStorage.getItem(SUPABASE_CONFIG_KEY);
    if (savedConfig) {
        const config = JSON.parse(savedConfig);
        sleeperElements.supabaseUrl.value = config.url || '';
        sleeperElements.supabaseKey.value = config.key || '';
    }
}

// Inicializar Supabase
function initializeSupabase(url, key) {
    try {
        supabaseClient = window.supabase.createClient(url, key);
        console.log('Cliente de Supabase inicializado - Sleepers');
        loadSleeperData();
    } catch (error) {
        console.error('Error inicializando Supabase:', error);
        showSleeperError('Error al conectar con Supabase: ' + error.message);
        showConfigModal();
    }
}

// Cargar datos
async function loadSleeperData() {
    if (!supabaseClient) {
        showSleeperError('Supabase no está configurado');
        return;
    }
    
    showSleeperLoadingState();
    
    try {
        const { data, error } = await supabaseClient
            .from('nfl_fantasy_trends')
            .select('*')
            .order('scraped_at', { ascending: false });
        
        if (error) {
            throw error;
        }
        
        allSleeperData = data || [];
        processSleeperData();
        populateSleeperFilters();
        hideSleeperLoadingState();
        
    } catch (error) {
        console.error('Error cargando datos de Sleepers:', error);
        showSleeperError('Error al cargar los datos: ' + error.message);
        hideSleeperLoadingState();
    }
}

// Procesar datos para detectar sleepers
function processSleeperData() {
    // Calcular scores para cada jugador
    allSleeperData.forEach(player => {
        // Score base: Started vs Rostered ratio
        const rosteredPercent = player.percent_rostered || 0;
        const startedPercent = player.percent_started || 0;
        const startedChange = player.percent_started_change || 0;
        const adds = player.adds || 0;
        
        // Sleeper Score: Alto started/bajo rostered + momentum
        let sleeperScore = 0;
        
        if (rosteredPercent > 0) {
            // Ratio started/rostered (mayor es mejor)
            const startedRosteredRatio = startedPercent / rosteredPercent;
            sleeperScore += startedRosteredRatio * 20;
        }
        
        // Bonus por started change positivo
        if (startedChange > 0) {
            sleeperScore += startedChange * 2;
        }
        
        // Bonus por momentum (adds recientes)
        if (adds > 0) {
            sleeperScore += Math.log(adds + 1) * 5;
        }
        
        // Penalty por alto rostered (queremos sleepers)
        if (rosteredPercent > 30) {
            sleeperScore *= 0.5;
        }
        
        // Bonus por bajo rostered pero alto started
        if (rosteredPercent < 25 && startedPercent > 15) {
            sleeperScore += 15;
        }
        
        player.sleeper_score = Math.round(sleeperScore * 10) / 10;
        
        // Calcular opportunity score
        const opportunity = calculateOpportunityScore(player);
        player.opportunity_score = opportunity;
        
        // Clasificar nivel de sleeper
        if (player.sleeper_score >= 50) {
            player.sleeper_tier = 'elite';
            player.sleeper_label = '🌟 Elite';
        } else if (player.sleeper_score >= 30) {
            player.sleeper_tier = 'high';
            player.sleeper_label = '🔥 Alto';
        } else if (player.sleeper_score >= 15) {
            player.sleeper_tier = 'medium';
            player.sleeper_label = '⭐ Medio';
        } else {
            player.sleeper_tier = 'low';
            player.sleeper_label = '💤 Bajo';
        }
    });
    
    filteredSleeperData = [...allSleeperData];
    applySleeperFilters();
}

// Calcular score de oportunidad
function calculateOpportunityScore(player) {
    const rostered = player.percent_rostered || 0;
    const started = player.percent_started || 0;
    const startedChange = player.percent_started_change || 0;
    
    // Oportunidad alta = bajo rostered + alto started/started change
    let opportunity = 0;
    
    // Disponibilidad (inverso del rostered)
    opportunity += (100 - rostered) * 0.5;
    
    // Confianza del mercado (started)
    opportunity += started * 0.3;
    
    // Momentum (started change)
    if (startedChange > 0) {
        opportunity += startedChange * 0.2;
    }
    
    return Math.round(opportunity * 10) / 10;
}

// Poblar filtros
function populateSleeperFilters() {
    const weeks = [...new Set(allSleeperData.map(d => d.semana))].sort((a, b) => b - a);
    sleeperElements.weekFilterSleeper.innerHTML = '<option value="">Todas las semanas</option>';
    weeks.forEach(week => {
        if (week) {
            const option = document.createElement('option');
            option.value = week;
            option.textContent = `Semana ${week}`;
            sleeperElements.weekFilterSleeper.appendChild(option);
        }
    });
}

// Filtros
function updateMaxRosteredFilter() {
    const value = sleeperElements.maxRostered.value;
    sleeperElements.maxRosteredValue.textContent = `${value}%`;
    applySleeperFilters();
}

function updateMinStartedFilter() {
    const value = sleeperElements.minStarted.value;
    sleeperElements.minStartedValue.textContent = `${value}%`;
    applySleeperFilters();
}

function updateMinStartedChangeFilter() {
    const value = sleeperElements.minStartedChange.value;
    sleeperElements.minStartedChangeValue.textContent = `${value}%`;
    applySleeperFilters();
}

// Aplicar filtros
function applySleeperFilters() {
    const position = sleeperElements.positionFilterSleeper.value;
    const week = sleeperElements.weekFilterSleeper.value;
    const maxRostered = parseFloat(sleeperElements.maxRostered.value);
    const minStarted = parseFloat(sleeperElements.minStarted.value);
    const minStartedChange = parseFloat(sleeperElements.minStartedChange.value);
    
    filteredSleeperData = allSleeperData.filter(player => {
        // Solo jugadores con score sleeper > 0
        if ((player.sleeper_score || 0) <= 0) return false;
        
        // Filtros básicos
        if (position && player.position !== position) return false;
        if (week && player.semana !== parseInt(week)) return false;
        
        // Criterios de sleeper
        if ((player.percent_rostered || 0) > maxRostered) return false;
        if ((player.percent_started || 0) < minStarted) return false;
        if (Math.abs(player.percent_started_change || 0) < minStartedChange) return false;
        
        return true;
    });
    
    updateSleeperMetrics();
    updateSleeperSummary();
    createSleeperCharts();
    displaySleepers();
}

// Cambiar modo de detección
function changeSleeperMode() {
    const mode = sleeperElements.sleeperMode.value;
    
    // Reajustar filtros según el modo
    switch (mode) {
        case 'high_started':
            sleeperElements.minStarted.value = 25;
            sleeperElements.minStartedChange.value = 0;
            break;
        case 'started_trending':
            sleeperElements.minStarted.value = 10;
            sleeperElements.minStartedChange.value = 8;
            break;
        case 'balanced':
            sleeperElements.minStarted.value = 15;
            sleeperElements.minStartedChange.value = 3;
            break;
    }
    
    updateMinStartedFilter();
    updateMinStartedChangeFilter();
    applySleeperFilters();
}

// Actualizar métricas
function updateSleeperMetrics() {
    if (filteredSleeperData.length === 0) {
        sleeperElements.topSleeperMetric.textContent = '-';
        sleeperElements.topSleeperPosition.textContent = '-';
        sleeperElements.momentumSleeperMetric.textContent = '-';
        sleeperElements.momentumSleeperChange.textContent = '-';
        sleeperElements.hiddenSleeperMetric.textContent = '-';
        sleeperElements.hiddenSleeperRostered.textContent = '-';
        sleeperElements.hottestSleeperMetric.textContent = '-';
        sleeperElements.hottestSleeperAdds.textContent = '-';
        return;
    }
    
    // Top sleeper (mayor score)
    const topSleeper = filteredSleeperData.reduce((max, player) => 
        (player.sleeper_score || 0) > (max.sleeper_score || 0) ? player : max
    );
    
    // Mayor momentum (started change)
    const momentumSleeper = filteredSleeperData.reduce((max, player) => 
        (player.percent_started_change || 0) > (max.percent_started_change || 0) ? player : max
    );
    
    // Más oculto (menor rostered)
    const hiddenSleeper = filteredSleeperData.reduce((min, player) => 
        (player.percent_rostered || 100) < (min.percent_rostered || 100) ? player : min
    );
    
    // Más hot (más adds)
    const hottestSleeper = filteredSleeperData.reduce((max, player) => 
        (player.adds || 0) > (max.adds || 0) ? player : max
    );
    
    // Actualizar elementos
    sleeperElements.topSleeperMetric.textContent = topSleeper.player_name || '-';
    sleeperElements.topSleeperPosition.textContent = `${topSleeper.position || '-'} - Score: ${topSleeper.sleeper_score || 0}`;
    
    sleeperElements.momentumSleeperMetric.textContent = momentumSleeper.player_name || '-';
    sleeperElements.momentumSleeperChange.textContent = `+${(momentumSleeper.percent_started_change || 0).toFixed(1)}% Started`;
    
    sleeperElements.hiddenSleeperMetric.textContent = hiddenSleeper.player_name || '-';
    sleeperElements.hiddenSleeperRostered.textContent = `${(hiddenSleeper.percent_rostered || 0).toFixed(1)}% Rostered`;
    
    sleeperElements.hottestSleeperMetric.textContent = hottestSleeper.player_name || '-';
    sleeperElements.hottestSleeperAdds.textContent = `${hottestSleeper.adds || 0} Adds`;
}

// Actualizar resumen
function updateSleeperSummary() {
    const totalSleepers = filteredSleeperData.length;
    const highPotential = filteredSleeperData.filter(p => (p.sleeper_score || 0) >= 30).length;
    const avgScore = totalSleepers > 0 ? 
        (filteredSleeperData.reduce((sum, p) => sum + (p.sleeper_score || 0), 0) / totalSleepers).toFixed(1) : 
        0;
    
    const topSleeper = filteredSleeperData.length > 0 ? 
        filteredSleeperData.reduce((max, player) => 
            (player.sleeper_score || 0) > (max.sleeper_score || 0) ? player : max
        ) : null;
    
    sleeperElements.totalSleepers.textContent = totalSleepers;
    sleeperElements.highPotentialSleepers.textContent = highPotential;
    sleeperElements.topSleeperName.textContent = topSleeper ? topSleeper.player_name : '-';
    sleeperElements.avgSleeperScore.textContent = avgScore;
}

// Crear gráficos
function createSleeperCharts() {
    // Destruir gráficos existentes
    Object.values(sleeperCharts).forEach(chart => {
        if (chart) chart.destroy();
    });
    
    createSleeperPositionChart();
    createSleeperScatterChart();
}

// Gráfico de distribución por posición
function createSleeperPositionChart() {
    const positionCounts = {};
    filteredSleeperData.forEach(player => {
        const pos = player.position || 'Unknown';
        positionCounts[pos] = (positionCounts[pos] || 0) + 1;
    });
    
    const ctx = document.getElementById('sleeperPositionChart').getContext('2d');
    sleeperCharts.position = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(positionCounts),
            datasets: [{
                data: Object.values(positionCounts),
                backgroundColor: [
                    '#3b82f6', // QB
                    '#10b981', // RB
                    '#f59e0b', // WR
                    '#ef4444', // TE
                    '#8b5cf6', // K
                    '#6b7280'  // DEF
                ],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Gráfico scatter Score vs Rostered
function createSleeperScatterChart() {
    const ctx = document.getElementById('sleeperScatterChart').getContext('2d');
    sleeperCharts.scatter = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Sleepers',
                data: filteredSleeperData.map(player => ({
                    x: player.percent_rostered || 0,
                    y: player.sleeper_score || 0,
                    player: player.player_name
                })),
                backgroundColor: 'rgba(59, 130, 246, 0.6)',
                borderColor: '#3b82f6',
                pointRadius: 6,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            return context[0].raw.player;
                        },
                        label: function(context) {
                            return [
                                `% Rostered: ${context.parsed.x}%`,
                                `Score Sleeper: ${context.parsed.y}`
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: '% Rostered'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Score Sleeper'
                    }
                }
            }
        }
    });
}

// Mostrar sleepers
function displaySleepers() {
    const container = sleeperElements.sleepersList;
    
    if (filteredSleeperData.length === 0) {
        container.innerHTML = '<div class="no-sleepers">No se encontraron sleepers según los criterios aplicados</div>';
        return;
    }
    
    let html = '';
    filteredSleeperData.slice(0, 50).forEach(player => {
        const tierClass = `sleeper-tier-${player.sleeper_tier}`;
        
        html += `
            <div class="sleeper-card ${tierClass}" onclick="showSleeperDetails('${player.player_id}')">
                <div class="sleeper-header">
                    <div class="sleeper-player-info">
                        <h4 class="sleeper-player-name">${player.player_name}</h4>
                        <div class="sleeper-player-meta">
                            <span class="sleeper-position">${player.position}</span>
                            <span class="sleeper-team">${player.team || 'N/A'}</span>
                            <span class="sleeper-week">Semana ${player.semana || 'N/A'}</span>
                        </div>
                    </div>
                    <div class="sleeper-tier-badge ${player.sleeper_tier}">
                        ${player.sleeper_label}
                    </div>
                </div>
                
                <div class="sleeper-metrics">
                    <div class="sleeper-metric">
                        <span class="metric-label">Score Sleeper:</span>
                        <span class="metric-value sleeper-score">${player.sleeper_score.toFixed(1)}</span>
                    </div>
                    <div class="sleeper-metric">
                        <span class="metric-label">% Rostered:</span>
                        <span class="metric-value">${(player.percent_rostered || 0).toFixed(1)}%</span>
                    </div>
                    <div class="sleeper-metric">
                        <span class="metric-label">% Started:</span>
                        <span class="metric-value">${(player.percent_started || 0).toFixed(1)}%</span>
                    </div>
                    <div class="sleeper-metric">
                        <span class="metric-label">Started Change:</span>
                        <span class="metric-value ${(player.percent_started_change || 0) > 0 ? 'positive' : 'negative'}">
                            ${(player.percent_started_change || 0) > 0 ? '+' : ''}${(player.percent_started_change || 0).toFixed(1)}%
                        </span>
                    </div>
                    <div class="sleeper-metric">
                        <span class="metric-label">Oportunidad:</span>
                        <span class="metric-value">${player.opportunity_score.toFixed(1)}</span>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Mostrar detalles del sleeper
async function showSleeperDetails(playerId) {
    const player = allSleeperData.find(p => p.player_id === playerId);
    if (!player) return;
    
    // Llenar información básica
    sleeperElements.sleeperModalPlayerName.textContent = player.player_name;
    sleeperElements.sleeperModalScore.textContent = player.sleeper_score.toFixed(1);
    sleeperElements.sleeperModalPosition.textContent = player.position || 'N/A';
    sleeperElements.sleeperModalTeam.textContent = player.team || 'N/A';
    sleeperElements.sleeperModalRostered.textContent = `${(player.percent_rostered || 0).toFixed(1)}%`;
    sleeperElements.sleeperModalStarted.textContent = `${(player.percent_started || 0).toFixed(1)}%`;
    sleeperElements.sleeperModalStartedChange.textContent = `${(player.percent_started_change || 0) > 0 ? '+' : ''}${(player.percent_started_change || 0).toFixed(1)}%`;
    sleeperElements.sleeperModalOpportunity.textContent = player.opportunity_score.toFixed(1);
    
    // Obtener datos históricos
    await loadSleeperPlayerHistory(playerId);
    
    // Mostrar modal
    sleeperElements.sleeperPlayerModal.style.display = 'block';
}

// Cargar historial del sleeper
async function loadSleeperPlayerHistory(playerId) {
    try {
        const { data, error } = await supabaseClient
            .from('nfl_fantasy_trends')
            .select('*')
            .eq('player_id', playerId)
            .order('scraped_at', { ascending: true });
        
        if (error) {
            throw error;
        }
        
        createSleeperPlayerCharts(data);
        
    } catch (error) {
        console.error('Error cargando historial del sleeper:', error);
        showSleeperError('Error al cargar el historial del jugador');
    }
}

// Crear gráficos del modal (igual que otras páginas)
function createSleeperPlayerCharts(playerHistory) {
    // Destruir gráficos existentes
    Object.keys(sleeperCharts).forEach(key => {
        if (sleeperCharts[key] && key.includes('sleeper')) {
            sleeperCharts[key].destroy();
        }
    });
    
    const labels = playerHistory.map(data => new Date(data.scraped_at).toLocaleDateString('es-ES'));
    
    // Configuración base
    const baseConfig = {
        type: 'line',
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { title: { display: true, text: 'Fecha' } },
                y: { beginAtZero: true }
            },
            elements: {
                line: { tension: 0.4 },
                point: { radius: 4, hoverRadius: 6 }
            }
        }
    };
    
    // Gráfico % Rostered
    sleeperCharts.sleeperRostered = new Chart(document.getElementById('sleeperRosteredChart'), {
        ...baseConfig,
        data: {
            labels: labels,
            datasets: [{
                label: '% Rostered',
                data: playerHistory.map(data => data.percent_rostered || 0),
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                fill: true
            }]
        }
    });
    
    // Gráfico Cambios % Rostered
    sleeperCharts.sleeperRosteredChange = new Chart(document.getElementById('sleeperRosteredChangeChart'), {
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
        }
    });
    
    // Gráfico % Started
    sleeperCharts.sleeperStarted = new Chart(document.getElementById('sleeperStartedChart'), {
        ...baseConfig,
        data: {
            labels: labels,
            datasets: [{
                label: '% Started',
                data: playerHistory.map(data => data.percent_started || 0),
                borderColor: '#f59e0b',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                fill: true
            }]
        }
    });
    
    // Gráfico Cambios % Started
    sleeperCharts.sleeperStartedChange = new Chart(document.getElementById('sleeperStartedChangeChart'), {
        ...baseConfig,
        data: {
            labels: labels,
            datasets: [{
                label: 'Cambio % Started',
                data: playerHistory.map(data => data.percent_started_change || 0),
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                fill: true
            }]
        }
    });
    
    // Gráfico Adds
    sleeperCharts.sleeperAdds = new Chart(document.getElementById('sleeperAddsChart'), {
        ...baseConfig,
        data: {
            labels: labels,
            datasets: [{
                label: 'Adds',
                data: playerHistory.map(data => data.adds || 0),
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                fill: true
            }]
        }
    });
    
    // Gráfico Drops
    sleeperCharts.sleeperDrops = new Chart(document.getElementById('sleeperDropsChart'), {
        ...baseConfig,
        data: {
            labels: labels,
            datasets: [{
                label: 'Drops',
                data: playerHistory.map(data => data.drops || 0),
                borderColor: '#6b7280',
                backgroundColor: 'rgba(107, 114, 128, 0.1)',
                fill: true
            }]
        }
    });
}

// Ordenar sleepers
function sortSleepers() {
    const sortBy = sleeperElements.sortBySleeper.value;
    const order = sleeperElements.sortOrderSleeper.dataset.order;
    
    filteredSleeperData.sort((a, b) => {
        let aVal, bVal;
        
        switch (sortBy) {
            case 'sleeper_score':
                aVal = a.sleeper_score || 0;
                bVal = b.sleeper_score || 0;
                break;
            case 'percent_started':
                aVal = a.percent_started || 0;
                bVal = b.percent_started || 0;
                break;
            case 'percent_started_change':
                aVal = a.percent_started_change || 0;
                bVal = b.percent_started_change || 0;
                break;
            case 'percent_rostered':
                aVal = a.percent_rostered || 0;
                bVal = b.percent_rostered || 0;
                break;
            case 'opportunity_score':
                aVal = a.opportunity_score || 0;
                bVal = b.opportunity_score || 0;
                break;
            default:
                aVal = a.sleeper_score || 0;
                bVal = b.sleeper_score || 0;
        }
        
        return order === 'asc' ? aVal - bVal : bVal - aVal;
    });
    
    displaySleepers();
}

// Cambiar orden
function toggleSleeperSortOrder() {
    const currentOrder = sleeperElements.sortOrderSleeper.dataset.order;
    const newOrder = currentOrder === 'asc' ? 'desc' : 'asc';
    
    sleeperElements.sortOrderSleeper.dataset.order = newOrder;
    sleeperElements.sortOrderSleeper.innerHTML = newOrder === 'asc' ? 
        '<i class="fas fa-sort-amount-up"></i>' : 
        '<i class="fas fa-sort-amount-down"></i>';
    
    sortSleepers();
}

// Refrescar datos
function refreshSleeperData() {
    sleeperElements.refreshSleepers.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Actualizando...';
    sleeperElements.refreshSleepers.disabled = true;
    
    loadSleeperData().finally(() => {
        sleeperElements.refreshSleepers.innerHTML = '<i class="fas fa-sync-alt"></i> Actualizar';
        sleeperElements.refreshSleepers.disabled = false;
    });
}

// Estados de carga
function showSleeperLoadingState() {
    sleeperElements.loadingSleepers.style.display = 'flex';
    sleeperElements.sleeperContent.style.display = 'none';
}

function hideSleeperLoadingState() {
    sleeperElements.loadingSleepers.style.display = 'none';
    sleeperElements.sleeperContent.style.display = 'block';
}

// Configuración de Supabase (funciones reutilizadas)
function showConfigModal() {
    sleeperElements.configModal.style.display = 'block';
}

function saveSupabaseConfig() {
    const url = sleeperElements.supabaseUrl.value.trim();
    const key = sleeperElements.supabaseKey.value.trim();
    
    if (!url || !key) {
        showSleeperError('Por favor, completa todos los campos de configuración');
        return;
    }
    
    const config = { url, key };
    localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify(config));
    
    initializeSupabase(url, key);
    sleeperElements.configModal.style.display = 'none';
    
    showSleeperSuccess('Configuración guardada exitosamente');
}

async function testSupabaseConnection() {
    const url = sleeperElements.supabaseUrl.value.trim();
    const key = sleeperElements.supabaseKey.value.trim();
    
    if (!url || !key) {
        showSleeperError('Por favor, completa todos los campos antes de probar la conexión');
        return;
    }
    
    sleeperElements.testConnection.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Probando...';
    sleeperElements.testConnection.disabled = true;
    
    try {
        const testClient = window.supabase.createClient(url, key);
        const { data, error } = await testClient
            .from('nfl_fantasy_trends')
            .select('id')
            .limit(1);
        
        if (error) {
            throw error;
        }
        
        showSleeperSuccess('¡Conexión exitosa!');
        
    } catch (error) {
        console.error('Error de conexión:', error);
        showSleeperError('Error de conexión: ' + error.message);
    } finally {
        sleeperElements.testConnection.innerHTML = '<i class="fas fa-link"></i> Probar Conexión';
        sleeperElements.testConnection.disabled = false;
    }
}

// Utilidades de mensajes
function showSleeperError(message) {
    removeSleeperMessages();
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;
    document.querySelector('.main-content').prepend(errorDiv);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

function showSleeperSuccess(message) {
    removeSleeperMessages();
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    document.querySelector('.main-content').prepend(successDiv);
    
    setTimeout(() => {
        successDiv.remove();
    }, 3000);
}

function removeSleeperMessages() {
    document.querySelectorAll('.error-message, .success-message').forEach(msg => {
        msg.remove();
    });
}
