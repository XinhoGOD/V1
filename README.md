# Dashboard Admin - NFL Fantasy Trends

Un dashboard completo para visualizar y analizar datos de tendencias de fantasy football de la NFL usando datos de Supabase.

## 🚀 Características

### 📊 Visualización de Datos
- **Lista de jugadores** con información detallada
- **Gráficos de líneas** para cada métrica por jugador:
  - % Rostered (porcentaje de equipos que tienen al jugador)
  - Cambios en % Rostered
  - % Started (porcentaje de equipos que inician al jugador)
  - Cambios en % Started
  - Adds (veces que fue agregado)
  - Drops (veces que fue eliminado)

### 🔍 Filtros y Búsqueda
- **Búsqueda por nombre** de jugador
- **Filtro por posición** (QB, RB, WR, TE, K, DEF)
- **Filtro por equipo**
- **Filtro por semana**
- **Filtro por % mínimo rostered**

### 📈 Funcionalidades Avanzadas
- **Ordenamiento** por cualquier métrica
- **Datos en tiempo real** desde Supabase
- **Modal detallado** para cada jugador con historial completo
- **Diseño responsive** para móviles y escritorio
- **Actualización automática** de estadísticas

## 🛠 Configuración

### 1. Configuración de Supabase

Al abrir el dashboard por primera vez, se te pedirá configurar la conexión a Supabase:

1. Haz clic en el botón de configuración (⚙️) en la esquina inferior derecha
2. Ingresa tu **URL de Supabase**: `https://tu-proyecto.supabase.co`
3. Ingresa tu **Anon Key** de Supabase
4. Haz clic en "Probar Conexión" para verificar
5. Guarda la configuración

### 2. Estructura de la Tabla

El dashboard espera una tabla llamada `nfl_fantasy_trends` con las siguientes columnas:

```sql
CREATE TABLE nfl_fantasy_trends (
    id BIGINT PRIMARY KEY,
    player_name TEXT,
    player_id TEXT,
    position TEXT,
    team TEXT,
    opponent TEXT,
    percent_rostered NUMERIC,
    percent_rostered_change NUMERIC,
    percent_started NUMERIC,
    percent_started_change NUMERIC,
    adds INTEGER,
    drops INTEGER,
    scraped_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE,
    semana INTEGER,
    timestamp TIMESTAMP WITH TIME ZONE
);
```

### 3. Permisos de Supabase

Asegúrate de que tu política RLS (Row Level Security) permita:
- **SELECT** en la tabla `nfl_fantasy_trends`

Ejemplo de política:
```sql
-- Permitir lectura para usuarios autenticados
CREATE POLICY "Allow read access" ON nfl_fantasy_trends
FOR SELECT USING (true);
```

## 📱 Uso del Dashboard

### Navegación Principal
- **Header**: Búsqueda global y botón de actualización
- **Sidebar**: Filtros, controles y estadísticas resumidas
- **Área principal**: Lista de jugadores y detalles

### Interacciones
1. **Ver jugador**: Haz clic en cualquier tarjeta de jugador
2. **Filtrar**: Usa los controles del sidebar
3. **Ordenar**: Usa los controles en el header de la lista
4. **Actualizar**: Botón en el header para refrescar datos

### Modal de Jugador
Muestra información detallada incluyendo:
- Información básica (posición, equipo, oponente)
- Métricas actuales
- 6 gráficos de líneas con historial completo

## 🎨 Personalización

### Colores y Estilos
Los colores principales están definidos en CSS variables en `styles.css`:

```css
:root {
    --primary-color: #1e3a8a;      /* Azul principal */
    --secondary-color: #3b82f6;    /* Azul secundario */
    --success-color: #10b981;      /* Verde */
    --danger-color: #ef4444;       /* Rojo */
    --warning-color: #f59e0b;      /* Amarillo */
}
```

### Agregar Nuevas Métricas
Para agregar nuevas métricas:

1. **Actualizar HTML**: Agregar nueva sección en el modal
2. **Actualizar JavaScript**: Modificar función `createPlayerCharts()`
3. **Actualizar CSS**: Agregar estilos si es necesario

## 📦 Archivos del Proyecto

```
FANTASY HTML/
├── index.html          # Estructura HTML principal
├── styles.css          # Estilos y diseño
├── app.js             # Lógica JavaScript principal
└── README.md          # Este archivo
```

## 🔧 Dependencias

### CDN Utilizados
- **Chart.js**: `https://cdn.jsdelivr.net/npm/chart.js` - Para gráficos
- **Supabase**: `https://cdn.jsdelivr.net/npm/supabase@2` - Cliente de base de datos
- **Font Awesome**: `https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css` - Iconos

### Navegadores Compatibles
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## 🚨 Solución de Problemas

### Error de Conexión
- Verifica que la URL y key de Supabase sean correctas
- Confirma que la tabla `nfl_fantasy_trends` existe
- Revisa las políticas RLS en Supabase

### Datos No Aparecen
- Usa el botón "Probar Conexión" en configuración
- Revisa la consola del navegador para errores
- Confirma que hay datos en la tabla

### Gráficos No Se Muestran
- Verifica que Chart.js se haya cargado correctamente
- Confirma que el jugador tiene datos históricos
- Revisa errores en la consola

## 🔄 Actualizaciones Futuras

### Funcionalidades Planeadas
- [ ] Exportación de datos a CSV/Excel
- [ ] Comparación entre jugadores
- [ ] Alertas personalizadas
- [ ] Filtros por fecha/rango
- [ ] Dashboards personalizables
- [ ] Integración con APIs externas

### Mejoras de Rendimiento
- [ ] Paginación para grandes datasets
- [ ] Cache local de datos
- [ ] Lazy loading de gráficos
- [ ] Optimización de consultas

## 📞 Soporte

Para problemas o sugerencias:
1. Revisa este README primero
2. Verifica la configuración de Supabase
3. Consulta la consola del navegador para errores
4. Documenta el problema con capturas de pantalla

---

**¡Disfruta analizando tus datos de fantasy football! 🏈**
