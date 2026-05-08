// src/ui/components/charts.js
window.App = window.App || {};
App.charts = App.charts || {};

// Хранилище активных графиков для возможности уничтожения
App.charts.activeCharts = {};

/**
 * Уничтожает график по ID canvas и удаляет из хранилища.
 * @param {string} canvasId - ID элемента canvas
 */
App.charts.destroyChart = function(canvasId) {
    if (App.charts.activeCharts[canvasId]) {
        App.charts.activeCharts[canvasId].destroy();
        delete App.charts.activeCharts[canvasId];
    }
};

/**
 * Цвета для типов топлива (можно расширять)
 */
var fuelTypeColors = {
    'Бензин': '#e67e22',
    'Дизель': '#2ecc71',
    'Газ (ГБО)': '#f39c12',
    'Электричество': '#3498db'
};
var averageColor = '#e74c3c'; // цвет для среднего расхода

/**
 * Определяет, мобильное ли устройство (ширина < 768px)
 */
function isMobile() {
    return window.innerWidth < 768;
}

/**
 * График расхода топлива по месяцам (л/100 км) – по типам с возможностью скрыть/показать.
 * На мобильных — bar, на десктопе — line с зумом.
 */
App.charts.renderFuelConsumptionChart = function() {
    App.charts.destroyChart('fuelConsumptionChart');
    var canvas = document.getElementById('fuelConsumptionChart');
    if (!canvas) return;
    var grouped = App.logic.groupFuelByMonth();
    var months = grouped.months;
    var datasetsByType = grouped.datasetsByType;
    var averageConsumption = grouped.averageConsumption;

    var mobile = isMobile();
    var chartType = mobile ? 'bar' : 'line';

    var datasets = [];

    // Средний расход (видим по умолчанию)
    var avgDataset = {
        label: 'Средний расход',
        data: averageConsumption,
        borderColor: averageColor,
        backgroundColor: averageColor + '20',
        tension: 0.2,
        fill: false,
        pointRadius: mobile ? 0 : 4,
        pointHoverRadius: mobile ? 3 : 6,
        hidden: false
    };
    if (mobile) {
        avgDataset.backgroundColor = averageColor + '70';
        avgDataset.borderWidth = 2;
        avgDataset.borderRadius = 6;
        delete avgDataset.tension;
        delete avgDataset.fill;
    }
    datasets.push(avgDataset);

    // Отдельные типы (скрыты по умолчанию)
    for (var type in datasetsByType) {
        var data = datasetsByType[type].consumption;
        var color = fuelTypeColors[type] || '#888';
        var typeDataset = {
            label: type,
            data: data,
            borderColor: color,
            backgroundColor: color + '20',
            tension: 0.2,
            fill: false,
            pointRadius: mobile ? 0 : 4,
            pointHoverRadius: mobile ? 3 : 6,
            hidden: true
        };
        if (mobile) {
            typeDataset.backgroundColor = color + '70';
            typeDataset.borderWidth = 2;
            typeDataset.borderRadius = 6;
            delete typeDataset.tension;
            delete typeDataset.fill;
        }
        datasets.push(typeDataset);
    }

    var ctx = canvas.getContext('2d');
    var options = {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
            tooltip: {
                callbacks: {
                    label: function(ctx) { return ctx.dataset.label + ': ' + ctx.raw + ' л/100 км'; }
                }
            },
            legend: { position: 'top' }
        },
        scales: {
            y: { title: { display: true, text: 'л/100 км' }, beginAtZero: true }
        }
    };

    if (!mobile) {
        options.plugins.zoom = {
            pan: { enabled: true, mode: 'x', speed: 10 },
            zoom: {
                wheel: { enabled: true },
                pinch: { enabled: true },
                mode: 'x',
                speed: 0.1,
                limits: { x: { min: 0.5, max: 5 } }
            }
        };
    }

    App.charts.activeCharts['fuelConsumptionChart'] = new Chart(ctx, {
        type: chartType,
        data: {
            labels: months,
            datasets: datasets
        },
        options: options
    });
    App.initIcons();
};

/**
 * График средней цены топлива по месяцам (₽/л) – по типам, по умолчанию основной тип, остальные скрыты.
 * На мобильных — bar, на десктопе — line с зумом.
 */
