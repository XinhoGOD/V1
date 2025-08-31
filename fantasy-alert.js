// Configuración global para Fantasy Alert
let supabaseClient = null;
let allAlertData = [];
let filteredAlertData = [];
let alertCharts = {};

// Configuración de Supabase
const SUPABASE_CONFIG_KEY = 'supabase_config';

// Elementos del DOM
const alertElements = {
    loadingAlert: document.getElementById('loadingAlert'),
    alertContent: document.getElementById('alertContent'),
    alertMode: document.getElementById('alertMode'),
    refreshAlert: document.getElementById('refreshAlert'),
    configBtn: document.getElementById('configBtn'),
    configModal: document.getElementById('configModal'),
    supabaseUrl: document.getElementById('supabaseUrl'),
    supabaseKey: document.getElementById('supabaseKey'),
    saveConfig: document.getElementById('saveConfig'),
    testConnection: document.getElementById('testConnection'),
    
    // Filtros
    positionFilterAlert: document.getElementById('positionFilterAlert'),
    weekFilterAlert: document.getElementById('weekFilterAlert'),
    minStartedChange: document.getElementById('minStartedChange'),
    minStartedChangeValue: document.getElementById('minStartedChangeValue'),
    minStarted: document.getElementById('minStarted'),
    minStartedValue: document.getElementById('minStartedValue'),
    minStartedRadio: document.getElementById('minStartedRadio'),
    minStartedRadioValue: document.getElementById('minStartedRadioValue'),
    alertSeverity: document.getElementById('alertSeverity'),
    
    // Métricas
    maxStartedIncrease: document.getElementById('maxStartedIncrease'),
    maxStartedIncreasePlayer: document.getElementById('maxStartedIncreasePlayer'),
    maxStartedDecrease: document.getElementById('maxStartedDecrease'),
    maxStartedDecreasePlayer: document.getElementById('maxStartedDecreasePlayer'),
    maxVolatilityValue: document.getElementById('maxVolatilityValue'),
    maxVolatilityPlayer: document.getElementById('maxVolatilityPlayer'),
    emergingMomentumValue: document.getElementById('emergingMomentumValue'),
    emergingMomentumPlayer: document.getElementById('emergingMomentumPlayer'),
    
    // Resumen
    criticalAlerts: document.getElementById('criticalAlerts'),
    highAlerts: document.getElementById('highAlerts'),
    mediumAlerts: document.getElementById('mediumAlerts'),
    totalAlertsPlayers: document.getElementById('totalAlertsPlayers'),
    
    // Lista de jugadores
    alertPlayersList: document.getElementById('alertPlayersList'),
    alertSortBy: document.getElementById('alertSortBy'),
    alertSortOrder: document.getElementById('alertSortOrder'),
    
    // Modal
    alertPlayerModal: document.getElementById('alertPlayerModal'),
    alertModalPlayerName: document.getElementById('alertModalPlayerName'),
    alertModalSeverity: document.getElementById('alertModalSeverity'),
    alertModalStartedChange: document.getElementById('alertModalStartedChange'),
    alertModalCurrentStarted: document.getElementById('alertModalCurrentStarted'),
    alertModalPreviousStarted: document.getElementById('alertModalPreviousStarted'),
    alertModalStartedRadio: document.getElementById('alertModalStartedRadio'),
    alertModalPosition: document.getElementById('alertModalPosition'),
    alertModalTeam: document.getElementById('alertModalTeam')
};

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    // Verificar que todas las librerías estén cargadas
    if (typeof Chart === 'undefined') {
        showAlertError('Error: Chart.js no se ha cargado correctamente. Verifica tu conexión a internet.');
        return;
    }
    
    if (typeof window.supabase === 'undefined') {
        showAlertError('Error: Supabase no se ha cargado correctamente. Verifica tu conexión a internet y recarga la página.');
        return;
    }
    
    console.log('Todas las librerías cargadas correctamente - Fantasy Alert');
    initializeAlert();
    setupAlertEventListeners();
    loadSavedConfig();
});

