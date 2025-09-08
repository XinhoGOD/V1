// Configuración global para Encuentros
let supabaseClient = null;
let allEncuentrosData = [];
let team1Data = [];
let team2Data = [];
let encuentrosCharts = {};
let availableTeams = [];

// Configuración de Supabase
const SUPABASE_CONFIG_KEY = 'supabase_config';

// Elementos del DOM
const encuentrosElements = {
    loadingEncuentros: document.getElementById('loadingEncuentros'),
    teamSelectionMessage: document.getElementById('teamSelectionMessage'),
    encuentrosContent: document.getElementById('encuentrosContent'),
    refreshEncuentros: document.getElementById('refreshEncuentros'),
    configBtn: document.getElementById('configBtn'),
    configModal: document.getElementById('configModal'),
    supabaseUrl: document.getElementById('supabaseUrl'),
    supabaseKey: document.getElementById('supabaseKey'),
    saveConfig: document.getElementById('saveConfig'),
    testConnection: document.getElementById('testConnection'),
    
    // Team Selection
    team1Select: document.getElementById('team1Select'),
    team2Select: document.getElementById('team2Select'),
    compareTeams: document.getElementById('compareTeams'),
    
    // Filters
    positionFilterEncuentros: document.getElementById('positionFilterEncuentros'),
    minRostered: document.getElementById('minRostered'),
    minRosteredValue: document.getElementById('minRosteredValue'),
    minStarted: document.getElementById('minStarted'),
    minStartedValue: document.getElementById('minStartedValue'),
    
    // Summary
    team1Name: document.getElementById('team1Name'),
    team1Count: document.getElementById('team1Count'),
    team2Name: document.getElementById('team2Name'),
    team2Count: document.getElementById('team2Count'),
    totalPlayersCount: document.getElementById('totalPlayersCount'),
    
    // Team Cards
    team1Card: document.getElementById('team1Card'),
    team2Card: document.getElementById('team2Card'),
    team1Title: document.getElementById('team1Title'),
    team1Players: document.getElementById('team1Players'),
    team2Title: document.getElementById('team2Title'),
    team2Players: document.getElementById('team2Players'),
    
    // Players Lists
    team1PlayersList: document.getElementById('team1PlayersList'),
    team2PlayersList: document.getElementById('team2PlayersList'),
    team1SectionTitle: document.getElementById('team1SectionTitle'),
    team2SectionTitle: document.getElementById('team2SectionTitle'),
    
    // Sorting
    encuentrosSortBy: document.getElementById('encuentrosSortBy'),
    encuentrosSortOrder: document.getElementById('encuentrosSortOrder'),
    
    // Modal
    encuentrosPlayerModal: document.getElementById('encuentrosPlayerModal'),
    encuentrosModalPlayerName: document.getElementById('encuentrosModalPlayerName'),
    encuentrosModalPosition: document.getElementById('encuentrosModalPosition'),
    encuentrosModalTeam: document.getElementById('encuentrosModalTeam'),
    encuentrosModalRostered: document.getElementById('encuentrosModalRostered'),
    encuentrosModalStarted: document.getElementById('encuentrosModalStarted'),
    encuentrosModalAdds: document.getElementById('encuentrosModalAdds'),
    encuentrosModalDrops: document.getElementById('encuentrosModalDrops'),
    
    // Charts
    rosteredComparisonChart: document.getElementById('rosteredComparisonChart'),
    startedComparisonChart: document.getElementById('startedComparisonChart'),
    encuentrosRosteredChart: document.getElementById('encuentrosRosteredChart'),
    encuentrosStartedChart: document.getElementById('encuentrosStartedChart'),
    encuentrosAddsDropsChart: document.getElementById('encuentrosAddsDropsChart'),
    encuentrosChangesChart: document.getElementById('encuentrosChangesChart')
};

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    // Verificar que todas las librerías estén cargadas
    if (typeof Chart === 'undefined') {
        showEncuentrosError('Error: Chart.js no se ha cargado correctamente. Verifica tu conexión a internet.');
        return;
    }
    
    if (typeof window.supabase === 'undefined') {
        showEncuentrosError('Error: Supabase no se ha cargado correctamente. Verifica tu conexión a internet y recarga la página.');
        return;
    }

    console.log('Inicializando módulo de Encuentros...');

    // Configurar eventos
    setupEncuentrosEvents();
    
    // Verificar configuración de Supabase
    const config = getSupabaseConfig();
    if (config.url && config.key) {
        initializeSupabase(config.url, config.key);
        loadEncuentrosData();
    } else {
        showConfigModal();
    }
});

