// Configuración global
let supabaseClient = null;
let allData = [];
let currentWeekData = [];
let dashboardCharts = {};

// Configuración de Supabase
const SUPABASE_CONFIG_KEY = 'supabase_config';

// Elementos del DOM
const elements = {
    loadingDashboard: document.getElementById('loadingDashboard'),
    dashboardContent: document.getElementById('dashboardContent'),
    currentWeek: document.getElementById('currentWeek'),
    currentWeekDisplay: document.getElementById('currentWeekDisplay'),
    totalPlayersCount: document.getElementById('totalPlayersCount'),
    lastUpdateTime: document.getElementById('lastUpdateTime'),
    refreshDashboard: document.getElementById('refreshDashboard'),
    configBtn: document.getElementById('configBtn'),
    configModal: document.getElementById('configModal'),
    supabaseUrl: document.getElementById('supabaseUrl'),
    supabaseKey: document.getElementById('supabaseKey'),
    saveConfig: document.getElementById('saveConfig'),
    testConnection: document.getElementById('testConnection'),
    
    // Metric cards
    topRiser: document.getElementById('topRiser'),
    topRiserChange: document.getElementById('topRiserChange'),
    topFaller: document.getElementById('topFaller'),
    topFallerChange: document.getElementById('topFallerChange'),
    mostAdded: document.getElementById('mostAdded'),
    mostAddedCount: document.getElementById('mostAddedCount'),
    mostDropped: document.getElementById('mostDropped'),
    mostDroppedCount: document.getElementById('mostDroppedCount'),
    
    // Insights
    trendingPlayers: document.getElementById('trendingPlayers'),
    weeklyAlerts: document.getElementById('weeklyAlerts'),
    weeklyInsights: document.getElementById('weeklyInsights'),
    opportunities: document.getElementById('opportunities'),
    keyStats: document.getElementById('keyStats'),
    recentActivity: document.getElementById('recentActivity')
};

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    // Verificar que todas las librerías estén cargadas
    if (typeof Chart === 'undefined') {
        showError('Error: Chart.js no se ha cargado correctamente. Verifica tu conexión a internet.');
        return;
    }
    
    if (typeof window.supabase === 'undefined') {
        showError('Error: Supabase no se ha cargado correctamente. Verifica tu conexión a internet y recarga la página.');
        return;
    }
    
    console.log('Todas las librerías cargadas correctamente - Dashboard');
    initializeDashboard();
    setupEventListeners();
    loadSavedConfig();
});

// Configuración inicial del dashboard
function initializeDashboard() {
    showLoadingState();
    
    // Verificar si hay configuración guardada
    const savedConfig = localStorage.getItem(SUPABASE_CONFIG_KEY);
    if (!savedConfig) {
        showConfigModal();
    } else {
        const config = JSON.parse(savedConfig);
        initializeSupabase(config.url, config.key);
    }
}

// Configurar event listeners
function setupEventListeners() {
    elements.currentWeek.addEventListener('change', changeWeek);
    elements.refreshDashboard.addEventListener('click', refreshDashboard);
    elements.configBtn.addEventListener('click', showConfigModal);
    elements.saveConfig.addEventListener('click', saveSupabaseConfig);
    elements.testConnection.addEventListener('click', testSupabaseConnection);
    
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
        elements.supabaseUrl.value = config.url || '';
        elements.supabaseKey.value = config.key || '';
    }
}

// Inicializar cliente de Supabase
function initializeSupabase(url, key) {
    try {
        if (typeof window.supabase === 'undefined') {
            throw new Error('La librería de Supabase no se ha cargado correctamente');
        }
        
        supabaseClient = window.supabase.createClient(url, key);
        console.log('Cliente de Supabase inicializado correctamente - Dashboard');
        loadDashboardData();
    } catch (error) {
        console.error('Error inicializando Supabase:', error);
        showError('Error al conectar con Supabase: ' + error.message + '. Por favor, verifica tu configuración.');
        showConfigModal();
    }
}

