// src/ui/components/timelineCharts.js
window.App = window.App || {};
App.timelineCharts = App.timelineCharts || {};

// Хранилище активных экземпляров Chart.js для каждого canvas
App.timelineCharts.activeCharts = {};

App.timelineCharts.destroyChart = function(canvasId) {
    if (App.timelineCharts.activeCharts[canvasId]) {
        App.timelineCharts.activeCharts[canvasId].destroy();
        delete App.timelineCharts.activeCharts[canvasId];
    }
};

/**
 * Вспомогательная функция: очистить canvas и показать текст "Нет данных"
 * @param {HTMLCanvasElement} canvas
 * @param {string} message
 */
App.timelineCharts.showNoDataMessage = function(canvas, message) {
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = '14px var(--font)';
    ctx.fillStyle = 'var(--text-muted)';
    ctx.fillText(message || 'Нет данных за выбранный период', 20, canvas.height / 2);
};

/**
 * График 1: Общие расходы + прогноз на 3 месяца (линия)
 * @param {string} canvasId - ID элемента canvas
 * @param {string} period - 'month', 'quarter', 'year'
 */
App.timelineCharts.renderTotalCostsWithForecast = function(canvasId, period) {
    App.timelineCharts.destroyChart(canvasId);
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    // Убедимся, что canvas имеет видимые размеры
    if (canvas.width === 0 || canvas.height === 0) {
        canvas.width = canvas.clientWidth || 500;
        canvas.height = canvas.clientHeight || 200;
    }
    
    var monthsCount = 12;
    if (period === 'quarter') monthsCount = 3;
    else if (period === 'month') monthsCount = 1;
    
    var grouped = App.logic.groupTotalCostsByMonth(monthsCount);
    var months = grouped.months;
    var totalCosts = grouped.totalCosts;
    
    if (months.length === 0) {
        App.timelineCharts.showNoDataMessage(canvas, 'Нет данных о расходах');
        return;
    }
    
    var forecast = App.logic.calculateMonthlyForecast(totalCosts);
    var forecastMonths = [];
    var lastMonth = months[months.length - 1];
    var lastDate = new Date(lastMonth + '-01');
    for (var i = 1; i <= 3; i++) {
        var nextDate = new Date(lastDate.getFullYear(), lastDate.getMonth() + i, 1);
        var nextKey = nextDate.getFullYear() + '-' + String(nextDate.getMonth() + 1).padStart(2, '0');
        forecastMonths.push(nextKey);
    }
    
    var allLabels = months.concat(forecastMonths);
    var factData = totalCosts.concat([null, null, null]);
    var forecastData = new Array(months.length).fill(null).concat(forecast);
    
    var ctx = canvas.getContext('2d');
    App.timelineCharts.activeCharts[canvasId] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: allLabels,
            datasets: [
                {
                    label: 'Факт',
                    data: factData,
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52,152,219,0.1)',
                    tension: 0.2,
                    fill: false,
                    pointRadius: 3
                },
                {
                    label: 'Прогноз',
                    data: forecastData,
                    borderColor: '#e74c3c',
                    borderDash: [5, 5],
                    backgroundColor: 'transparent',
                    tension: 0.2,
                    fill: false,
                    pointRadius: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(ctx) {
                            return ctx.dataset.label + ': ' + ctx.raw.toLocaleString() + ' ₽';
                        }
                    }
                },
                legend: { position: 'top' }
            },
            scales: {
                y: { beginAtZero: true, title: { display: true, text: '₽' } }
            }
        }
    });
};

/**
 * График 2: Затраты: топливо vs ТО (гистограмма с группировкой)
 * @param {string} canvasId
 * @param {string} period
 */