App.charts.renderFuelPriceChart = function() {
    App.charts.destroyChart('fuelPriceChart');
    var canvas = document.getElementById('fuelPriceChart');
    if (!canvas) return;
    var grouped = App.logic.groupFuelByMonth();
    var months = grouped.months;
    var datasetsByType = grouped.datasetsByType;
    var mainFuelType = grouped.mainFuelType;

    var mobile = isMobile();
    var chartType = mobile ? 'bar' : 'line';

    var datasets = [];
    for (var type in datasetsByType) {
        var data = datasetsByType[type].price;
        var color = fuelTypeColors[type] || '#888';
        var typeDataset = {
            label: type,
            data: data,
            borderColor: color,
            backgroundColor: color + '20',
            tension: 0.2,
            fill: false,
            pointRadius: mobile ? 0 : 4,
            pointHoverRadius: mobile ? 3 : 6,
            hidden: (type !== mainFuelType)
        };
        if (mobile) {
            typeDataset.backgroundColor = color + '70';
            typeDataset.borderWidth = 2;
            typeDataset.borderRadius = 6;
            delete typeDataset.tension;
            delete typeDataset.fill;
        }
        datasets.push(typeDataset);
    }

    var ctx = canvas.getContext('2d');
    var options = {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
            tooltip: {
                callbacks: {
                    label: function(ctx) { return ctx.dataset.label + ': ' + ctx.raw + ' ₽/л'; }
                }
            },
            legend: { position: 'top' }
        },
        scales: {
            y: { title: { display: true, text: '₽/л' }, beginAtZero: true }
        }
    };

    if (!mobile) {
        options.plugins.zoom = {
            pan: { enabled: true, mode: 'x', speed: 10 },
            zoom: {
                wheel: { enabled: true },
                pinch: { enabled: true },
                mode: 'x',
                speed: 0.1,
                limits: { x: { min: 0.5, max: 5 } }
            }
        };
    }

    App.charts.activeCharts['fuelPriceChart'] = new Chart(ctx, {
        type: chartType,
        data: {
            labels: months,
            datasets: datasets
        },
        options: options
    });
    App.initIcons();
};

/**
 * График затрат на топливо и ТО по месяцам (столбчатый). Всегда bar.
 * На десктопе добавляется зум.
 */
App.charts.renderCostsChart = function(period) {
    App.charts.destroyChart('costsChart');
    var canvas = document.getElementById('costsChart');
    if (!canvas) return;
    period = period || document.getElementById('stats-period-select')?.value || 'all';
    var grouped = App.logic.groupCostsByMonth(period);
    var months = grouped.months;
    var fuelCosts = grouped.fuelCosts;
    var toCosts = grouped.toCosts;

    if (months.length === 0) {
        var ctx = canvas.getContext('2d');
        App.charts.activeCharts['costsChart'] = new Chart(ctx, {
            type: 'bar',
            data: { labels: [], datasets: [] },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: true },
                    tooltip: { callbacks: { title: function() { return 'Нет данных'; } } }
                },
                scales: { y: { title: { display: true, text: '₽' } } }
            }
        });
        return;
    }

    var ctx = canvas.getContext('2d');
    var options = {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
            tooltip: {
                callbacks: {
                    label: function(context) {
                        return context.dataset.label + ': ' + context.raw.toFixed(2) + ' ₽';
                    }
                }
            },
            legend: { position: 'top' }
        },
        scales: {
            y: {
                beginAtZero: true,
                title: { display: true, text: 'Затраты (₽)' },
                ticks: { callback: function(value) { return value.toLocaleString(); } }
            },
            x: {
                title: { display: true, text: 'Месяц' },
                ticks: { maxRotation: 45, minRotation: 45 }
            }
        }
    };

    if (!isMobile()) {
        options.plugins.zoom = {
            pan: { enabled: true, mode: 'x', speed: 10 },
            zoom: {
                wheel: { enabled: true },
                pinch: { enabled: true },
                mode: 'x',
                speed: 0.1,
                limits: { x: { min: 0.5, max: 5 } }
            }
        };
    }

    App.charts.activeCharts['costsChart'] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [
                {
                    label: 'Топливо (₽)',
                    data: fuelCosts,
                    backgroundColor: 'rgba(52, 152, 219, 0.7)',
                    borderColor: '#2980b9',
                    borderWidth: 1,
                    borderRadius: 4,
                    barPercentage: 0.7,
                    categoryPercentage: 0.8
                },
                {
                    label: 'ТО (запчасти + работы) (₽)',
                    data: toCosts,
                    backgroundColor: 'rgba(231, 76, 60, 0.7)',
                    borderColor: '#c0392b',
                    borderWidth: 1,
                    borderRadius: 4,
                    barPercentage: 0.7,
                    categoryPercentage: 0.8
                }
            ]
        },
        options: options
    });
    App.initIcons();
};