// Cargar datos del dashboard
async function loadDashboardData() {
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
        
        allData = data || [];
        populateWeekSelector();
        
        // Cargar la semana más reciente por defecto
        const latestWeek = Math.max(...allData.map(d => d.semana || 0));
        if (latestWeek > 0) {
            elements.currentWeek.value = latestWeek;
            loadWeekData(latestWeek);
        }
        
        hideLoadingState();
        
    } catch (error) {
        console.error('Error cargando datos del dashboard:', error);
        showError('Error al cargar los datos: ' + error.message);
        hideLoadingState();
    }
}

// Poblar selector de semanas
function populateWeekSelector() {
    const weeks = [...new Set(allData.map(d => d.semana))].sort((a, b) => b - a);
    
    elements.currentWeek.innerHTML = '<option value="">Seleccionar semana...</option>';
    weeks.forEach(week => {
        if (week) {
            const option = document.createElement('option');
            option.value = week;
            option.textContent = `Semana ${week}`;
            elements.currentWeek.appendChild(option);
        }
    });
}

// Cargar datos de una semana específica
function loadWeekData(week) {
    if (!week) return;
    
    currentWeekData = allData.filter(d => d.semana === parseInt(week));
    elements.currentWeekDisplay.textContent = `Semana ${week}`;
    
    updateQuickStats();
    updateMetricCards();
    createDashboardCharts();
    generateInsights();
    generateRecentActivity();
}

// Cambiar semana
function changeWeek() {
    const selectedWeek = elements.currentWeek.value;
    if (selectedWeek) {
        loadWeekData(selectedWeek);
    }
}

