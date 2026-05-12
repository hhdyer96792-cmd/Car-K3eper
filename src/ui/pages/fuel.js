// src/ui/pages/fuel.js
window.App = window.App || {};
App.ui = App.ui || {};
App.ui.pages = App.ui.pages || {};

App.ui.pages._fuelPeriod = 'month';

App.ui.pages.renderFuelTab = function() {
    // Проверка наличия данных
    if (!App.store.fuelLog || App.store.fuelLog.length === 0) {
        // Скрываем аналитические блоки
        ['fuel-summary-card', 'fuel-period-switch'].forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
        ['fuelPriceHistogram', 'fuelConsumptionHistogram', 'fuelCostPieChart', 'fuelVolumePieChart'].forEach(function(canvasId) {
            var canvas = document.getElementById(canvasId);
            if (canvas) {
                var card = canvas.closest('.card.chart-card');
                if (card) card.style.display = 'none';
            }
        });
        var cardsContainer = document.getElementById('fuel-cards-container');
        if (cardsContainer) cardsContainer.innerHTML = '<p class="hint">Нет данных</p>';
        return;
    } else {
        // Показать скрытые ранее блоки
        ['fuel-summary-card', 'fuel-period-switch'].forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.style.display = '';
        });
        ['fuelPriceHistogram', 'fuelConsumptionHistogram', 'fuelCostPieChart', 'fuelVolumePieChart'].forEach(function(canvasId) {
            var canvas = document.getElementById(canvasId);
            if (canvas) {
                var card = canvas.closest('.card.chart-card');
                if (card) card.style.display = '';
            }
        });
    }

    App.ui.pages.renderFuelSummary();
    App.ui.pages.renderFuelPeriodSwitch();
    App.ui.pages.renderFuelCharts(App.ui.pages._fuelPeriod);
    App.ui.pages.renderFuelCards();
};

// Сводная карточка 2×2
App.ui.pages.renderFuelSummary = function() {
    var logs = App.store.fuelLog || [];
    if (logs.length === 0) {
        document.getElementById('fuel-total-cost').textContent = '0 ₽';
        document.getElementById('fuel-avg-consumption').textContent = '0';
        document.getElementById('fuel-total-liters').textContent = '0';
        document.getElementById('fuel-cost-per-km').textContent = '0';
        return;
    }
    var totalLiters = 0, totalCost = 0, totalMileage = 0;
    var typeLiters = {}, typeCost = {};

    logs.forEach(function(f) {
        var lit = parseFloat(f.liters) || 0;
        var price = parseFloat(f.pricePerLiter) || 0;
        var mileage = parseFloat(f.mileage) || 0;
        totalLiters += lit;
        totalCost += lit * price;
        if (mileage > totalMileage) totalMileage = mileage; // общий пробег = максимальный встреченный (упрощение)
        var t = f.fuelType || 'Бензин';
        if (!typeLiters[t]) { typeLiters[t] = 0; typeCost[t] = 0; }
        typeLiters[t] += lit;
        typeCost[t] += lit * price;
    });

    // Средний расход (среднее арифметическое по типам)
    var sumConsumption = 0, typeCount = 0;
    for (var t in typeLiters) {
        if (typeLiters[t] > 0 && totalMileage > 0) {
            sumConsumption += (typeLiters[t] / totalMileage) * 100;
            typeCount++;
        }
    }
    var avgConsumption = typeCount ? (sumConsumption / typeCount).toFixed(1) : 0;
    var costPerKm = totalMileage ? (totalCost / totalMileage).toFixed(2) : 0;

    document.getElementById('fuel-total-cost').textContent = totalCost.toLocaleString() + ' ₽';
    document.getElementById('fuel-avg-consumption').textContent = avgConsumption;
    document.getElementById('fuel-total-liters').textContent = totalLiters.toLocaleString();
    document.getElementById('fuel-cost-per-km').textContent = costPerKm;
};