// Configuración inicial de Fantasy Alert
function initializeAlert() {
    showAlertLoadingState();
    
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
function setupAlertEventListeners() {
    alertElements.alertMode.addEventListener('change', changeAlertMode);
    alertElements.refreshAlert.addEventListener('click', refreshAlertData);
    alertElements.configBtn.addEventListener('click', showConfigModal);
    alertElements.saveConfig.addEventListener('click', saveSupabaseConfig);
    alertElements.testConnection.addEventListener('click', testSupabaseConnection);
    
    // Filtros
    alertElements.positionFilterAlert.addEventListener('change', applyAlertFilters);
    alertElements.weekFilterAlert.addEventListener('change', applyAlertFilters);
    alertElements.minStartedChange.addEventListener('input', updateStartedChangeFilter);
    alertElements.minStarted.addEventListener('input', updateStartedFilter);
    alertElements.minStartedRadio.addEventListener('input', updateStartedRadioFilter);
    alertElements.alertSeverity.addEventListener('change', applyAlertFilters);
    
    // Ordenamiento
    alertElements.alertSortBy.addEventListener('change', sortAlertPlayers);
    alertElements.alertSortOrder.addEventListener('click', toggleAlertSortOrder);
    
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
        alertElements.supabaseUrl.value = config.url || '';
        alertElements.supabaseKey.value = config.key || '';
    }
}

// Inicializar cliente de Supabase
function initializeSupabase(url, key) {
    try {
        if (typeof window.supabase === 'undefined') {
            throw new Error('La librería de Supabase no se ha cargado correctamente');
        }
        
        supabaseClient = window.supabase.createClient(url, key);
        console.log('Cliente de Supabase inicializado correctamente - Fantasy Alert');
        loadAlertData();
    } catch (error) {
        console.error('Error inicializando Supabase:', error);
        showAlertError('Error al conectar con Supabase: ' + error.message + '. Por favor, verifica tu configuración.');
        showConfigModal();
    }
}

// Cargar datos para Fantasy Alert
async function loadAlertData() {
    if (!supabaseClient) {
        showAlertError('Supabase no está configurado');
        return;
    }
    
    showAlertLoadingState();
    
    try {
        const { data, error } = await supabaseClient
            .from('nfl_fantasy_trends')
            .select('*')
            .order('scraped_at', { ascending: false });
        
        if (error) {
            throw error;
        }
        
        allAlertData = data || [];
        processAlertData();
        populateAlertFilters();
        hideAlertLoadingState();
        
    } catch (error) {
        console.error('Error cargando datos de Fantasy Alert:', error);
        showAlertError('Error al cargar los datos: ' + error.message);
        hideAlertLoadingState();
    }
}

// Procesar datos para alertas
async function processAlertData() {
    // Calcular métricas adicionales para cada jugador
    for (const player of allAlertData) {
        // Calcular volatilidad (valor absoluto del cambio)
        player.volatility = Math.abs(player.percent_started_change || 0);
        
        // Calcular momentum (combinando cambio started y rostered)
        player.momentum = (player.percent_started_change || 0) + ((player.percent_rostered_change || 0) * 0.3);
        
        // Calcular Radio Started (diferencia entre max y min started histórico)
        player.startedRadio = await calculateStartedRadio(player.player_id);
        
        // Determinar severidad de la alerta
        const startedChange = Math.abs(player.percent_started_change || 0);
        if (startedChange >= 15) {
            player.alertSeverity = 'critical';
            player.alertLevel = '🔴 Crítico';
        } else if (startedChange >= 10) {
            player.alertSeverity = 'high';
            player.alertLevel = '🟠 Alto';
        } else if (startedChange >= 5) {
            player.alertSeverity = 'medium';
            player.alertLevel = '🟡 Medio';
        } else {
            player.alertSeverity = 'low';
            player.alertLevel = '🟢 Bajo';
        }
    }
    
    filteredAlertData = [...allAlertData];
    applyAlertFilters();
}

// Poblar filtros
function populateAlertFilters() {
    // Poblar semanas
    const weeks = [...new Set(allAlertData.map(d => d.semana))].sort((a, b) => b - a);
    alertElements.weekFilterAlert.innerHTML = '<option value="">Todas las semanas</option>';
    weeks.forEach(week => {
        if (week) {
            const option = document.createElement('option');
            option.value = week;
            option.textContent = `Semana ${week}`;
            alertElements.weekFilterAlert.appendChild(option);
        }
    });
}