App.timelineCharts.renderFuelVsTOCosts = function(canvasId, period) {
    App.timelineCharts.destroyChart(canvasId);
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    if (canvas.width === 0 || canvas.height === 0) {
        canvas.width = canvas.clientWidth || 500;
        canvas.height = canvas.clientHeight || 200;
    }
    
    var monthsCount = 12;
    if (period === 'quarter') monthsCount = 3;
    else if (period === 'month') monthsCount = 1;
    
    var grouped = App.logic.groupTotalCostsByMonth(monthsCount);
    var months = grouped.months;
    var fuelCosts = grouped.fuelCosts;
    var toCosts = grouped.toCosts;
    
    if (months.length === 0) {
        App.timelineCharts.showNoDataMessage(canvas, 'Нет данных о затратах на топливо или ТО');
        return;
    }
    
    var ctx = canvas.getContext('2d');
    App.timelineCharts.activeCharts[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [
                {
                    label: 'Топливо',
                    data: fuelCosts,
                    backgroundColor: 'rgba(52,152,219,0.7)',
                    borderColor: '#2980b9',
                    borderWidth: 1,
                    borderRadius: 4
                },
                {
                    label: 'ТО',
                    data: toCosts,
                    backgroundColor: 'rgba(231,76,60,0.7)',
                    borderColor: '#c0392b',
                    borderWidth: 1,
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(ctx) {
                            return ctx.dataset.label + ': ' + ctx.raw.toLocaleString() + ' ₽';
                        }
                    }
                },
                legend: { position: 'top' }
            },
            scales: {
                y: { beginAtZero: true, title: { display: true, text: '₽' } }
            }
        }
    });
};

/**
 * График 3: Средняя цена топлива по месяцам (линия)
 * @param {string} canvasId
 * @param {string} period
 */
App.timelineCharts.renderAverageFuelPrice = function(canvasId, period) {
    App.timelineCharts.destroyChart(canvasId);
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    if (canvas.width === 0 || canvas.height === 0) {
        canvas.width = canvas.clientWidth || 500;
        canvas.height = canvas.clientHeight || 200;
    }
    
    var fuelLog = App.store.fuelLog || [];
    if (fuelLog.length === 0) {
        App.timelineCharts.showNoDataMessage(canvas, 'Нет данных о заправках');
        return;
    }
    
    // Группировка по месяцам: средняя цена (средневзвешенная по литрам)
    var monthlyData = {};
    fuelLog.forEach(function(f) {
        if (!f.date) return;
        var d = new Date(f.date);
        var key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
        if (!monthlyData[key]) monthlyData[key] = { totalCost: 0, totalLiters: 0 };
        monthlyData[key].totalCost += (parseFloat(f.liters) || 0) * (parseFloat(f.pricePerLiter) || 0);
        monthlyData[key].totalLiters += parseFloat(f.liters) || 0;
    });
    
    var months = Object.keys(monthlyData).sort();
    var monthsCount = 12;
    if (period === 'quarter') monthsCount = 3;
    else if (period === 'month') monthsCount = 1;
    if (months.length > monthsCount) months = months.slice(-monthsCount);
    
    var avgPrices = months.map(function(m) {
        var data = monthlyData[m];
        return data.totalLiters > 0 ? data.totalCost / data.totalLiters : null;
    });
    
    // Если после фильтрации нет данных — сообщаем
    if (months.length === 0 || avgPrices.every(function(v) { return v === null; })) {
        App.timelineCharts.showNoDataMessage(canvas, 'Нет данных о цене топлива за выбранный период');
        return;
    }
    
    var ctx = canvas.getContext('2d');
    App.timelineCharts.activeCharts[canvasId] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                label: 'Средняя цена топлива',
                data: avgPrices,
                borderColor: '#f39c12',
                backgroundColor: 'rgba(243,156,18,0.1)',
                tension: 0.2,
                fill: true,
                pointRadius: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(ctx) {
                            return ctx.raw ? ctx.raw.toFixed(2) + ' ₽/л' : 'Нет данных';
                        }
                    }
                },
                legend: { position: 'top' }
            },
            scales: {
                y: { beginAtZero: true, title: { display: true, text: '₽/л' } }
            }
        }
    });
};