// Переключатель периода
App.ui.pages.renderFuelPeriodSwitch = function() {
    var container = document.getElementById('fuel-period-switch');
    if (!container) return;
    container.querySelectorAll('.period-btn').forEach(function(btn) {
        btn.classList.remove('active');
        if (btn.dataset.fuelPeriod === App.ui.pages._fuelPeriod) {
            btn.classList.add('active');
        }
        btn.onclick = function() {
            App.ui.pages._fuelPeriod = this.dataset.fuelPeriod;
            container.querySelectorAll('.period-btn').forEach(function(b) { b.classList.remove('active'); });
            this.classList.add('active');
            App.ui.pages.renderFuelCharts(App.ui.pages._fuelPeriod);
        };
    });
};

// Обновление всех графиков
App.ui.pages.renderFuelCharts = function(period) {
    App.ui.pages.renderFuelPriceHistogram(period);
    App.ui.pages.renderFuelConsumptionHistogram(period);
    App.ui.pages.renderFuelCostPie(period);
    App.ui.pages.renderFuelVolumePie(period);
};

// Вспомогательные функции для группировки по периодам
function getIntervalStart(period) {
    var now = new Date();
    switch (period) {
        case 'week':
            var day = now.getDay(); // 0=вс, 1=пн...
            var diffToMonday = (day === 0 ? 6 : day - 1);
            var monday = new Date(now);
            monday.setDate(now.getDate() - diffToMonday);
            monday.setHours(0,0,0,0);
            return monday;
        case 'month':
            return new Date(now.getFullYear(), now.getMonth(), 1);
        case 'quarter':
            var quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
            return new Date(now.getFullYear(), quarterStartMonth, 1);
        case '6months':
            return new Date(now.getFullYear(), now.getMonth() - 5, 1);
        case 'year':
            return new Date(now.getFullYear(), 0, 1);
        case '5years':
            return new Date(now.getFullYear() - 4, 0, 1);
        default: return null;
    }
}

function generateIntervals(period) {
    var start = getIntervalStart(period);
    var now = new Date();
    var intervals = [];
    var labels = [];
    var current = new Date(start);
    var monthNames = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
    var dayNames = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

    if (period === 'week') {
        for (var i = 0; i < 7; i++) {
            var d = new Date(current);
            d.setDate(current.getDate() + i);
            labels.push(dayNames[i]);
            intervals.push({ start: d, end: new Date(d.getTime() + 86400000 - 1) });
        }
    } else if (period === 'month') {
        // 4 недели текущего месяца
        var monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        for (var w = 0; w < 4; w++) {
            var weekStart = new Date(monthStart);
            weekStart.setDate(monthStart.getDate() + w * 7);
            var weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            labels.push((w+1).toString());
            intervals.push({ start: weekStart, end: weekEnd });
        }
    } else if (period === 'quarter') {
        for (var m = 0; m < 3; m++) {
            var monthDate = new Date(now.getFullYear(), now.getMonth() - (2 - m), 1);
            labels.push(monthNames[monthDate.getMonth()] + '.' + monthDate.getFullYear().toString().slice(-2));
            intervals.push({ start: monthDate, end: new Date(monthDate.getFullYear(), monthDate.getMonth()+1, 0, 23,59,59) });
        }
    } else if (period === '6months') {
        for (var m = 5; m >= 0; m--) {
            var monthDate = new Date(now.getFullYear(), now.getMonth() - m, 1);
            labels.push(monthNames[monthDate.getMonth()] + '.' + monthDate.getFullYear().toString().slice(-2));
            intervals.push({ start: monthDate, end: new Date(monthDate.getFullYear(), monthDate.getMonth()+1, 0, 23,59,59) });
        }
    } else if (period === 'year') {
        for (var m = 11; m >= 0; m--) {
            var monthDate = new Date(now.getFullYear(), now.getMonth() - m, 1);
            labels.push(monthNames[monthDate.getMonth()] + '.' + monthDate.getFullYear().toString().slice(-2));
            intervals.push({ start: monthDate, end: new Date(monthDate.getFullYear(), monthDate.getMonth()+1, 0, 23,59,59) });
        }
    } else if (period === '5years') {
        for (var y = 4; y >= 0; y--) {
            var yearStart = new Date(now.getFullYear() - y, 0, 1);
            labels.push(yearStart.getFullYear().toString());
            intervals.push({ start: yearStart, end: new Date(yearStart.getFullYear(), 11, 31, 23,59,59) });
        }
    }
    return { labels: labels, intervals: intervals };
}