// Actualizar filtro de cambio started
function updateStartedChangeFilter() {
    const value = alertElements.minStartedChange.value;
    alertElements.minStartedChangeValue.textContent = `${value}%`;
    applyAlertFilters();
}

// Actualizar filtro de started
function updateStartedFilter() {
    const value = alertElements.minStarted.value;
    alertElements.minStartedValue.textContent = `${value}%`;
    applyAlertFilters();
}

// Actualizar filtro de Radio Started
function updateStartedRadioFilter() {
    const value = alertElements.minStartedRadio.value;
    alertElements.minStartedRadioValue.textContent = `${value}%`;
    applyAlertFilters();
}

// Calcular Radio Started para un jugador
async function calculateStartedRadio(playerId) {
    try {
        const { data, error } = await supabaseClient
            .from('nfl_fantasy_trends')
            .select('percent_started')
            .eq('player_id', playerId)
            .not('percent_started', 'is', null);
        
        if (error || !data || data.length === 0) {
            return 0;
        }
        
        const startedValues = data.map(d => d.percent_started);
        const maxStarted = Math.max(...startedValues);
        const minStarted = Math.min(...startedValues);
        
        return maxStarted - minStarted;
    } catch (error) {
        console.error('Error calculando Radio Started:', error);
        return 0;
    }
}

// Aplicar filtros
function applyAlertFilters() {
    filteredAlertData = allAlertData.filter(player => {
        const position = alertElements.positionFilterAlert.value;
        const week = alertElements.weekFilterAlert.value;
        const minStartedChange = parseFloat(alertElements.minStartedChange.value);
        const minStarted = parseFloat(alertElements.minStarted.value);
        const minStartedRadio = parseFloat(alertElements.minStartedRadio.value);
        const severity = alertElements.alertSeverity.value;
        
        // Filtrar por posición
        if (position && player.position !== position) return false;
        
        // Filtrar por semana
        if (week && player.semana !== parseInt(week)) return false;
        
        // Filtrar por cambio mínimo en started
        if (Math.abs(player.percent_started_change || 0) < Math.abs(minStartedChange)) return false;
        
        // Filtrar por started mínimo
        if ((player.percent_started || 0) < minStarted) return false;
        
        // Filtrar por Radio Started mínimo
        if ((player.startedRadio || 0) < minStartedRadio) return false;
        
        // Filtrar por severidad
        if (severity !== 'all' && player.alertSeverity !== severity) return false;
        
        return true;
    });
    
    updateAlertMetrics();
    updateAlertSummary();
    createAlertCharts();
    displayAlertPlayers();
}

// Cambiar modo de alerta
function changeAlertMode() {
    const mode = alertElements.alertMode.value;
    
    // Reordenar datos según el modo
    switch (mode) {
        case 'started_change':
            filteredAlertData.sort((a, b) => Math.abs(b.percent_started_change || 0) - Math.abs(a.percent_started_change || 0));
            break;
        case 'started_absolute':
            filteredAlertData.sort((a, b) => (b.percent_started || 0) - (a.percent_started || 0));
            break;
        case 'started_volatility':
            filteredAlertData.sort((a, b) => b.volatility - a.volatility);
            break;
        case 'started_momentum':
            filteredAlertData.sort((a, b) => b.momentum - a.momentum);
            break;
    }
    
    updateAlertMetrics();
    createAlertCharts();
    displayAlertPlayers();
}