// Actualizar estadísticas rápidas
function updateQuickStats() {
    const uniquePlayers = new Set(currentWeekData.map(d => d.player_id)).size;
    elements.totalPlayersCount.textContent = uniquePlayers;
    
    if (currentWeekData.length > 0) {
        const latestDate = new Date(Math.max(...currentWeekData.map(d => new Date(d.scraped_at))));
        elements.lastUpdateTime.textContent = latestDate.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// Actualizar tarjetas de métricas
function updateMetricCards() {
    const playersWithChanges = currentWeekData.filter(d => d.percent_rostered_change !== null);
    
    // SLEEPER: Jugador con bajo rostered pero subiendo fuerte (potencial sleeper)
    const sleepers = currentWeekData.filter(d => 
        (d.percent_rostered || 0) < 30 && 
        (d.percent_rostered_change || 0) > 3 &&
        (d.adds || 0) > 10
    ).sort((a, b) => (b.percent_rostered_change || 0) - (a.percent_rostered_change || 0));
    
    const topSleeper = sleepers[0] || {};
    
    // TRENDING UP: Jugador con mayor subida absoluta
    const topRiser = playersWithChanges.reduce((max, player) => 
        (player.percent_rostered_change || 0) > (max.percent_rostered_change || 0) ? player : max, 
        playersWithChanges[0] || {}
    );
    
    // BREAKOUT CANDIDATE: Jugador moderadamente rostered pero con momentum
    const breakoutCandidates = currentWeekData.filter(d => 
        (d.percent_rostered || 0) >= 30 && (d.percent_rostered || 0) <= 70 &&
        (d.percent_rostered_change || 0) > 2 &&
        (d.adds || 0) > (d.drops || 0)
    ).sort((a, b) => (b.percent_rostered_change || 0) - (a.percent_rostered_change || 0));
    
    const topBreakout = breakoutCandidates[0] || {};
    
    // FALLING STAR: Jugador perdiendo popularidad rápidamente
    const fallingStar = playersWithChanges.reduce((min, player) => 
        (player.percent_rostered_change || 0) < (min.percent_rostered_change || 0) ? player : min, 
        playersWithChanges[0] || {}
    );
    
    // Actualizar elementos con nueva lógica de sleepers
    if (topSleeper && topSleeper.player_name) {
        elements.topRiser.textContent = topSleeper.player_name;
        elements.topRiserChange.textContent = `${(topSleeper.percent_rostered || 0).toFixed(1)}% (+${(topSleeper.percent_rostered_change || 0).toFixed(1)}%)`;
        elements.topRiserChange.className = 'metric-change change-positive';
        // Cambiar el título de la tarjeta
        document.querySelector('.trending-up .metric-content h3').textContent = 'Sleeper Detectado';
    } else if (topRiser && topRiser.player_name) {
        elements.topRiser.textContent = topRiser.player_name;
        elements.topRiserChange.textContent = `+${(topRiser.percent_rostered_change || 0).toFixed(1)}%`;
        elements.topRiserChange.className = 'metric-change change-positive';
        document.querySelector('.trending-up .metric-content h3').textContent = 'Mayor Subida';
    }
    
    if (topBreakout && topBreakout.player_name) {
        elements.topFaller.textContent = topBreakout.player_name;
        elements.topFallerChange.textContent = `${(topBreakout.percent_rostered || 0).toFixed(1)}% (+${(topBreakout.percent_rostered_change || 0).toFixed(1)}%)`;
        elements.topFallerChange.className = 'metric-change change-positive';
        // Cambiar el título y color de la tarjeta
        document.querySelector('.trending-down .metric-content h3').textContent = 'Breakout Candidate';
        document.querySelector('.trending-down').style.borderLeftColor = '#f59e0b';
        document.querySelector('.trending-down .metric-icon').style.background = 'rgba(245, 158, 11, 0.1)';
        document.querySelector('.trending-down .metric-icon').style.color = '#f59e0b';
        document.querySelector('.trending-down .metric-icon i').className = 'fas fa-rocket';
    } else if (fallingStar && fallingStar.player_name) {
        elements.topFaller.textContent = fallingStar.player_name;
        elements.topFallerChange.textContent = `${(fallingStar.percent_rostered_change || 0).toFixed(1)}%`;
        elements.topFallerChange.className = 'metric-change change-negative';
        document.querySelector('.trending-down .metric-content h3').textContent = 'Mayor Bajada';
    }
    
    // Más agregado (sin cambios)
    const mostAdded = currentWeekData.reduce((max, player) => 
        (player.adds || 0) > (max.adds || 0) ? player : max, 
        currentWeekData[0] || {}
    );
    
    // WAIVER WIRE PICKUP: Jugador con buen ratio adds/drops
    const waiverpickups = currentWeekData.filter(d => 
        (d.adds || 0) > 0 && (d.drops || 0) >= 0 &&
        (d.adds || 0) / Math.max(d.drops || 1, 1) > 2 &&
        (d.percent_rostered || 0) < 50
    ).sort((a, b) => (b.adds || 0) - (a.adds || 0));
    
    const topWaiverPickup = waiverpickups[0] || mostAdded;
    
    if (topWaiverPickup && topWaiverPickup.player_name) {
        elements.mostAdded.textContent = topWaiverPickup.player_name;
        const ratio = (topWaiverPickup.adds || 0) / Math.max(topWaiverPickup.drops || 1, 1);
        elements.mostAddedCount.textContent = `${topWaiverPickup.adds || 0} adds (${ratio.toFixed(1)}x ratio)`;
        document.querySelector('.most-added .metric-content h3').textContent = 'Waiver Wire Gold';
    }
    
    // Más eliminado (jugadores perdiendo valor)
    const mostDropped = currentWeekData.reduce((max, player) => 
        (player.drops || 0) > (max.drops || 0) ? player : max, 
        currentWeekData[0] || {}
    );
    
    if (mostDropped && mostDropped.player_name) {
        elements.mostDropped.textContent = mostDropped.player_name;
        elements.mostDroppedCount.textContent = `${mostDropped.drops || 0} drops`;
    }
}

// Crear gráficos del dashboard
function createDashboardCharts() {
    // Destruir gráficos existentes
    Object.values(dashboardCharts).forEach(chart => {
        if (chart) chart.destroy();
    });
    
    createPositionChart();
    createTopPlayersChart();
    createAddsDropsTrendChart();
    createBiggestChangesChart();
}

// Gráfico de distribución por posición
function createPositionChart() {
    const positions = {};
    currentWeekData.forEach(player => {
        if (!positions[player.position]) {
            positions[player.position] = [];
        }
        positions[player.position].push(player.percent_rostered || 0);
    });
    
    const positionAverages = Object.keys(positions).map(pos => ({
        position: pos,
        average: positions[pos].reduce((sum, val) => sum + val, 0) / positions[pos].length
    })).sort((a, b) => b.average - a.average);
    
    const ctx = document.getElementById('positionChart').getContext('2d');
    dashboardCharts.position = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: positionAverages.map(p => p.position),
            datasets: [{
                data: positionAverages.map(p => p.average),
                backgroundColor: [
                    '#ef4444', '#10b981', '#3b82f6', '#f59e0b', '#1f2937', '#8b5cf6'
                ]
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

// Gráfico de top jugadores
function createTopPlayersChart() {
    const topPlayers = currentWeekData
        .sort((a, b) => (b.percent_rostered || 0) - (a.percent_rostered || 0))
        .slice(0, 10);
    
    const ctx = document.getElementById('topPlayersChart').getContext('2d');
    dashboardCharts.topPlayers = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: topPlayers.map(p => p.player_name),
            datasets: [{
                label: '% Rostered',
                data: topPlayers.map(p => p.percent_rostered || 0),
                backgroundColor: '#3b82f6',
                borderColor: '#1d4ed8',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
}

// Gráfico de tendencia Adds vs Drops
function createAddsDropsTrendChart() {
    const weeks = [...new Set(allData.map(d => d.semana))].sort((a, b) => a - b).slice(-8);
    
    const weeklyAdds = weeks.map(week => {
        const weekData = allData.filter(d => d.semana === week);
        return weekData.reduce((sum, d) => sum + (d.adds || 0), 0);
    });
    
    const weeklyDrops = weeks.map(week => {
        const weekData = allData.filter(d => d.semana === week);
        return weekData.reduce((sum, d) => sum + (d.drops || 0), 0);
    });
    
    const ctx = document.getElementById('addsDropsTrendChart').getContext('2d');
    dashboardCharts.addsDrop = new Chart(ctx, {
        type: 'line',
        data: {
            labels: weeks.map(w => `Semana ${w}`),
            datasets: [{
                label: 'Adds',
                data: weeklyAdds,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                fill: true
            }, {
                label: 'Drops',
                data: weeklyDrops,
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Gráfico de mayores cambios
function createBiggestChangesChart() {
    const playersWithChanges = currentWeekData
        .filter(d => d.percent_rostered_change !== null && d.percent_rostered_change !== 0)
        .sort((a, b) => Math.abs(b.percent_rostered_change) - Math.abs(a.percent_rostered_change))
        .slice(0, 8);
    
    const ctx = document.getElementById('biggestChangesChart').getContext('2d');
    dashboardCharts.biggestChanges = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: playersWithChanges.map(p => p.player_name),
            datasets: [{
                label: 'Cambio %',
                data: playersWithChanges.map(p => p.percent_rostered_change),
                backgroundColor: playersWithChanges.map(p => 
                    p.percent_rostered_change > 0 ? '#10b981' : '#ef4444'
                )
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
                    beginAtZero: true
                }
            }
        }
    });
}

// Generar insights
function generateInsights() {
    generateTrendingPlayers();
    generateWeeklyAlerts();
    generateWeeklyInsights();
    generateOpportunities();
    generateKeyStats();
}

// Jugadores en tendencia (enfocado en sleepers)
function generateTrendingPlayers() {
    // Criterios para sleepers: bajo rostered, subiendo, con actividad
    const sleepers = currentWeekData
        .filter(d => {
            const rostered = d.percent_rostered || 0;
            const change = d.percent_rostered_change || 0;
            const adds = d.adds || 0;
            const drops = d.drops || 0;
            
            return rostered < 40 &&           // Menos del 40% rostered
                   change > 1.5 &&           // Subiendo al menos 1.5%
                   adds > 5 &&               // Al menos 5 adds
                   adds > drops;             // Más adds que drops
        })
        .sort((a, b) => {
            // Ordenar por potencial sleeper: combinar cambio + ratio adds/drops
            const scoreA = (a.percent_rostered_change || 0) + ((a.adds || 0) / Math.max(a.drops || 1, 1));
            const scoreB = (b.percent_rostered_change || 0) + ((b.adds || 0) / Math.max(b.drops || 1, 1));
            return scoreB - scoreA;
        })
        .slice(0, 5);
    
    let html = '';
    if (sleepers.length === 0) {
        html = '<p>No se detectaron sleepers claros esta semana. Revisa jugadores con cambios menores.</p>';
    } else {
        html += '<div style="margin-bottom: 0.5rem; font-size: 0.85rem; color: var(--text-secondary); font-style: italic;">🔍 Jugadores con menos del 40% rostered pero subiendo</div>';
        sleepers.forEach(player => {
            const sleeperScore = ((player.adds || 0) / Math.max(player.drops || 1, 1)).toFixed(1);
            html += `
                <div class="insight-item">
                    <div>
                        <span class="insight-player">${player.player_name} (${player.position})</span>
                        <div style="font-size: 0.8rem; color: var(--text-secondary);">
                            ${player.percent_rostered.toFixed(1)}% rostered • ${player.adds} adds
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <span class="insight-value change-positive">+${player.percent_rostered_change.toFixed(1)}%</span>
                        <div style="font-size: 0.75rem; color: var(--warning-color);">Score: ${sleeperScore}</div>
                    </div>
                </div>
            `;
        });
    }
    elements.trendingPlayers.innerHTML = html;
}

// Alertas semanales (enfocado en detección de sleepers)
function generateWeeklyAlerts() {
    const alerts = [];
    
    // Buscar sleepers emergentes
    const emergingSleepers = currentWeekData.filter(d => 
        (d.percent_rostered || 0) < 20 && 
        (d.percent_rostered_change || 0) > 3 &&
        (d.adds || 0) > 10
    );
    
    // Jugadores con momentum acelerado
    const momentumPlayers = currentWeekData.filter(d => 
        (d.percent_rostered || 0) < 50 &&
        (d.percent_rostered_change || 0) > 5 &&
        (d.adds || 0) > (d.drops || 0) * 2
    );
    
    // Jugadores con actividad inusual de adds
    const highActivityPlayers = currentWeekData.filter(d => (d.adds || 0) > 50);
    
    // Cambios drásticos (tanto subidas como bajadas)
    const bigDrops = currentWeekData.filter(d => (d.percent_rostered_change || 0) < -8);
    const bigRises = currentWeekData.filter(d => (d.percent_rostered_change || 0) > 10);
    
    // Generar alertas específicas
    if (emergingSleepers.length > 0) {
        alerts.push(`🚨 ${emergingSleepers.length} sleeper(s) detectado(s) - jugadores bajo 20% subiendo 3%+`);
    }
    
    if (momentumPlayers.length > 0) {
        alerts.push(`🔥 ${momentumPlayers.length} jugador(es) con momentum fuerte - subidas de 5%+ con buena actividad`);
    }
    
    if (highActivityPlayers.length > 0) {
        const topActivity = highActivityPlayers.sort((a, b) => (b.adds || 0) - (a.adds || 0))[0];
        alerts.push(`📈 Actividad inusual: ${topActivity.player_name} con ${topActivity.adds} adds`);
    }
    
    if (bigRises.length > 0) {
        alerts.push(`🎯 ${bigRises.length} jugador(es) con subidas masivas (10%+) - posibles breakouts`);
    }
    
    if (bigDrops.length > 0) {
        alerts.push(`⚠️ ${bigDrops.length} jugador(es) con caídas severas (8%+) - considera vender`);
    }
    
    // Alertas por posición
    const positions = ['QB', 'RB', 'WR', 'TE'];
    positions.forEach(pos => {
        const positionSleepers = currentWeekData.filter(d => 
            d.position === pos &&
            (d.percent_rostered || 0) < 25 &&
            (d.percent_rostered_change || 0) > 2
        );
        
        if (positionSleepers.length > 0) {
            alerts.push(`${pos}: ${positionSleepers.length} sleeper(s) emergente(s)`);
        }
    });
    
    if (alerts.length === 0) {
        alerts.push('✅ Semana tranquila - no hay alertas importantes de sleepers');
    }
    
    let html = '';
    alerts.forEach(alert => {
        html += `<p style="margin-bottom: 0.5rem;"><i class="fas fa-circle" style="font-size: 0.5rem; margin-right: 0.5rem; color: var(--warning-color);"></i>${alert}</p>`;
    });
    
    elements.weeklyAlerts.innerHTML = html;
}

// Insights semanales (análisis avanzado de sleepers)
function generateWeeklyInsights() {
    let insights = [];
    
    if (currentWeekData.length === 0) {
        elements.weeklyInsights.innerHTML = '<p>No hay datos disponibles para generar insights</p>';
        return;
    }
    
    // Análisis de mercado de sleepers
    const lowRosteredCount = currentWeekData.filter(d => (d.percent_rostered || 0) < 15).length;
    const emergingCount = currentWeekData.filter(d => 
        (d.percent_rostered || 0) < 30 && (d.percent_rostered_change || 0) > 2
    ).length;
    
    insights.push(`🔍 Hay ${lowRosteredCount} jugadores con menos del 15% de rostered - oportunidades profundas`);
    insights.push(`📊 ${emergingCount} jugadores emergentes (<30% rostered con tendencia positiva)`);
    
    // Análisis de momentum por posición
    const positions = ['QB', 'RB', 'WR', 'TE'];
    positions.forEach(pos => {
        const positionData = currentWeekData.filter(d => d.position === pos);
        const avgChange = positionData.reduce((sum, d) => sum + (d.percent_rostered_change || 0), 0) / positionData.length;
        const sleepers = positionData.filter(d => 
            (d.percent_rostered || 0) < 25 && (d.percent_rostered_change || 0) > 1
        );
        
        if (sleepers.length > 0) {
            insights.push(`${pos}: ${sleepers.length} sleeper(s) detectado(s) (promedio cambio: ${avgChange.toFixed(1)}%)`);
        }
    });
    
    // Análisis de actividad del waiver wire
    const totalAdds = currentWeekData.reduce((sum, d) => sum + (d.adds || 0), 0);
    const totalDrops = currentWeekData.reduce((sum, d) => sum + (d.drops || 0), 0);
    const addDropRatio = totalAdds / (totalDrops || 1);
    
    if (addDropRatio > 1.2) {
        insights.push(`📈 Mercado muy activo - ratio adds/drops: ${addDropRatio.toFixed(2)} (buscar oportunidades)`);
    } else if (addDropRatio < 0.8) {
        insights.push(`📉 Mercado conservador - ratio adds/drops: ${addDropRatio.toFixed(2)} (buenos sleepers disponibles)`);
    }
    
    // Top sleeper de la semana
    const topSleeper = currentWeekData
        .filter(d => (d.percent_rostered || 0) < 40)
        .sort((a, b) => {
            const scoreA = (a.percent_rostered_change || 0) + ((a.adds || 0) / 10);
            const scoreB = (b.percent_rostered_change || 0) + ((b.adds || 0) / 10);
            return scoreB - scoreA;
        })[0];
    
    if (topSleeper) {
        insights.push(`⭐ Top sleeper: ${topSleeper.player_name} (${topSleeper.percent_rostered}% rostered, +${topSleeper.percent_rostered_change}%)`);
    }
    
    // Tendencias generales
    const averageRostered = currentWeekData.reduce((sum, d) => sum + (d.percent_rostered || 0), 0) / currentWeekData.length;
    const positiveChanges = currentWeekData.filter(d => (d.percent_rostered_change || 0) > 0).length;
    const changePercentage = (positiveChanges / currentWeekData.length) * 100;
    
    insights.push(`📊 ${changePercentage.toFixed(1)}% de jugadores con tendencia positiva`);
    insights.push(`🎯 Promedio de rostered: ${averageRostered.toFixed(1)}% - busca jugadores muy por debajo`);
    
    let html = '';
    insights.forEach(insight => {
        html += `<p style="margin-bottom: 0.7rem; line-height: 1.4;"><i class="fas fa-lightbulb" style="margin-right: 0.5rem; color: var(--accent-color);"></i>${insight}</p>`;
    });
    
    elements.weeklyInsights.innerHTML = html;
}

// Oportunidades (enfocado en sleepers y value picks)
function generateOpportunities() {
    // Diferentes tipos de oportunidades
    const deepSleepers = currentWeekData
        .filter(d => (d.percent_rostered || 0) < 15 && (d.percent_rostered_change || 0) > 1 && (d.adds || 0) > 3)
        .sort((a, b) => (b.percent_rostered_change || 0) - (a.percent_rostered_change || 0))
        .slice(0, 2);
    
    const emergingPlayers = currentWeekData
        .filter(d => 
            (d.percent_rostered || 0) >= 15 && (d.percent_rostered || 0) <= 35 &&
            (d.percent_rostered_change || 0) > 2 &&
            (d.adds || 0) > (d.drops || 0) * 1.5
        )
        .sort((a, b) => (b.percent_rostered_change || 0) - (a.percent_rostered_change || 0))
        .slice(0, 2);
    
    const opportunities = [...deepSleepers, ...emergingPlayers];
    
    let html = '';
    if (opportunities.length === 0) {
        html = '<p>No se encontraron oportunidades claras esta semana. Revisa waivers locales.</p>';
    } else {
        // Categorizar las oportunidades
        if (deepSleepers.length > 0) {
            html += '<div style="margin-bottom: 0.5rem; font-size: 0.85rem; color: var(--success-color); font-weight: 600;">🚀 Deep Sleepers (<15% rostered):</div>';
            deepSleepers.forEach(player => {
                html += `
                    <div class="insight-item">
                        <div>
                            <span class="insight-player">${player.player_name} (${player.position})</span>
                            <div style="font-size: 0.8rem; color: var(--text-secondary);">${player.team} • ${player.adds} adds</div>
                        </div>
                        <span class="insight-value" style="color: var(--success-color);">${player.percent_rostered.toFixed(1)}% (+${player.percent_rostered_change.toFixed(1)}%)</span>
                    </div>
                `;
            });
        }
        
        if (emergingPlayers.length > 0) {
            html += '<div style="margin: 1rem 0 0.5rem 0; font-size: 0.85rem; color: var(--warning-color); font-weight: 600;">⚡ Emerging Players (15-35% rostered):</div>';
            emergingPlayers.forEach(player => {
                html += `
                    <div class="insight-item">
                        <div>
                            <span class="insight-player">${player.player_name} (${player.position})</span>
                            <div style="font-size: 0.8rem; color: var(--text-secondary);">${player.team} • ${player.adds} adds, ${player.drops} drops</div>
                        </div>
                        <span class="insight-value" style="color: var(--warning-color);">${player.percent_rostered.toFixed(1)}% (+${player.percent_rostered_change.toFixed(1)}%)</span>
                    </div>
                `;
            });
        }
    }
    elements.opportunities.innerHTML = html;
}

// Estadísticas clave
function generateKeyStats() {
    const totalPlayers = new Set(currentWeekData.map(d => d.player_id)).size;
    const avgRostered = currentWeekData.reduce((sum, d) => sum + (d.percent_rostered || 0), 0) / currentWeekData.length;
    const totalAdds = currentWeekData.reduce((sum, d) => sum + (d.adds || 0), 0);
    const totalDrops = currentWeekData.reduce((sum, d) => sum + (d.drops || 0), 0);
    
    const html = `
        <div class="insight-item">
            <span class="insight-player">Promedio % Rostered</span>
            <span class="insight-value">${avgRostered.toFixed(1)}%</span>
        </div>
        <div class="insight-item">
            <span class="insight-player">Total Adds</span>
            <span class="insight-value">${totalAdds.toLocaleString()}</span>
        </div>
        <div class="insight-item">
            <span class="insight-player">Total Drops</span>
            <span class="insight-value">${totalDrops.toLocaleString()}</span>
        </div>
        <div class="insight-item">
            <span class="insight-player">Ratio Adds/Drops</span>
            <span class="insight-value">${(totalAdds / totalDrops || 0).toFixed(2)}</span>
        </div>
    `;
    
    elements.keyStats.innerHTML = html;
}

// Generar actividad reciente
function generateRecentActivity() {
    const activities = [];
    
    // Actividades basadas en los datos actuales
    const topRiser = currentWeekData.reduce((max, player) => 
        (player.percent_rostered_change || 0) > (max.percent_rostered_change || 0) ? player : max, 
        currentWeekData[0] || {}
    );
    
    const mostAdded = currentWeekData.reduce((max, player) => 
        (player.adds || 0) > (max.adds || 0) ? player : max, 
        currentWeekData[0] || {}
    );
    
    if (topRiser && topRiser.player_name) {
        activities.push({
            icon: 'fa-arrow-up',
            title: 'Mayor subida de la semana',
            description: `${topRiser.player_name} subió ${topRiser.percent_rostered_change?.toFixed(1)}% en rostered`,
            time: 'Esta semana'
        });
    }
    
    if (mostAdded && mostAdded.player_name) {
        activities.push({
            icon: 'fa-plus',
            title: 'Jugador más agregado',
            description: `${mostAdded.player_name} fue agregado ${mostAdded.adds} veces`,
            time: 'Esta semana'
        });
    }
    
    activities.push({
        icon: 'fa-database',
        title: 'Datos actualizados',
        description: `Se procesaron ${currentWeekData.length} registros de jugadores`,
        time: 'Última actualización'
    });
    
    let html = '';
    activities.forEach(activity => {
        html += `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="fas ${activity.icon}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-title">${activity.title}</div>
                    <div class="activity-description">${activity.description}</div>
                </div>
                <div class="activity-time">${activity.time}</div>
            </div>
        `;
    });
    
    elements.recentActivity.innerHTML = html;
}

// Refrescar dashboard
function refreshDashboard() {
    elements.refreshDashboard.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Actualizando...';
    elements.refreshDashboard.disabled = true;
    
    loadDashboardData().finally(() => {
        elements.refreshDashboard.innerHTML = '<i class="fas fa-sync-alt"></i> Actualizar';
        elements.refreshDashboard.disabled = false;
    });
}

// Estados de carga
function showLoadingState() {
    elements.loadingDashboard.style.display = 'flex';
    elements.dashboardContent.style.display = 'none';
}

function hideLoadingState() {
    elements.loadingDashboard.style.display = 'none';
    elements.dashboardContent.style.display = 'block';
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

// Probar conexión con Supabase
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
        if (typeof window.supabase === 'undefined') {
            throw new Error('La librería de Supabase no se ha cargado correctamente.');
        }
        
        const testClient = window.supabase.createClient(url, key);
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

// Utilidades
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
