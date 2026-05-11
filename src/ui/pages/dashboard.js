// src/ui/pages/dashboard.js
window.App = window.App || {};
App.charts = App.charts || {};
App.ui = App.ui || {};
App.ui.pages = App.ui.pages || {};

App.ui.pages.renderDashboard = function() {
    var dataPanel = document.getElementById('data-panel');
    if (!dataPanel || dataPanel.style.display === 'none') return;

    var stats = App.logic.calculateStatistics('6months');

    // ---- Десктопная сводка (без изменений) ----
    var mileageEl = document.getElementById('dash-mileage');
    var motoEl = document.getElementById('dash-motohours');
    var avgConsEl = document.getElementById('dash-avg-consumption');
    var costKmEl = document.getElementById('dash-cost-km');
    if (mileageEl) mileageEl.textContent = App.store.settings.currentMileage.toLocaleString();
    if (motoEl) motoEl.textContent = App.store.settings.currentMotohours.toLocaleString();
    if (avgConsEl) avgConsEl.textContent = stats.avgFuelConsumption.toFixed(1);
    if (costKmEl) costKmEl.textContent = stats.costPerKm.toFixed(2);

    // Режим эксплуатации (общий для десктопа и мобильных)
    var mode = App.logic.getDrivingMode();
    var modeTextEl = document.getElementById('dash-driving-mode-text');
    var modeDotEl = document.getElementById('mode-dot');
    if (modeTextEl) {
        var rawMode = mode.text;
        if (rawMode.indexOf('Городской') !== -1) modeTextEl.textContent = 'Город';
        else if (rawMode.indexOf('Трассовый') !== -1) modeTextEl.textContent = 'Трасса';
        else if (rawMode.indexOf('Смешанный') !== -1) modeTextEl.textContent = 'Смешанный';
        else modeTextEl.textContent = rawMode;
    }
    if (modeDotEl) {
        var modeClass = '';
        if (mode.text.indexOf('Городской') !== -1) modeClass = 'city';
        else if (mode.text.indexOf('Трассовый') !== -1) modeClass = 'highway';
        else if (mode.text.indexOf('Смешанный') !== -1) modeClass = 'mixed';
        modeDotEl.className = 'mode-dot ' + modeClass;
    }

    // Десктопные графики и виджеты (оставляем без изменений, если они нужны)
    if (typeof App.charts.renderMiniFuelConsumptionChart === 'function') App.charts.renderMiniFuelConsumptionChart();
    if (typeof App.charts.renderMiniCostsChart === 'function') App.charts.renderMiniCostsChart();
    if (typeof App.charts.renderMiniExpensePieChart === 'function') App.charts.renderMiniExpensePieChart();
    App.ui.pages.renderTireWearMini();

    // === Мобильные виджеты ===
    App.ui.pages.renderMobileDashboard();
    App.initIcons();
};