// Actualizar métricas de alerta
function updateAlertMetrics() {
    if (filteredAlertData.length === 0) {
        alertElements.maxStartedIncrease.textContent = '-';
        alertElements.maxStartedIncreasePlayer.textContent = '-';
        alertElements.maxStartedDecrease.textContent = '-';
        alertElements.maxStartedDecreasePlayer.textContent = '-';
        alertElements.maxVolatilityValue.textContent = '-';
        alertElements.maxVolatilityPlayer.textContent = '-';
        alertElements.emergingMomentumValue.textContent = '-';
        alertElements.emergingMomentumPlayer.textContent = '-';
        return;
    }
    
    // Mayor aumento en started
    const maxIncrease = filteredAlertData.reduce((max, player) => 
        (player.percent_started_change || 0) > (max.percent_started_change || 0) ? player : max
    );
    
    // Mayor caída en started
    const maxDecrease = filteredAlertData.reduce((min, player) => 
        (player.percent_started_change || 0) < (min.percent_started_change || 0) ? player : min
    );
    
    // Mayor volatilidad
    const maxVolatility = filteredAlertData.reduce((max, player) => 
        player.volatility > max.volatility ? player : max
    );
    
    // Momentum emergente (jugadores con bajo started pero alto momentum)
    const emergingMomentum = filteredAlertData
        .filter(p => (p.percent_started || 0) < 30)
        .reduce((max, player) => 
            player.momentum > max.momentum ? player : max, 
            { momentum: -Infinity }
        );
    
    // Actualizar elementos
    alertElements.maxStartedIncrease.textContent = `+${(maxIncrease.percent_started_change || 0).toFixed(1)}%`;
    alertElements.maxStartedIncreasePlayer.textContent = maxIncrease.player_name || '-';
    
    alertElements.maxStartedDecrease.textContent = `${(maxDecrease.percent_started_change || 0).toFixed(1)}%`;
    alertElements.maxStartedDecreasePlayer.textContent = maxDecrease.player_name || '-';
    
    alertElements.maxVolatilityValue.textContent = `${maxVolatility.volatility.toFixed(1)}%`;
    alertElements.maxVolatilityPlayer.textContent = maxVolatility.player_name || '-';
    
    if (emergingMomentum.momentum !== -Infinity) {
        alertElements.emergingMomentumValue.textContent = `${emergingMomentum.momentum.toFixed(1)}`;
        alertElements.emergingMomentumPlayer.textContent = emergingMomentum.player_name || '-';
    } else {
        alertElements.emergingMomentumValue.textContent = '-';
        alertElements.emergingMomentumPlayer.textContent = '-';
    }
}

// Actualizar resumen de alertas
function updateAlertSummary() {
    const critical = filteredAlertData.filter(p => p.alertSeverity === 'critical').length;
    const high = filteredAlertData.filter(p => p.alertSeverity === 'high').length;
    const medium = filteredAlertData.filter(p => p.alertSeverity === 'medium').length;
    
    alertElements.criticalAlerts.textContent = critical;
    alertElements.highAlerts.textContent = high;
    alertElements.mediumAlerts.textContent = medium;
    alertElements.totalAlertsPlayers.textContent = filteredAlertData.length;
}

// Crear gráficos de alerta
function createAlertCharts() {
    // Destruir gráficos existentes
    Object.values(alertCharts).forEach(chart => {
        if (chart) chart.destroy();
    });
    
    createStartedChangesChart();
    createSeverityDistributionChart();
}

// Gráfico de cambios en started
function createStartedChangesChart() {
    const topChanges = filteredAlertData
        .sort((a, b) => Math.abs(b.percent_started_change || 0) - Math.abs(a.percent_started_change || 0))
        .slice(0, 10);
    
    const ctx = document.getElementById('startedChangesChart').getContext('2d');
    alertCharts.startedChanges = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: topChanges.map(p => p.player_name),
            datasets: [{
                label: 'Cambio Started %',
                data: topChanges.map(p => p.percent_started_change || 0),
                backgroundColor: topChanges.map(p => {
                    const change = p.percent_started_change || 0;
                    if (change > 0) return '#10b981'; // Verde para aumentos
                    else return '#ef4444'; // Rojo para caídas
                }),
                borderColor: topChanges.map(p => {
                    const change = p.percent_started_change || 0;
                    if (change > 0) return '#059669';
                    else return '#dc2626';
                }),
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
                },
                tooltip: {
                    callbacks: {
                        afterLabel: function(context) {
                            const player = topChanges[context.dataIndex];
                            return [
                                `Posición: ${player.position}`,
                                `Started actual: ${(player.percent_started || 0).toFixed(1)}%`,
                                `Nivel: ${player.alertLevel}`
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    grid: {
                        display: true
                    }
                }
            }
        }
    });
}