// Configurar eventos
function setupEncuentrosEvents() {
    // Eventos de navegación y configuración
    encuentrosElements.refreshEncuentros.addEventListener('click', refreshEncuentrosData);
    encuentrosElements.configBtn.addEventListener('click', showConfigModal);
    encuentrosElements.saveConfig.addEventListener('click', saveSupabaseConfig);
    encuentrosElements.testConnection.addEventListener('click', testSupabaseConnection);
    
    // Eventos de selección de equipos
    encuentrosElements.team1Select.addEventListener('change', onTeamSelectionChange);
    encuentrosElements.team2Select.addEventListener('change', onTeamSelectionChange);
    encuentrosElements.compareTeams.addEventListener('click', compareSelectedTeams);
    
    // Eventos de filtros
    encuentrosElements.positionFilterEncuentros.addEventListener('change', applyEncuentrosFilters);
    encuentrosElements.minRostered.addEventListener('input', updateMinRosteredValue);
    encuentrosElements.minStarted.addEventListener('input', updateMinStartedValue);
    
    // Eventos de ordenamiento
    encuentrosElements.encuentrosSortBy.addEventListener('change', sortEncuentrosPlayers);
    encuentrosElements.encuentrosSortOrder.addEventListener('click', toggleEncuentrosSortOrder);
    
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
function updateMinRosteredValue() {
    encuentrosElements.minRosteredValue.textContent = `${encuentrosElements.minRostered.value}%`;
    applyEncuentrosFilters();
}

function updateMinStartedValue() {
    encuentrosElements.minStartedValue.textContent = `${encuentrosElements.minStarted.value}%`;
    applyEncuentrosFilters();
}

// Inicializar Supabase
function initializeSupabase(url, key) {
    try {
        supabaseClient = window.supabase.createClient(url, key);
        console.log('Cliente Supabase inicializado correctamente para Encuentros');
    } catch (error) {
        console.error('Error inicializando Supabase:', error);
        showEncuentrosError('Error al conectar con Supabase. Verifica tu configuración.');
    }
}

// Cargar datos de encuentros
async function loadEncuentrosData() {
    try {
        showLoading(true);
        
        console.log('Cargando datos para Encuentros...');
        
        const { data, error } = await supabaseClient
            .from('nfl_fantasy_trends')
            .select('*')
            .order('scraped_at', { ascending: false });
        
        if (error) {
            throw error;
        }
        
        console.log('Datos cargados:', data ? data.length : 0, 'registros');
        
        allEncuentrosData = data || [];
        
        // Extraer equipos únicos
        extractAvailableTeams();
        
        // Mostrar mensaje de selección inicial
        showTeamSelectionMessage();
        
        showLoading(false);
        
    } catch (error) {
        console.error('Error cargando datos:', error);
        showEncuentrosError('Error al cargar los datos. Verifica tu conexión y configuración.');
        showLoading(false);
    }
}

// Extraer equipos disponibles
function extractAvailableTeams() {
    const teams = [...new Set(allEncuentrosData.map(player => player.team).filter(team => team))];
    availableTeams = teams.sort();
    
    console.log('Equipos disponibles:', availableTeams.length);
    
    // Llenar los selects de equipos
    populateTeamSelects();
}

// Llenar selects de equipos
function populateTeamSelects() {
    // Limpiar selects
    encuentrosElements.team1Select.innerHTML = '<option value="">Selecciona Equipo 1</option>';
    encuentrosElements.team2Select.innerHTML = '<option value="">Selecciona Equipo 2</option>';
    
    // Agregar equipos
    availableTeams.forEach(team => {
        const option1 = document.createElement('option');
        option1.value = team;
        option1.textContent = team;
        encuentrosElements.team1Select.appendChild(option1);
        
        const option2 = document.createElement('option');
        option2.value = team;
        option2.textContent = team;
        encuentrosElements.team2Select.appendChild(option2);
    });
}

// Manejar cambio en selección de equipos
function onTeamSelectionChange() {
    const team1 = encuentrosElements.team1Select.value;
    const team2 = encuentrosElements.team2Select.value;
    
    // Habilitar/deshabilitar el botón de comparar
    encuentrosElements.compareTeams.disabled = !team1 || !team2 || team1 === team2;
    
    // Actualizar opciones disponibles (evitar seleccionar el mismo equipo)
    updateTeamSelectOptions();
}

// Actualizar opciones de selects para evitar duplicados
function updateTeamSelectOptions() {
    const team1 = encuentrosElements.team1Select.value;
    const team2 = encuentrosElements.team2Select.value;
    
    // Actualizar opciones del select 2
    Array.from(encuentrosElements.team2Select.options).forEach(option => {
        if (option.value === team1) {
            option.disabled = true;
            option.style.color = '#ccc';
        } else {
            option.disabled = false;
            option.style.color = '';
        }
    });
    
    // Actualizar opciones del select 1
    Array.from(encuentrosElements.team1Select.options).forEach(option => {
        if (option.value === team2) {
            option.disabled = true;
            option.style.color = '#ccc';
        } else {
            option.disabled = false;
            option.style.color = '';
        }
    });
}

// Comparar equipos seleccionados
function compareSelectedTeams() {
    const team1 = encuentrosElements.team1Select.value;
    const team2 = encuentrosElements.team2Select.value;
    
    if (!team1 || !team2 || team1 === team2) {
        alert('Por favor selecciona dos equipos diferentes.');
        return;
    }
    
    console.log(`Comparando ${team1} vs ${team2}`);
    
    // Filtrar datos por equipos
    team1Data = allEncuentrosData.filter(player => player.team === team1);
    team2Data = allEncuentrosData.filter(player => player.team === team2);
    
    // Actualizar UI
    updateTeamComparisonUI(team1, team2);
    
    // Mostrar contenido de encuentros
    showEncuentrosContent();
    
    // Crear gráficos de comparación
    createComparisonCharts();
    
    // Mostrar jugadores
    displayTeamPlayers();
}

// Actualizar UI de comparación
function updateTeamComparisonUI(team1, team2) {
    // Actualizar títulos y contadores
    encuentrosElements.team1Name.textContent = team1;
    encuentrosElements.team2Name.textContent = team2;
    encuentrosElements.team1Count.textContent = team1Data.length;
    encuentrosElements.team2Count.textContent = team2Data.length;
    encuentrosElements.totalPlayersCount.textContent = team1Data.length + team2Data.length;
    
    // Actualizar tarjetas de equipos
    encuentrosElements.team1Title.textContent = team1;
    encuentrosElements.team2Title.textContent = team2;
    encuentrosElements.team1Players.textContent = `${team1Data.length} jugadores`;
    encuentrosElements.team2Players.textContent = `${team2Data.length} jugadores`;
    
    // Actualizar títulos de secciones
    encuentrosElements.team1SectionTitle.textContent = team1;
    encuentrosElements.team2SectionTitle.textContent = team2;
}

// Mostrar contenido de encuentros
function showEncuentrosContent() {
    encuentrosElements.teamSelectionMessage.style.display = 'none';
    encuentrosElements.encuentrosContent.style.display = 'block';
}

// Mostrar mensaje de selección de equipos
function showTeamSelectionMessage() {
    encuentrosElements.teamSelectionMessage.style.display = 'block';
    encuentrosElements.encuentrosContent.style.display = 'none';
}

// Crear gráficos de comparación
function createComparisonCharts() {
    // Destruir gráficos existentes
    Object.keys(encuentrosCharts).forEach(key => {
        if (encuentrosCharts[key]) {
            encuentrosCharts[key].destroy();
            delete encuentrosCharts[key];
        }
    });
    
    // Preparar datos para gráficos
    const team1Players = team1Data.slice(0, 10); // Top 10 jugadores
    const team2Players = team2Data.slice(0, 10);
    
    // Gráfico de % Rostered
    if (encuentrosElements.rosteredComparisonChart) {
        createRosteredComparisonChart(team1Players, team2Players);
    }
    
    // Gráfico de % Started
    if (encuentrosElements.startedComparisonChart) {
        createStartedComparisonChart(team1Players, team2Players);
    }
}

// Crear gráfico de comparación de % Rostered
function createRosteredComparisonChart(team1Players, team2Players) {
    const ctx = encuentrosElements.rosteredComparisonChart;
    
    const data = {
        labels: [...team1Players.map(p => p.player_name), ...team2Players.map(p => p.player_name)],
        datasets: [
            {
                label: encuentrosElements.team1Select.value,
                data: [...team1Players.map(p => p.percent_rostered || 0), ...Array(team2Players.length).fill(null)],
                backgroundColor: 'rgba(102, 126, 234, 0.8)',
                borderColor: 'rgba(102, 126, 234, 1)',
                borderWidth: 2
            },
            {
                label: encuentrosElements.team2Select.value,
                data: [...Array(team1Players.length).fill(null), ...team2Players.map(p => p.percent_rostered || 0)],
                backgroundColor: 'rgba(239, 68, 68, 0.8)',
                borderColor: 'rgba(239, 68, 68, 1)',
                borderWidth: 2
            }
        ]
    };
    
    encuentrosCharts.rosteredComparison = new Chart(ctx, {
        type: 'bar',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Comparación % Rostered - Top 10 Jugadores'
                },
                legend: {
                    display: true
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Porcentaje (%)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Jugadores'
                    }
                }
            }
        }
    });
}