// ========== Мобильный дашборд ==========
App.ui.pages.renderMobileDashboard = function() {
    if (window.innerWidth > 767) return; // выходим, если не мобильный

    // 4. Аккордеон «Все затраты»
    var now = new Date();
    var monthYear = now.toLocaleString('ru', { month: 'long', year: 'numeric' });
    var currentMonthYearEl = document.getElementById('current-month-year');
    if (currentMonthYearEl) currentMonthYearEl.textContent = 'Все затраты на ' + monthYear;

    var totalFuelCost = App.store.fuelLog.reduce(function(s, f) { return s + (f.liters * f.pricePerLiter); }, 0);
    var totalMaintCost = App.store.serviceRecords.reduce(function(s, r) { return s + (Number(r.parts_cost)||0) + (Number(r.work_cost)||0); }, 0);
    var totalPartsCost = App.store.parts.reduce(function(s, p) { return s + (Number(p.price)||0); }, 0);
    var totalTiresCost = App.store.tireLog.reduce(function(s, t) { return s + (Number(t.purchaseCost)||0) + (Number(t.mountCost)||0); }, 0);

    function formatMoney(num) { return num.toLocaleString() + ' ₽'; }

    document.getElementById('total-fuel-cost-mobile').textContent = formatMoney(totalFuelCost);
    document.getElementById('total-maint-cost-mobile').textContent = formatMoney(totalMaintCost);
    document.getElementById('total-parts-cost-mobile').textContent = formatMoney(totalPartsCost);
    document.getElementById('total-tires-cost-mobile').textContent = formatMoney(totalTiresCost);

    // Аккордеон: клик по заголовку
    var costHeader = document.getElementById('cost-accordion-header');
    var costBody = document.getElementById('cost-accordion-body');
    if (costHeader && costBody) {
        costHeader.onclick = function() {
            var isVisible = costBody.style.display === 'block';
            costBody.style.display = isVisible ? 'none' : 'block';
            var arrow = costHeader.querySelector('.accordion-arrow');
            if (arrow) arrow.style.transform = isVisible ? 'rotate(0deg)' : 'rotate(180deg)';
        };
    }

    // 5. Планировщик ТО на дашборде
    var dashPlanContainer = document.getElementById('dash-plan-container');
    if (dashPlanContainer) {
        var period = document.getElementById('dash-plan-period-select')?.value || 'month';
        var plan = App.logic.generateMaintenancePlan(period);
        var interval = App.logic.getPlanPeriodDates(period);
        var currentDate = new Date(interval.start);
        var displayMonth = currentDate.getMonth();
        var displayYear = currentDate.getFullYear();

        // Переиспользуем функцию renderCalendar из maintenance.js, если она доступна глобально
        // или копируем её сюда. Для краткости я продублирую её логику.
        function renderCalendar(year, month) {
            var eventMap = {};
            plan.forEach(function(op) {
                var planData = App.logic.calculatePlan(op);
                if (!planData.planDate) return;
                var dateKey = planData.planDate;
                if (!eventMap[dateKey]) eventMap[dateKey] = [];
                eventMap[dateKey].push({ op: op, plan: planData });
            });

            var firstDay = new Date(year, month, 1).getDay();
            var daysInMonth = new Date(year, month + 1, 0).getDate();

            var html = '<div class="plan-calendar">';
            html += '<div class="cal-nav">';
            html += '<button class="cal-nav-btn cal-prev-btn"><i data-lucide="chevron-left"></i></button>';
            html += '<span class="cal-month">' + new Date(year, month).toLocaleString('ru', { month: 'long', year: 'numeric' }) + '</span>';
            html += '<button class="cal-nav-btn cal-next-btn"><i data-lucide="chevron-right"></i></button>';
            html += '</div>';
            html += '<div class="cal-weekdays">';
            ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'].forEach(function(d) { html += '<div class="cal-weekday">' + d + '</div>'; });
            html += '</div>';
            html += '<div class="cal-grid">';

            for (var i = 0; i < firstDay; i++) html += '<div class="cal-day empty"></div>';
            for (var d = 1; d <= daysInMonth; d++) {
                var dateISO = year + '-' + String(month+1).padStart(2,'0') + '-' + String(d).padStart(2,'0');
                var events = eventMap[dateISO] || [];
                var hasEvents = events.length > 0;
                var todayClass = (dateISO === new Date().toISOString().split('T')[0]) ? ' today' : '';
                html += '<div class="cal-day' + todayClass + '" data-date="' + dateISO + '">';
                html += '<span class="cal-day-num">' + d + '</span>';
                if (hasEvents) {
                    html += '<div class="cal-events">';
                    events.forEach(function(ev) { html += '<span class="cal-event-dot" title="' + App.utils.escapeHtml(ev.op.name) + '"></span>'; });
                    html += '</div>';
                }
                html += '</div>';
            }
            html += '</div></div>';
            return { html: html, eventMap: eventMap };
        }

        var firstRender = renderCalendar(displayYear, displayMonth);
        dashPlanContainer.innerHTML = firstRender.html;

        // Ближайшие события (до трёх)
        var upcomingContainer = document.getElementById('dash-upcoming-events');
        if (upcomingContainer) {
            var sortedPlan = plan.slice().sort(function(a,b) { return App.logic.calculatePlan(a).daysLeft - App.logic.calculatePlan(b).daysLeft; });
            var top3 = sortedPlan.slice(0,3);
            var upcomingHtml = '<h4>Ближайшие:</h4><ul>';
            top3.forEach(function(op) {
                var planData = App.logic.calculatePlan(op);
                upcomingHtml += '<li>' + App.utils.escapeHtml(op.name) + ' — ' + planData.daysLeft + ' дн.</li>';
            });
            upcomingHtml += '</ul>';
            upcomingContainer.innerHTML = upcomingHtml;
        }

        // Навигация по месяцам
        var currentYear = displayYear, currentMonth = displayMonth;
        var prevBtn = dashPlanContainer.querySelector('.cal-prev-btn');
        var nextBtn = dashPlanContainer.querySelector('.cal-next-btn');
        if (prevBtn) prevBtn.addEventListener('click', function() {
            if (currentMonth === 0) { currentMonth = 11; currentYear--; } else currentMonth--;
            dashPlanContainer.innerHTML = renderCalendar(currentYear, currentMonth).html;
            // Заново навешиваем события
        });
        if (nextBtn) nextBtn.addEventListener('click', function() {
            if (currentMonth === 11) { currentMonth = 0; currentYear++; } else currentMonth++;
            dashPlanContainer.innerHTML = renderCalendar(currentYear, currentMonth).html;
        });
    }

    // 6. Ресурс деталей (три самых критичных)
    var candidates = App.store.operations.filter(function(op) { return op.intervalKm || op.intervalMonths || op.intervalMotohours; });
    var withPercents = candidates.map(function(op) {
        var plan = App.logic.calculatePlan(op);
        var percent = 0;
        if (op.intervalKm && plan.planMileage > (op.lastMileage||0)) {
            percent = Math.min(100, Math.round((App.store.settings.currentMileage - (op.lastMileage||0)) / (plan.planMileage - (op.lastMileage||0)) * 100));
        } else if (op.intervalMotohours && plan.recMotohours > (op.lastMotohours||0)) {
            percent = Math.min(100, Math.round((App.store.settings.currentMotohours - (op.lastMotohours||0)) / (plan.recMotohours - (op.lastMotohours||0)) * 100));
        } else if (op.intervalMonths && op.lastDate) {
            var totalDays = op.intervalMonths * 30;
            var elapsed = Math.floor((new Date() - new Date(op.lastDate)) / 86400000);
            percent = Math.min(100, Math.round((elapsed / totalDays) * 100));
        }
        return { op: op, percent: percent };
    }).filter(function(item) { return item.percent > 0; }).sort(function(a,b) { return b.percent - a.percent; });
    var top3 = withPercents.slice(0,3);

    var resourceContainer = document.getElementById('resource-bars-container');
    if (resourceContainer) {
        var html = '';
        top3.forEach(function(item) {
            var p = item.percent;
            var color = p > 70 ? 'var(--success)' : (p > 30 ? 'var(--warning)' : 'var(--danger)');
            html += '<div style="margin-bottom:8px;">';
            html += '<div style="display:flex; justify-content:space-between; font-size:0.85rem;"><span>' + App.utils.escapeHtml(item.op.name) + '</span><span>' + p + '%</span></div>';
            html += '<div class="progress-bar-container"><div class="progress-bar" style="width:' + p + '%; background:' + color + ';"></div></div>';
            html += '</div>';
        });
        resourceContainer.innerHTML = html || '<p class="hint">Нет данных</p>';
    }

    // 7. Последние операции (аккордеоны)
    function renderAccordionBody(id, data, fields, tab) {
        var body = document.getElementById(id);
        if (!body) return;
        var latest = data.slice().sort(function(a,b) { return new Date(b.date) - new Date(a.date); }).slice(0,3);
        var html = '';
        if (latest.length === 0) {
            html = '<p class="hint">Нет данных</p>';
        } else {
            latest.forEach(function(rec) {
                html += '<div class="last-row"><span>' + rec.date + '</span><span>' + (fields.name(rec)) + '</span><span>' + (fields.cost(rec) || '') + '</span></div>';
            });
            html += '<button class="secondary-btn more-btn" data-tab="' + tab + '">Больше данных</button>';
        }
        body.innerHTML = html;
    }

    renderAccordionBody('last-fuel-body', App.store.fuelLog, {
        name: function(f) { return f.fuelType || 'Бензин'; },
        cost: function(f) { return (f.liters * f.pricePerLiter).toFixed(0) + ' ₽'; }
    }, 'fuel');

    renderAccordionBody('last-to-body', App.store.serviceRecords, {
        name: function(r) { var op = App.store.operations.find(function(o) { return o.id == r.operation_id; }); return op ? op.name : 'Неизвестно'; },
        cost: function(r) { return (Number(r.parts_cost)+Number(r.work_cost)).toFixed(0) + ' ₽'; }
    }, 'to');

    renderAccordionBody('last-parts-body', App.store.parts, {
        name: function(p) { return p.oem || p.analog || p.operation; },
        cost: function(p) { return (p.price || '') + ' ₽'; }
    }, 'parts');

    renderAccordionBody('last-tires-body', App.store.tireLog, {
        name: function(t) { return t.type || 'Шины'; },
        cost: function(t) { return (Number(t.purchaseCost||0)+Number(t.mountCost||0)).toFixed(0) + ' ₽'; }
    }, 'tires');

    // Обработчики аккордеонов
    document.querySelectorAll('.accordion-header[data-accordion]').forEach(function(header) {
        header.addEventListener('click', function() {
            var body = document.getElementById('last-' + header.dataset.accordion + '-body');
            if (!body) return;
            var isVisible = body.style.display === 'block';
            body.style.display = isVisible ? 'none' : 'block';
        });
    });

    // Кнопки «Больше данных»
    document.querySelectorAll('.more-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            App.events.switchToTab(btn.dataset.tab);
        });
    });
};

// Обработчик для мобильной кнопки обновления пробега на дашборде
document.addEventListener('DOMContentLoaded', function() {
    var dashUpdateBtn = document.getElementById('dash-update-mileage-btn');
    if (dashUpdateBtn) {
        dashUpdateBtn.addEventListener('click', App.events.updateMileageAndAverages);
    }
});