/**
 * Круговая диаграмма распределения затрат по категориям (всегда doughnut, без изменений)
 */
App.charts.renderExpensePieChart = function(period) {
    App.charts.destroyChart('expensePieChart');
    var canvas = document.getElementById('expensePieChart');
    if (!canvas) return;
    period = period || document.getElementById('stats-period-select')?.value || 'all';
    var structure = App.logic.calculateExpenseStructure(period);
    var labels = structure.labels;
    var values = structure.values;
    var colors = structure.colors;

    if (values.length === 0) {
        var ctx = canvas.getContext('2d');
        App.charts.activeCharts['expensePieChart'] = new Chart(ctx, {
            type: 'doughnut',
            data: { labels: ['Нет данных'], datasets: [{ data: [1], backgroundColor: ['#ccc'] }] },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { position: 'top' },
                    tooltip: { callbacks: { title: function() { return 'Нет данных за период'; } } }
                }
            }
        });
        return;
    }

    var ctx = canvas.getContext('2d');
    App.charts.activeCharts['expensePieChart'] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colors,
                borderWidth: 0,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            cutout: '50%',
            plugins: {
                legend: { position: 'top' },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            var label = context.label || '';
                            var value = context.raw;
                            var total = context.dataset.data.reduce(function(a, b) { return a + b; }, 0);
                            var percent = ((value / total) * 100).toFixed(1);
                            return label + ': ' + value.toFixed(2) + ' ₽ (' + percent + '%)';
                        }
                    }
                }
            }
        }
    });
    App.initIcons();
};

/**
 * Прогноз замены масла: линия с цветовым градиентом (зелёный → красный).
 */
App.charts.renderOilChart = function() {
    App.charts.destroyChart('oilChart');
    var canvas = document.getElementById('oilChart');
    if (!canvas) return;

    var oilOp = App.store.operations.find(function(op) {
        return op.name.indexOf('Масло') !== -1 && op.category.indexOf('ДВС') !== -1;
    });
    if (!oilOp) return;

    var plan = App.logic.calculatePlan(oilOp);
    var lastMileage = oilOp.lastMileage || App.store.settings.currentMileage;
    var nextMileage = plan.planMileage;
    if (!nextMileage || nextMileage <= lastMileage) return;

    // Генерируем 21 точку для плавного градиента
    var points = [];
    for (var i = 0; i <= 20; i++) {
        var fraction = i / 20;
        var x = lastMileage + fraction * (nextMileage - lastMileage);
        var y = parseFloat((fraction * 100).toFixed(1));
        points.push({ x: x, y: y });
    }

    // Функция цвета: зелёный → жёлтый → красный
    function getGradientColor(percent) {
        var r, g;
        if (percent <= 50) {
            r = Math.floor((percent / 50) * 255);
            g = 255;
        } else {
            r = 255;
            g = Math.floor((1 - (percent - 50) / 50) * 255);
        }
        return 'rgb(' + r + ',' + g + ',0)';
    }

    var ctx = canvas.getContext('2d');
    App.charts.activeCharts['oilChart'] = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: 'Износ масла',
                data: points,
                parsing: { xAxisKey: 'x', yAxisKey: 'y' },
                borderWidth: 4,
                pointRadius: 0,
                tension: 0.2,
                segment: {
                    borderColor: function(ctx) {
                        var point = ctx.p0.parsed.y;
                        return getGradientColor(point);
                    }
                }
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(ctx) {
                            return 'Пробег: ' + ctx.raw.x + ' км, износ: ' + ctx.raw.y + '%';
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: { display: true, text: 'Пробег (км)' },
                    ticks: { callback: function(v) { return v.toLocaleString(); } }
                },
                y: {
                    title: { display: true, text: '% износа' },
                    min: 0,
                    max: 100,
                    ticks: { stepSize: 20 }
                }
            }
        }
    });
    App.initIcons();
};