// Crear gráfico de comparación de % Started
function createStartedComparisonChart(team1Players, team2Players) {
    const ctx = encuentrosElements.startedComparisonChart;
    
    const data = {
        labels: [...team1Players.map(p => p.player_name), ...team2Players.map(p => p.player_name)],
        datasets: [
            {
                label: encuentrosElements.team1Select.value,
                data: [...team1Players.map(p => p.percent_started || 0), ...Array(team2Players.length).fill(null)],
                backgroundColor: 'rgba(34, 197, 94, 0.8)',
                borderColor: 'rgba(34, 197, 94, 1)',
                borderWidth: 2
            },
            {
                label: encuentrosElements.team2Select.value,
                data: [...Array(team1Players.length).fill(null), ...team2Players.map(p => p.percent_started || 0)],
                backgroundColor: 'rgba(245, 158, 11, 0.8)',
                borderColor: 'rgba(245, 158, 11, 1)',
                borderWidth: 2
            }
        ]
    };
    
    encuentrosCharts.startedComparison = new Chart(ctx, {
        type: 'bar',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Comparación % Started - Top 10 Jugadores'
                },
                legend: {
                    display: true
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Porcentaje (%)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Jugadores'
                    }
                }
            }
        }
    });
}

// Mostrar jugadores de ambos equipos
function displayTeamPlayers() {
    // Aplicar filtros antes de mostrar
    const filteredTeam1 = applyFiltersToTeam(team1Data);
    const filteredTeam2 = applyFiltersToTeam(team2Data);
    
    // Ordenar jugadores
    const sortedTeam1 = sortPlayersByCurrentCriteria(filteredTeam1);
    const sortedTeam2 = sortPlayersByCurrentCriteria(filteredTeam2);
    
    // Mostrar jugadores del equipo 1
    displayTeamPlayersList(sortedTeam1, encuentrosElements.team1PlayersList, 'team1');
    
    // Mostrar jugadores del equipo 2
    displayTeamPlayersList(sortedTeam2, encuentrosElements.team2PlayersList, 'team2');
}