// Gráfico de distribución de severidad
function createSeverityDistributionChart() {
    const severityCounts = {
        'critical': filteredAlertData.filter(p => p.alertSeverity === 'critical').length,
        'high': filteredAlertData.filter(p => p.alertSeverity === 'high').length,
        'medium': filteredAlertData.filter(p => p.alertSeverity === 'medium').length,
        'low': filteredAlertData.filter(p => p.alertSeverity === 'low').length
    };
    
    const ctx = document.getElementById('severityDistributionChart').getContext('2d');
    alertCharts.severityDistribution = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['🔴 Crítico', '🟠 Alto', '🟡 Medio', '🟢 Bajo'],
            datasets: [{
                data: [
                    severityCounts.critical,
                    severityCounts.high,
                    severityCounts.medium,
                    severityCounts.low
                ],
                backgroundColor: [
                    '#ef4444', // Rojo crítico
                    '#f59e0b', // Naranja alto
                    '#eab308', // Amarillo medio
                    '#22c55e'  // Verde bajo
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
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.raw / total) * 100).toFixed(1);
                            return `${context.label}: ${context.raw} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Mostrar jugadores con alertas
function displayAlertPlayers() {
    const container = alertElements.alertPlayersList;
    
    if (filteredAlertData.length === 0) {
        container.innerHTML = '<div class="no-alerts">No se encontraron jugadores con alertas según los filtros aplicados</div>';
        return;
    }
    
    let html = '';
    filteredAlertData.slice(0, 50).forEach(player => { // Mostrar máximo 50 para rendimiento
        const startedChange = player.percent_started_change || 0;
        const changeClass = startedChange > 0 ? 'positive-change' : 'negative-change';
        const severityClass = `severity-${player.alertSeverity}`;
        
        html += `
            <div class="alert-player-card ${severityClass}" onclick="showAlertPlayerDetails('${player.player_id}')">
                <div class="alert-player-header">
                    <div class="alert-player-info">
                        <h4 class="alert-player-name">${player.player_name}</h4>
                        <div class="alert-player-meta">
                            <span class="alert-position">${player.position}</span>
                            <span class="alert-team">${player.team || 'N/A'}</span>
                            <span class="alert-week">Semana ${player.semana || 'N/A'}</span>
                        </div>
                    </div>
                    <div class="alert-severity-badge ${player.alertSeverity}">
                        ${player.alertLevel}
                    </div>
                </div>
                
                <div class="alert-player-metrics">
                    <div class="alert-metric-item">
                        <span class="alert-metric-label">Cambio Started:</span>
                        <span class="alert-metric-value ${changeClass}">
                            ${startedChange > 0 ? '+' : ''}${startedChange.toFixed(1)}%
                        </span>
                    </div>
                    <div class="alert-metric-item">
                        <span class="alert-metric-label">Started Actual:</span>
                        <span class="alert-metric-value">${(player.percent_started || 0).toFixed(1)}%</span>
                    </div>
                    <div class="alert-metric-item">
                        <span class="alert-metric-label">Volatilidad:</span>
                        <span class="alert-metric-value">${player.volatility.toFixed(1)}%</span>
                    </div>
                    <div class="alert-metric-item">
                        <span class="alert-metric-label">Momentum:</span>
                        <span class="alert-metric-value ${player.momentum > 0 ? 'positive-change' : 'negative-change'}">
                            ${player.momentum.toFixed(1)}
                        </span>
                    </div>
                    <div class="alert-metric-item">
                        <span class="alert-metric-label">Radio Started:</span>
                        <span class="alert-metric-value started-radio">
                            ${(player.startedRadio || 0).toFixed(1)}
                        </span>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Mostrar detalles del jugador en modal
async function showAlertPlayerDetails(playerId) {
    const player = allAlertData.find(p => p.player_id === playerId);
    if (!player) return;
    
    // Llenar información básica
    alertElements.alertModalPlayerName.textContent = player.player_name;
    alertElements.alertModalSeverity.textContent = player.alertLevel;
    alertElements.alertModalSeverity.className = `info-value alert-badge ${player.alertSeverity}`;
    alertElements.alertModalStartedChange.textContent = `${player.percent_started_change > 0 ? '+' : ''}${(player.percent_started_change || 0).toFixed(1)}%`;
    alertElements.alertModalCurrentStarted.textContent = `${(player.percent_started || 0).toFixed(1)}%`;
    
    // Calcular started anterior
    const previousStarted = (player.percent_started || 0) - (player.percent_started_change || 0);
    alertElements.alertModalPreviousStarted.textContent = `${previousStarted.toFixed(1)}%`;
    
    alertElements.alertModalPosition.textContent = player.position || 'N/A';
    alertElements.alertModalTeam.textContent = player.team || 'N/A';
    
    // Mostrar Radio Started
    alertElements.alertModalStartedRadio.textContent = `${(player.startedRadio || 0).toFixed(1)}`;
    
    // Obtener datos históricos del jugador desde la base de datos
    await loadAlertPlayerHistory(playerId);
    
    // Mostrar modal
    alertElements.alertPlayerModal.style.display = 'block';
}

// Cargar historial del jugador para Fantasy Alert
async function loadAlertPlayerHistory(playerId) {
    try {
        const { data, error } = await supabaseClient
            .from('nfl_fantasy_trends')
            .select('*')
            .eq('player_id', playerId)
            .order('scraped_at', { ascending: true });
        
        if (error) {
            throw error;
        }
        
        createAlertPlayerCharts(data);
        
    } catch (error) {
        console.error('Error cargando historial del jugador:', error);
        showAlertError('Error al cargar el historial del jugador');
    }
}

// Crear gráficos para el modal del jugador (mismos que en jugadores)
function createAlertPlayerCharts(playerHistory) {
    // Destruir gráficos existentes
    Object.keys(alertCharts).forEach(key => {
        if (alertCharts[key] && key.includes('alert')) {
            alertCharts[key].destroy();
        }
    });
    
    // Usar todos los datos históricos disponibles
    const chartData = playerHistory;
    const labels = chartData.map(data => new Date(data.scraped_at).toLocaleDateString('es-ES'));
    const rosteredData = chartData.map(d => d.percent_rostered || 0);
    const rosteredChangeData = chartData.map(d => d.percent_rostered_change || 0);
    const startedData = chartData.map(d => d.percent_started || 0);
    const startedChangeData = chartData.map(d => d.percent_started_change || 0);
    const addsData = chartData.map(d => d.adds || 0);
    const dropsData = chartData.map(d => d.drops || 0);
    
    // 1. Gráfico % Rostered
    const rosteredCtx = document.getElementById('alertRosteredChart').getContext('2d');
    alertCharts.alertRostered = new Chart(rosteredCtx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '% Rostered',
                data: rosteredData,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
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
                    beginAtZero: true, 
                    max: 100,
                    title: {
                        display: true,
                        text: 'Porcentaje (%)'
                    }
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
    });
    
    // 2. Gráfico Cambios % Rostered
    const rosteredChangeCtx = document.getElementById('alertRosteredChangeChart').getContext('2d');
    alertCharts.alertRosteredChange = new Chart(rosteredChangeCtx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Cambio % Rostered',
                data: rosteredChangeData,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
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
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Cambio (%)'
                    }
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
    });
    
    // 3. Gráfico % Started
    const startedCtx = document.getElementById('alertStartedChart').getContext('2d');
    alertCharts.alertStarted = new Chart(startedCtx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '% Started',
                data: startedData,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
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
                    beginAtZero: true, 
                    max: 100,
                    title: {
                        display: true,
                        text: 'Porcentaje (%)'
                    }
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
    });
    
    // 4. Gráfico Cambios % Started
    const startedChangeCtx = document.getElementById('alertStartedChangeChart').getContext('2d');
    alertCharts.alertStartedChange = new Chart(startedChangeCtx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Cambio % Started',
                data: startedChangeData,
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
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
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Cambio (%)'
                    }
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
    });
    
    // 5. Gráfico Adds
    const addsCtx = document.getElementById('alertAddsChart').getContext('2d');
    alertCharts.alertAdds = new Chart(addsCtx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Adds',
                data: addsData,
                borderColor: '#f59e0b',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
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
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Cantidad'
                    }
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
    });
    
    // 6. Gráfico Drops
    const dropsCtx = document.getElementById('alertDropsChart').getContext('2d');
    alertCharts.alertDrops = new Chart(dropsCtx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Drops',
                data: dropsData,
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
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
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Cantidad'
                    }
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
    });
}