/**
 * Мини-график расхода топлива (дашборд) – показывает средний расход.
 * На мобильных переключается на bar.
 */
App.charts.renderMiniFuelConsumptionChart = function() {
    var canvas = document.getElementById('dash-fuel-consumption-chart');
    if (!canvas) return;
    if (App.charts._dashFuelChart) {
        App.charts._dashFuelChart.destroy();
    }
    var grouped = App.logic.groupFuelByMonth();
    var months = grouped.months.slice(-6);
    var data = grouped.averageConsumption.slice(-6);

    // Если средний расход недоступен, берём первый попавшийся тип
    if (data.every(function(v) { return v === null; })) {
        var firstType = Object.keys(grouped.datasetsByType)[0];
        if (firstType) data = grouped.datasetsByType[firstType].consumption.slice(-6);
    }

    var mobile = isMobile();
    var chartType = mobile ? 'bar' : 'line';

    var dataset = {
        label: 'Средний расход',
        data: data,
        borderColor: '#e74c3c',
        backgroundColor: 'rgba(231,76,60,0.1)',
        tension: 0.2,
        pointRadius: mobile ? 0 : 2
    };
    if (mobile) {
        dataset.backgroundColor = '#e74c3c70';
        dataset.borderWidth = 2;
        dataset.borderRadius = 4;
        delete dataset.tension;
    }

    var ctx = canvas.getContext('2d');
    var options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: function(ctx) { return ctx.raw + ' л/100 км'; }
                }
            }
        },
        scales: { y: { beginAtZero: true } }
    };

    App.charts._dashFuelChart = new Chart(ctx, {
        type: chartType,
        data: {
            labels: months,
            datasets: [dataset]
        },
        options: options
    });
};

/**
 * Мини-график затрат (дашборд) – всегда bar.
 */
App.charts.renderMiniCostsChart = function() {
    var canvas = document.getElementById('dash-costs-chart');
    if (!canvas) return;
    if (App.charts._dashCostsChart) {
        App.charts._dashCostsChart.destroy();
    }
    var grouped = App.logic.groupCostsByMonth('6months');
    var months = grouped.months;
    var fuelCosts = grouped.fuelCosts;
    var toCosts = grouped.toCosts;

    var ctx = canvas.getContext('2d');
    App.charts._dashCostsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [
                { label: 'Топливо', data: fuelCosts, backgroundColor: '#3498db' },
                { label: 'ТО', data: toCosts, backgroundColor: '#e74c3c' }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' },
                tooltip: { callbacks: { label: function(ctx) { return ctx.raw + ' ₽'; } } }
            },
            scales: { y: { beginAtZero: true, ticks: { callback: function(v) { return v + ' ₽'; } } } }
        }
    });
};

/**
 * Мини-круговая диаграмма расходов (дашборд) – всегда doughnut.
 */
App.charts.renderMiniExpensePieChart = function() {
    var canvas = document.getElementById('dash-expense-pie-chart');
    if (!canvas) return;
    if (App.charts._dashPieChart) {
        App.charts._dashPieChart.destroy();
    }
    var structure = App.logic.calculateExpenseStructure('6months');

    var ctx = canvas.getContext('2d');
    App.charts._dashPieChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: structure.labels,
            datasets: [{ data: structure.values, backgroundColor: structure.colors }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } }
        }
    });
};

/**
 * Обновление индикатора режима вождения на странице статистики
 */
App.charts.updateDrivingModeIndicator = function() {
    var modeSpan = document.getElementById('driving-mode');
    var hintSpan = document.getElementById('driving-mode-hint');
    if (!modeSpan) return;
    var modeData = App.logic.getDrivingMode();
    modeSpan.textContent = modeData.text;
    if (hintSpan) hintSpan.textContent = modeData.hint;
    var container = document.getElementById('driving-mode-indicator');
    if (container) {
        container.classList.remove('city', 'highway', 'mixed');
        if (modeData.text.indexOf('Городской') !== -1) container.classList.add('city');
        else if (modeData.text.indexOf('Трассовый') !== -1) container.classList.add('highway');
        else if (modeData.text.indexOf('Смешанный') !== -1) container.classList.add('mixed');
    }
};