// Aplicar filtros a un equipo
function applyFiltersToTeam(teamData) {
    let filtered = [...teamData];
    
    // Filtro por posición
    const position = encuentrosElements.positionFilterEncuentros.value;
    if (position) {
        filtered = filtered.filter(player => player.position === position);
    }
    
    // Filtro por % Rostered mínimo
    const minRostered = parseFloat(encuentrosElements.minRostered.value);
    filtered = filtered.filter(player => (player.percent_rostered || 0) >= minRostered);
    
    // Filtro por % Started mínimo
    const minStarted = parseFloat(encuentrosElements.minStarted.value);
    filtered = filtered.filter(player => (player.percent_started || 0) >= minStarted);
    
    return filtered;
}

// Mostrar lista de jugadores de un equipo
function displayTeamPlayersList(players, container, teamId) {
    if (!players || players.length === 0) {
        container.innerHTML = '<p class="no-players">No hay jugadores que coincidan con los filtros.</p>';
        return;
    }
    
    const html = players.map(player => {
        const rosteredChange = player.percent_rostered_change || 0;
        const startedChange = player.percent_started_change || 0;
        
        const rosteredChangeClass = rosteredChange > 0 ? 'change-positive' : rosteredChange < 0 ? 'change-negative' : '';
        const startedChangeClass = startedChange > 0 ? 'change-positive' : startedChange < 0 ? 'change-negative' : '';
        
        return `
            <div class="player-card encuentros-player-card" onclick="showEncuentrosPlayerDetails('${player.player_id}')">
                <div class="player-info">
                    <h3>${player.player_name}</h3>
                    <div class="player-meta">
                        <span class="position-badge position-${player.position}">${player.position}</span>
                        <span class="team-name">${player.team}</span>
                    </div>
                </div>
                
                <div class="stat-card">
                    <span class="stat-value">${(player.percent_rostered || 0).toFixed(1)}%</span>
                    <span class="stat-label">Rostered</span>
                    ${rosteredChange !== 0 ? `<span class="stat-change ${rosteredChangeClass}">${rosteredChange > 0 ? '+' : ''}${rosteredChange.toFixed(1)}%</span>` : ''}
                </div>
                
                <div class="stat-card">
                    <span class="stat-value">${(player.percent_started || 0).toFixed(1)}%</span>
                    <span class="stat-label">Started</span>
                    ${startedChange !== 0 ? `<span class="stat-change ${startedChangeClass}">${startedChange > 0 ? '+' : ''}${startedChange.toFixed(1)}%</span>` : ''}
                </div>
                
                <div class="stat-card">
                    <span class="stat-value">${player.adds || 0}</span>
                    <span class="stat-label">Adds</span>
                </div>
                
                <div class="stat-card">
                    <span class="stat-value">${player.drops || 0}</span>
                    <span class="stat-label">Drops</span>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = html;
}

// Aplicar filtros a encuentros
function applyEncuentrosFilters() {
    if (encuentrosElements.encuentrosContent.style.display === 'block') {
        displayTeamPlayers();
    }
}

// Ordenar jugadores de encuentros
function sortEncuentrosPlayers() {
    if (encuentrosElements.encuentrosContent.style.display === 'block') {
        displayTeamPlayers();
    }
}

// Alternar orden de clasificación
function toggleEncuentrosSortOrder() {
    const currentOrder = encuentrosElements.encuentrosSortOrder.dataset.order;
    const newOrder = currentOrder === 'desc' ? 'asc' : 'desc';
    
    encuentrosElements.encuentrosSortOrder.dataset.order = newOrder;
    encuentrosElements.encuentrosSortOrder.innerHTML = newOrder === 'desc' 
        ? '<i class="fas fa-sort-amount-down"></i>' 
        : '<i class="fas fa-sort-amount-up"></i>';
    
    if (encuentrosElements.encuentrosContent.style.display === 'block') {
        displayTeamPlayers();
    }
}

// Ordenar jugadores según criterios actuales
function sortPlayersByCurrentCriteria(players) {
    const sortBy = encuentrosElements.encuentrosSortBy.value;
    const order = encuentrosElements.encuentrosSortOrder.dataset.order;
    
    return players.sort((a, b) => {
        let valueA, valueB;
        
        switch (sortBy) {
            case 'player_name':
                valueA = (a.player_name || '').toLowerCase();
                valueB = (b.player_name || '').toLowerCase();
                break;
            case 'percent_rostered':
                valueA = a.percent_rostered || 0;
                valueB = b.percent_rostered || 0;
                break;
            case 'percent_started':
                valueA = a.percent_started || 0;
                valueB = b.percent_started || 0;
                break;
            case 'adds':
                valueA = a.adds || 0;
                valueB = b.adds || 0;
                break;
            case 'drops':
                valueA = a.drops || 0;
                valueB = b.drops || 0;
                break;
            default:
                valueA = a.percent_rostered || 0;
                valueB = b.percent_rostered || 0;
        }
        
        if (order === 'desc') {
            return valueB > valueA ? 1 : valueB < valueA ? -1 : 0;
        } else {
            return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
        }
    });
}

// Mostrar detalles del jugador en modal
async function showEncuentrosPlayerDetails(playerId) {
    const player = allEncuentrosData.find(p => p.player_id === playerId);
    if (!player) return;
    
    // Llenar información básica
    encuentrosElements.encuentrosModalPlayerName.textContent = player.player_name;
    encuentrosElements.encuentrosModalPosition.textContent = player.position || 'N/A';
    encuentrosElements.encuentrosModalTeam.textContent = player.team || 'N/A';
    encuentrosElements.encuentrosModalRostered.textContent = `${(player.percent_rostered || 0).toFixed(1)}%`;
    encuentrosElements.encuentrosModalStarted.textContent = `${(player.percent_started || 0).toFixed(1)}%`;
    encuentrosElements.encuentrosModalAdds.textContent = player.adds || 0;
    encuentrosElements.encuentrosModalDrops.textContent = player.drops || 0;
    
    // Mostrar modal
    encuentrosElements.encuentrosPlayerModal.style.display = 'block';
    
    // Cargar datos históricos
    await loadEncuentrosPlayerHistory(playerId);
}

// Cargar historial del jugador
async function loadEncuentrosPlayerHistory(playerId) {
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
            createEncuentrosPlayerCharts(data);
        }
        
    } catch (error) {
        console.error('Error cargando historial del jugador:', error);
    }
}

// Crear gráficos del jugador para el modal
function createEncuentrosPlayerCharts(playerHistory) {
    // Destruir gráficos existentes del modal
    const modalChartKeys = ['encuentrosRostered', 'encuentrosStarted', 'encuentrosAddsDrops', 'encuentrosChanges'];
    modalChartKeys.forEach(key => {
        if (encuentrosCharts[key]) {
            encuentrosCharts[key].destroy();
            delete encuentrosCharts[key];
        }
    });
    
    if (!playerHistory || playerHistory.length === 0) {
        return;
    }
    
    const labels = playerHistory.map(data => new Date(data.scraped_at).toLocaleDateString('es-ES'));
    const rosteredData = playerHistory.map(d => d.percent_rostered || 0);
    const startedData = playerHistory.map(d => d.percent_started || 0);
    const addsData = playerHistory.map(d => d.adds || 0);
    const dropsData = playerHistory.map(d => d.drops || 0);
    const rosteredChangeData = playerHistory.map(d => d.percent_rostered_change || 0);
    const startedChangeData = playerHistory.map(d => d.percent_started_change || 0);
    
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
    
    // Gráfico % Rostered
    if (encuentrosElements.encuentrosRosteredChart) {
        encuentrosCharts.encuentrosRostered = new Chart(encuentrosElements.encuentrosRosteredChart, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: '% Rostered',
                    data: rosteredData,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    fill: true
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
    
    // Gráfico % Started
    if (encuentrosElements.encuentrosStartedChart) {
        encuentrosCharts.encuentrosStarted = new Chart(encuentrosElements.encuentrosStartedChart, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: '% Started',
                    data: startedData,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 2,
                    fill: true
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
    
    // Gráfico Adds y Drops
    if (encuentrosElements.encuentrosAddsDropsChart) {
        encuentrosCharts.encuentrosAddsDrops = new Chart(encuentrosElements.encuentrosAddsDropsChart, {
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
    
    // Gráfico Cambios
    if (encuentrosElements.encuentrosChangesChart) {
        encuentrosCharts.encuentrosChanges = new Chart(encuentrosElements.encuentrosChangesChart, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Cambio % Rostered',
                        data: rosteredChangeData,
                        borderColor: '#6366f1',
                        backgroundColor: 'rgba(99, 102, 241, 0.1)',
                        borderWidth: 2,
                        fill: false
                    },
                    {
                        label: 'Cambio % Started',
                        data: startedChangeData,
                        borderColor: '#f59e0b',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        borderWidth: 2,
                        fill: false
                    }
                ]
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
}

// Funciones de utilidad
function refreshEncuentrosData() {
    loadEncuentrosData();
}

function showLoading(show) {
    encuentrosElements.loadingEncuentros.style.display = show ? 'flex' : 'none';
}

function showEncuentrosError(message) {
    alert(message);
}

// Funciones de configuración de Supabase (reutilizadas)
function getSupabaseConfig() {
    const config = localStorage.getItem(SUPABASE_CONFIG_KEY);
    return config ? JSON.parse(config) : { url: '', key: '' };
}

function saveSupabaseConfig() {
    const url = encuentrosElements.supabaseUrl.value.trim();
    const key = encuentrosElements.supabaseKey.value.trim();
    
    if (!url || !key) {
        alert('Por favor completa todos los campos de configuración.');
        return;
    }
    
    const config = { url, key };
    localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify(config));
    
    initializeSupabase(url, key);
    encuentrosElements.configModal.style.display = 'none';
    
    loadEncuentrosData();
}

function testSupabaseConnection() {
    const url = encuentrosElements.supabaseUrl.value.trim();
    const key = encuentrosElements.supabaseKey.value.trim();
    
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
    encuentrosElements.supabaseUrl.value = config.url || '';
    encuentrosElements.supabaseKey.value = config.key || '';
    encuentrosElements.configModal.style.display = 'block';
}