// Ordenar jugadores de alertas
function sortAlertPlayers() {
    const sortBy = alertElements.alertSortBy.value;
    const order = alertElements.alertSortOrder.dataset.order;
    
    filteredAlertData.sort((a, b) => {
        let aVal, bVal;
        
        switch (sortBy) {
            case 'percent_started_change':
                aVal = Math.abs(a.percent_started_change || 0);
                bVal = Math.abs(b.percent_started_change || 0);
                break;
            case 'percent_started':
                aVal = a.percent_started || 0;
                bVal = b.percent_started || 0;
                break;
            case 'volatility':
                aVal = a.volatility || 0;
                bVal = b.volatility || 0;
                break;
            case 'momentum':
                aVal = a.momentum || 0;
                bVal = b.momentum || 0;
                break;
            case 'started_radio':
                aVal = a.startedRadio || 0;
                bVal = b.startedRadio || 0;
                break;
            default:
                aVal = a.percent_started_change || 0;
                bVal = b.percent_started_change || 0;
        }
        
        return order === 'asc' ? aVal - bVal : bVal - aVal;
    });
    
    displayAlertPlayers();
}

// Cambiar orden de clasificación
function toggleAlertSortOrder() {
    const currentOrder = alertElements.alertSortOrder.dataset.order;
    const newOrder = currentOrder === 'asc' ? 'desc' : 'asc';
    
    alertElements.alertSortOrder.dataset.order = newOrder;
    alertElements.alertSortOrder.innerHTML = newOrder === 'asc' ? 
        '<i class="fas fa-sort-amount-up"></i>' : 
        '<i class="fas fa-sort-amount-down"></i>';
    
    sortAlertPlayers();
}