// Гистограмма средней цены топлива
App.ui.pages.renderFuelPriceHistogram = function(period) {
    var canvas = document.getElementById('fuelPriceHistogram');
    if (!canvas) return;
    if (App.charts._fuelPriceHist) App.charts._fuelPriceHist.destroy();
    var { labels, intervals } = generateIntervals(period);
    if (labels.length === 0) return;

    var logs = App.store.fuelLog || [];
    var datasets = {}, allTypes = [];
    logs.forEach(function(f) {
        var t = f.fuelType || 'Бензин';
        if (allTypes.indexOf(t) === -1) allTypes.push(t);
    });
    allTypes.forEach(function(t) { datasets[t] = new Array(labels.length).fill(null); });

    for (var i = 0; i < intervals.length; i++) {
        var intv = intervals[i];
        var summed = {};
        allTypes.forEach(function(t) { summed[t] = { totalCost: 0, totalLiters: 0 }; });
        logs.forEach(function(f) {
            var d = new Date(f.date);
            if (d >= intv.start && d <= intv.end) {
                var t = f.fuelType || 'Бензин';
                summed[t].totalCost += (f.liters || 0) * (f.pricePerLiter || 0);
                summed[t].totalLiters += (f.liters || 0);
            }
        });
        allTypes.forEach(function(t) {
            if (summed[t].totalLiters > 0) {
                datasets[t][i] = parseFloat((summed[t].totalCost / summed[t].totalLiters).toFixed(2));
            }
        });
    }

    var colors = { 'Бензин': '#E53935', 'Дизель': '#FF8C00', 'Газ (ГБО)': '#0072CE', 'Электричество': '#A6CE39' };
    var ds = allTypes.map(function(t) {
        return {
            label: t,
            data: datasets[t],
            backgroundColor: colors[t] || '#888',
            borderColor: colors[t] || '#888',
            borderWidth: 1
        };
    });

    var ctx = canvas.getContext('2d');
    App.charts._fuelPriceHist = new Chart(ctx, {
        type: 'bar',
        data: { labels: labels, datasets: ds },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' },
                tooltip: { callbacks: { label: function(ctx) { return ctx.dataset.label + ': ' + ctx.raw + ' ₽/л'; } } }
            },
            scales: { y: { beginAtZero: true, title: { display: true, text: '₽/л' } } }
        }
    });
};

// Гистограмма расхода топлива л/100 км
App.ui.pages.renderFuelConsumptionHistogram = function(period) {
    var canvas = document.getElementById('fuelConsumptionHistogram');
    if (!canvas) return;
    if (App.charts._fuelConsHist) App.charts._fuelConsHist.destroy();
    var { labels, intervals } = generateIntervals(period);
    if (labels.length === 0) return;

    var logs = App.store.fuelLog || [];
    // Сортируем по дате для вычисления пробега между заправками
    var sorted = logs.filter(function(f) { return f.date && f.mileage; }).sort(function(a, b) { return new Date(a.date) - new Date(b.date); });
    var allTypes = [];
    logs.forEach(function(f) {
        var t = f.fuelType || 'Бензин';
        if (allTypes.indexOf(t) === -1) allTypes.push(t);
    });

    var datasets = {};
    allTypes.forEach(function(t) { datasets[t] = new Array(labels.length).fill(null); });

    for (var i = 0; i < intervals.length; i++) {
        var intv = intervals[i];
        var typeConsumptions = {}; // { 'Бензин': [consumption1, consumption2] }
        allTypes.forEach(function(t) { typeConsumptions[t] = []; });
        for (var j = 1; j < sorted.length; j++) {
            var curr = sorted[j];
            var prev = sorted[j-1];
            var d = new Date(curr.date);
            if (d >= intv.start && d <= intv.end) {
                var dist = curr.mileage - prev.mileage;
                if (dist > 0) {
                    var cons = (curr.liters / dist) * 100;
                    var t = curr.fuelType || 'Бензин';
                    if (allTypes.indexOf(t) >= 0) {
                        typeConsumptions[t].push(cons);
                    }
                }
            }
        }
        allTypes.forEach(function(t) {
            if (typeConsumptions[t].length > 0) {
                var avg = typeConsumptions[t].reduce(function(a,b) { return a+b; }, 0) / typeConsumptions[t].length;
                datasets[t][i] = parseFloat(avg.toFixed(2));
            }
        });
    }

    var colors = { 'Бензин': '#E53935', 'Дизель': '#FF8C00', 'Газ (ГБО)': '#0072CE', 'Электричество': '#A6CE39' };
    var ds = allTypes.map(function(t) {
        return {
            label: t,
            data: datasets[t],
            backgroundColor: colors[t] || '#888',
            borderColor: colors[t] || '#888',
            borderWidth: 1
        };
    });

    var ctx = canvas.getContext('2d');
    App.charts._fuelConsHist = new Chart(ctx, {
        type: 'bar',
        data: { labels: labels, datasets: ds },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' },
                tooltip: { callbacks: { label: function(ctx) { return ctx.dataset.label + ': ' + ctx.raw + ' л/100 км'; } } }
            },
            scales: { y: { beginAtZero: true, title: { display: true, text: 'л/100 км' } } }
        }
    });
};

// Круговая диаграмма затрат по типу топлива
App.ui.pages.renderFuelCostPie = function(period) {
    var canvas = document.getElementById('fuelCostPieChart');
    if (!canvas) return;
    if (App.charts._fuelCostPie) App.charts._fuelCostPie.destroy();
    var { intervals } = generateIntervals(period);
    var logs = App.store.fuelLog || [];
    var typeCost = {};
    logs.forEach(function(f) {
        var d = new Date(f.date);
        if (intervals.some(function(intv) { return d >= intv.start && d <= intv.end; })) {
            var t = f.fuelType || 'Бензин';
            typeCost[t] = (typeCost[t] || 0) + (f.liters || 0) * (f.pricePerLiter || 0);
        }
    });
    var labels = Object.keys(typeCost);
    var data = labels.map(function(l) { return typeCost[l]; });
    var colors = ['#E53935', '#FF8C00', '#0072CE', '#A6CE39'];
    if (labels.length === 0) {
        // Нет данных
        return;
    }
    var ctx = canvas.getContext('2d');
    App.charts._fuelCostPie = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{ data: data, backgroundColor: colors.slice(0, labels.length) }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
};

// Круговая диаграмма расхода (литры) по типу топлива
App.ui.pages.renderFuelVolumePie = function(period) {
    var canvas = document.getElementById('fuelVolumePieChart');
    if (!canvas) return;
    if (App.charts._fuelVolumePie) App.charts._fuelVolumePie.destroy();
    var { intervals } = generateIntervals(period);
    var logs = App.store.fuelLog || [];
    var typeLiters = {};
    logs.forEach(function(f) {
        var d = new Date(f.date);
        if (intervals.some(function(intv) { return d >= intv.start && d <= intv.end; })) {
            var t = f.fuelType || 'Бензин';
            typeLiters[t] = (typeLiters[t] || 0) + (f.liters || 0);
        }
    });
    var labels = Object.keys(typeLiters);
    var data = labels.map(function(l) { return typeLiters[l]; });
    var colors = ['#E53935', '#FF8C00', '#0072CE', '#A6CE39'];
    if (labels.length === 0) return;
    var ctx = canvas.getContext('2d');
    App.charts._fuelVolumePie = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{ data: data, backgroundColor: colors.slice(0, labels.length) }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
};