// Refrescar datos de alertas
function refreshAlertData() {
    alertElements.refreshAlert.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Actualizando...';
    alertElements.refreshAlert.disabled = true;
    
    loadAlertData().finally(() => {
        alertElements.refreshAlert.innerHTML = '<i class="fas fa-sync-alt"></i> Actualizar';
        alertElements.refreshAlert.disabled = false;
    });
}

// Estados de carga
function showAlertLoadingState() {
    alertElements.loadingAlert.style.display = 'flex';
    alertElements.alertContent.style.display = 'none';
}

function hideAlertLoadingState() {
    alertElements.loadingAlert.style.display = 'none';
    alertElements.alertContent.style.display = 'block';
}

// Configuración de Supabase (funciones reutilizadas)
function showConfigModal() {
    alertElements.configModal.style.display = 'block';
}

function saveSupabaseConfig() {
    const url = alertElements.supabaseUrl.value.trim();
    const key = alertElements.supabaseKey.value.trim();
    
    if (!url || !key) {
        showAlertError('Por favor, completa todos los campos de configuración');
        return;
    }
    
    const config = { url, key };
    localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify(config));
    
    initializeSupabase(url, key);
    alertElements.configModal.style.display = 'none';
    
    showAlertSuccess('Configuración guardada exitosamente');
}

async function testSupabaseConnection() {
    const url = alertElements.supabaseUrl.value.trim();
    const key = alertElements.supabaseKey.value.trim();
    
    if (!url || !key) {
        showAlertError('Por favor, completa todos los campos antes de probar la conexión');
        return;
    }
    
    alertElements.testConnection.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Probando...';
    alertElements.testConnection.disabled = true;
    
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
        
        showAlertSuccess('¡Conexión exitosa! Los datos se pueden acceder correctamente.');
        
    } catch (error) {
        console.error('Error de conexión:', error);
        showAlertError('Error de conexión: ' + error.message);
    } finally {
        alertElements.testConnection.innerHTML = '<i class="fas fa-link"></i> Probar Conexión';
        alertElements.testConnection.disabled = false;
    }
}

// Utilidades de mensajes
function showAlertError(message) {
    removeAlertMessages();
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;
    document.querySelector('.main-content').prepend(errorDiv);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

function showAlertSuccess(message) {
    removeAlertMessages();
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    document.querySelector('.main-content').prepend(successDiv);
    
    setTimeout(() => {
        successDiv.remove();
    }, 3000);
}

function removeAlertMessages() {
    document.querySelectorAll('.error-message, .success-message').forEach(msg => {
        msg.remove();
    });
}