// Карточки заправок – аккордеоны по годам
App.ui.pages.renderFuelCards = function() {
    var container = document.getElementById('fuel-cards-container');
    if (!container) return;
    var sorted = (App.store.fuelLog || []).filter(function(f) { return f.date; })
        .sort(function(a, b) { return new Date(b.date) - new Date(a.date); });
    if (sorted.length === 0) {
        container.innerHTML = '<p class="hint">Нет данных</p>';
        return;
    }
    var byYear = {};
    sorted.forEach(function(f) {
        var year = f.date.substring(0, 4);
        if (!byYear[year]) byYear[year] = [];
        byYear[year].push(f);
    });
    var years = Object.keys(byYear).sort().reverse();
    var html = '';
    years.forEach(function(year, idx) {
        var records = byYear[year];
        var totalLiters = records.reduce(function(s, r) { return s + (Number(r.liters) || 0); }, 0);
        var totalCost = records.reduce(function(s, r) { return s + (Number(r.liters) || 0) * (Number(r.pricePerLiter) || 0); }, 0);
        html += '<div class="accordion-group">';
        html += '<div class="accordion-header">';
        html += '<i data-lucide="calendar"></i> ' + year + ' (' + totalLiters.toFixed(1) + ' л, ' + totalCost.toFixed(0) + ' ₽)';
        html += '<i data-lucide="chevron-down" class="accordion-arrow" style="margin-left:auto;"></i>';
        html += '</div>';
        html += '<div class="accordion-body">';

        records.forEach(function(f) {
            var originalIndex = App.store.fuelLog.indexOf(f);
            var fuelType = f.fuelType || 'Бензин';
            var typeClass = 'petrol';
            if (fuelType === 'Дизель') typeClass = 'diesel';
            else if (fuelType === 'Газ (ГБО)') typeClass = 'gas';
            else if (fuelType === 'Электричество') typeClass = 'electric';
            var total = (Number(f.liters) || 0) * (Number(f.pricePerLiter) || 0);
            var fullTank = (f.fullTank === 'TRUE' || f.fullTank === true);
            html += '<div class="card-item">';
            html += '<div class="card-header">';
            html += '<div class="card-summary">';
            html += '<strong>' + App.utils.escapeHtml(f.date) + '</strong>';
            html += '<div class="card-meta"><span class="fuel-type-dot ' + typeClass + '"></span>' + fuelType + (fullTank ? ' · Полный бак' : '') + '</div>';
            html += '<div class="card-meta">Пробег: ' + (f.mileage || '—') + ' км · ' + f.liters + ' л · ' + (f.pricePerLiter || '—') + ' ₽/л</div>';
            html += '<div class="card-meta">Сумма: ' + total.toFixed(2) + ' ₽</div>';
            if (f.notes) html += '<div class="card-meta">Прим.: ' + App.utils.escapeHtml(f.notes) + '</div>';
            html += '</div>';
            html += '<div class="card-actions">';
            html += '<button class="icon-btn" data-action="edit-fuel" data-idx="' + originalIndex + '"><i data-lucide="pencil"></i></button>';
            html += '<button class="icon-btn" data-action="delete-fuel" data-idx="' + originalIndex + '"><i data-lucide="trash-2"></i></button>';
            html += '</div>';
            html += '</div>'; // card-header
            html += '</div>'; // card-item
        });

        html += '</div></div>'; // accordion-body, accordion-group
    });

    container.innerHTML = html;

    // Обработчики аккордеонов
    container.querySelectorAll('.accordion-header').forEach(function(header) {
        header.addEventListener('click', function() {
            var body = header.nextElementSibling;
            if (body && body.classList.contains('accordion-body')) {
                body.classList.toggle('open');
                header.classList.toggle('open');
                var arrow = header.querySelector('.accordion-arrow');
                if (arrow) {
                    arrow.style.transform = body.classList.contains('open') ? 'rotate(180deg)' : 'rotate(0deg)';
                }
            }
        });
    });

    App.initIcons();
};

// Поддержка старого вызова из events.js: теперь просто запускает новый рендер
App.ui.pages.renderFuelTable = function() {
    App.ui.pages.renderFuelTab();
};
