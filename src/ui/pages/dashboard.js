// src/ui/pages/dashboard.js
window.App = window.App || {};
App.charts = App.charts || {};
App.ui = App.ui || {};
App.ui.pages = App.ui.pages || {};

App.ui.pages.renderDashboard = function() {
    var dataPanel = document.getElementById('data-panel');
    if (!dataPanel || dataPanel.style.display === 'none') return;

    // ===== Десктопная сводка =====
    var stats = App.logic.calculateStatistics('6months');
    var mileageEl = document.getElementById('dash-mileage');
    var motoEl = document.getElementById('dash-motohours');
    var avgConsEl = document.getElementById('dash-avg-consumption');
    var costKmEl = document.getElementById('dash-cost-km');
    if (mileageEl) mileageEl.textContent = App.store.settings.currentMileage.toLocaleString();
    if (motoEl) motoEl.textContent = App.store.settings.currentMotohours.toLocaleString();
    if (avgConsEl) avgConsEl.textContent = stats.avgFuelConsumption.toFixed(1);
    if (costKmEl) costKmEl.textContent = stats.costPerKm.toFixed(2);

    // Режим эксплуатации (десктоп)
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

    // Десктопные графики
    if (typeof App.charts.renderMiniFuelConsumptionChart === 'function') App.charts.renderMiniFuelConsumptionChart();
    if (typeof App.charts.renderMiniCostsChart === 'function') App.charts.renderMiniCostsChart();
    if (typeof App.charts.renderMiniExpensePieChart === 'function') App.charts.renderMiniExpensePieChart();
    App.ui.pages.renderTop5Widget();
    var top5Container = document.getElementById('top5-container');
    var dashUpcoming = document.getElementById('dash-upcoming-container');
    if (top5Container && dashUpcoming) {
        dashUpcoming.innerHTML = top5Container.innerHTML;
        var items = dashUpcoming.querySelectorAll('.top5-item');
        items.forEach(function(item) {
            var nameEl = item.querySelector('.top5-name');
            if (!nameEl) return;
            var opName = nameEl.textContent;
            var op = App.store.operations.find(function(o) { return o.name === opName; });
            if (!op) return;
            var btn = document.createElement('button');
            btn.className = 'icon-btn execute-dash-btn';
            btn.innerHTML = '<i data-lucide="check-circle"></i>';
            btn.title = 'Выполнить';
            btn.addEventListener('click', function() {
                App.ui.pages.openServiceModal(op.id, op.name);
            });
            item.appendChild(btn);
        });
    }

    // ===== Мобильный дашборд =====
    if (window.innerWidth <= 767) {
        App.ui.pages.renderMobileDashboard();
    }

    App.initIcons();
};

// ===== Мобильный дашборд =====
App.ui.pages.renderMobileDashboard = function() {
    // 1. Режим эксплуатации (мобильный)
    var mode = App.logic.getDrivingMode();
    var modeTextMobile = document.getElementById('mobile-dash-driving-mode-text');
    var modeDotMobile = document.getElementById('mobile-mode-dot');
    if (modeTextMobile) {
        var raw = mode.text;
        if (raw.indexOf('Городской') !== -1) modeTextMobile.textContent = 'Город';
        else if (raw.indexOf('Трассовый') !== -1) modeTextMobile.textContent = 'Трасса';
        else if (raw.indexOf('Смешанный') !== -1) modeTextMobile.textContent = 'Смешанный';
        else modeTextMobile.textContent = raw;
    }
    if (modeDotMobile) {
        var cl = '';
        if (mode.text.indexOf('Городской') !== -1) cl = 'city';
        else if (mode.text.indexOf('Трассовый') !== -1) cl = 'highway';
        else if (mode.text.indexOf('Смешанный') !== -1) cl = 'mixed';
        modeDotMobile.className = 'mode-dot ' + cl;
    }

    // 3. Статистические карточки
    var stats = App.logic.calculateStatistics('6months');
    document.getElementById('mobile-dash-mileage').textContent = App.store.settings.currentMileage.toLocaleString();
    document.getElementById('mobile-dash-motohours').textContent = App.store.settings.currentMotohours.toLocaleString();
    document.getElementById('mobile-dash-avg-consumption').textContent = stats.avgFuelConsumption.toFixed(1);
    document.getElementById('mobile-dash-cost-km').textContent = stats.costPerKm.toFixed(2);

    // 4. Аккордеон "Все затраты"
    var now = new Date();
    var monthYear = now.toLocaleString('ru', { month: 'long', year: 'numeric' });
    document.getElementById('current-month-year').textContent = 'Все затраты на ' + monthYear;

    var totalFuelCost = App.store.fuelLog.reduce(function(s, f) { return s + (f.liters * f.pricePerLiter); }, 0);
    var totalMaintCost = App.store.serviceRecords.reduce(function(s, r) { return s + (Number(r.parts_cost)||0) + (Number(r.work_cost)||0); }, 0);
    var totalPartsCost = App.store.parts.reduce(function(s, p) { return s + (Number(p.price)||0); }, 0);
    var totalTiresCost = App.store.tireLog.reduce(function(s, t) { return s + (Number(t.purchaseCost)||0) + (Number(t.mountCost)||0); }, 0);
    function formatMoney(num) { return num.toLocaleString() + ' ₽'; }
    document.getElementById('total-fuel-cost-mobile').textContent = formatMoney(totalFuelCost);
    document.getElementById('total-maint-cost-mobile').textContent = formatMoney(totalMaintCost);
    document.getElementById('total-parts-cost-mobile').textContent = formatMoney(totalPartsCost);
    document.getElementById('total-tires-cost-mobile').textContent = formatMoney(totalTiresCost);

    var costHeader = document.getElementById('cost-accordion-header');
    var costBody = document.getElementById('cost-accordion-body');
    if (costHeader && costBody) {
        costHeader.onclick = function() {
            var visible = costBody.style.display === 'block';
            costBody.style.display = visible ? 'none' : 'block';
            var arrow = costHeader.querySelector('.accordion-arrow');
            if (arrow) arrow.style.transform = visible ? 'rotate(0deg)' : 'rotate(180deg)';
        };
    }

    // 5. Планировщик ТО (мини-календарь)
    var dashPlanContainer = document.getElementById('dash-plan-container');
    if (dashPlanContainer) {
        var period = document.getElementById('dash-plan-period-select')?.value || 'month';
        var plan = App.logic.generateMaintenancePlan(period);
        var interval = App.logic.getPlanPeriodDates(period);
        var currentDate = new Date(interval.start);
        var displayMonth = currentDate.getMonth();
        var displayYear = currentDate.getFullYear();

        function renderCalendar(year, month) {
            var eventMap = {};
            plan.forEach(function(op) {
                var pd = App.logic.calculatePlan(op);
                if (!pd.planDate) return;
                var key = pd.planDate;
                if (!eventMap[key]) eventMap[key] = [];
                eventMap[key].push({ op: op, plan: pd });
            });

            var firstDay = new Date(year, month, 1).getDay();
            var daysInMonth = new Date(year, month + 1, 0).getDate();

            var html = '<div class="plan-calendar">';
            html += '<div class="cal-nav">';
            html += '<button class="cal-nav-btn cal-prev-btn"><i data-lucide="chevron-left"></i></button>';
            html += '<span class="cal-month">' + new Date(year, month).toLocaleString('ru', { month: 'long', year: 'numeric' }) + '</span>';
            html += '<button class="cal-nav-btn cal-next-btn"><i data-lucide="chevron-right"></i></button>';
            html += '</div><div class="cal-weekdays">';
            ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'].forEach(function(d) { html += '<div class="cal-weekday">' + d + '</div>'; });
            html += '</div><div class="cal-grid">';

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

        // Ближайшие события
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

        var currentYear = displayYear;
        var currentMonth = displayMonth;

        function bindCalendarEvents() {
            var prevBtn = dashPlanContainer.querySelector('.cal-prev-btn');
            var nextBtn = dashPlanContainer.querySelector('.cal-next-btn');

            if (prevBtn) {
                prevBtn.addEventListener('click', function() {
                    if (currentMonth === 0) { currentMonth = 11; currentYear--; } else currentMonth--;
                    var rend = renderCalendar(currentYear, currentMonth);
                    dashPlanContainer.innerHTML = rend.html;
                    bindCalendarEvents();
                    bindDayClickEvents(rend.eventMap);
                });
            }
            if (nextBtn) {
                nextBtn.addEventListener('click', function() {
                    if (currentMonth === 11) { currentMonth = 0; currentYear++; } else currentMonth++;
                    var rend = renderCalendar(currentYear, currentMonth);
                    dashPlanContainer.innerHTML = rend.html;
                    bindCalendarEvents();
                    bindDayClickEvents(rend.eventMap);
                });
            }
        }

        function bindDayClickEvents(eventMap) {
            dashPlanContainer.querySelectorAll('.cal-day:not(.empty)').forEach(function(dayEl) {
                dayEl.addEventListener('click', function() {
                    var date = dayEl.dataset.date;
                    var events = eventMap[date] || [];
                    if (events.length === 0) return;
                    var listHtml = '<ul style="margin-top:12px;">';
                    events.forEach(function(ev) {
                        listHtml += '<li style="margin-bottom:8px;"><strong>' + App.utils.escapeHtml(ev.op.name) + '</strong> (' + App.utils.escapeHtml(ev.op.category) + ')<br>План: ' + App.utils.isoToDDMMYYYY(ev.plan.planDate) + ', ' + ev.plan.planMileage + ' км <button class="icon-btn" data-action="execute-plan" data-op-id="' + ev.op.id + '" data-op-name="' + App.utils.escapeHtml(ev.op.name) + '"><i data-lucide="check-circle"></i></button></li>';
                    });
                    listHtml += '</ul>';
                    App.ui.createModal('События на ' + App.utils.isoToDDMMYYYY(date), listHtml);
                });
            });
        }

        bindCalendarEvents();
        bindDayClickEvents(firstRender.eventMap);

        // Кнопка "Действия"
        document.getElementById('dash-calendar-action-btn').addEventListener('click', function() {
            var period = document.getElementById('dash-plan-period-select')?.value || 'month';
            var modalContent = '<div style="display:flex; gap:12px; justify-content:center;">' +
                '<button id="modal-download-ics" class="primary-btn"><i data-lucide="download"></i> Скачать</button>' +
                '<button id="modal-subscribe-cal" class="secondary-btn"><i data-lucide="calendar-plus"></i> Подписаться</button>' +
                '</div>';
            var modal = App.ui.createModal('Выберите действие', modalContent);
            document.getElementById('modal-download-ics').addEventListener('click', function() {
                modal.remove();
                var plan = App.logic.generateMaintenancePlan(period);
                var icsContent = generateICS(plan);
                var blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
                var link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = 'vesta_plan_' + new Date().toISOString().slice(0,10) + '.ics';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                App.toast('Календарь скачан', 'success');
            });
            document.getElementById('modal-subscribe-cal').addEventListener('click', function() {
                modal.remove();
                if (typeof App.ui.pages.subscribeToCalendar === 'function') App.ui.pages.subscribeToCalendar();
                else App.toast('Функция подписки недоступна', 'error');
            });
        });

        document.getElementById('dash-plan-period-select').addEventListener('change', function() {
            App.ui.pages.renderMobileDashboard();
        });
    }

    // 6. Ресурс деталей
    var candidates = App.store.operations.filter(function(op) { return op.intervalKm || op.intervalMonths || op.intervalMotohours; });
    var withPercents = candidates.map(function(op) {
        var plan = App.logic.calculatePlan(op);
        var percent = 0;
        if (op.intervalKm && plan.planMileage > (op.lastMileage||0))
            percent = Math.min(100, Math.round((App.store.settings.currentMileage - (op.lastMileage||0)) / (plan.planMileage - (op.lastMileage||0)) * 100));
        else if (op.intervalMotohours && plan.recMotohours > (op.lastMotohours||0))
            percent = Math.min(100, Math.round((App.store.settings.currentMotohours - (op.lastMotohours||0)) / (plan.recMotohours - (op.lastMotohours||0)) * 100));
        else if (op.intervalMonths && op.lastDate) {
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

    // 7. Последние операции
    function renderAccordionBody(id, data, fields, tab) {
        var body = document.getElementById(id);
        if (!body) return;
        var latest = data.slice().sort(function(a,b) { return new Date(b.date) - new Date(a.date); }).slice(0,3);
        var html = '';
        if (latest.length === 0) {
            html = '<p class="hint">Нет данных</p>';
        } else {
            latest.forEach(function(rec) {
                html += '<div class="last-row"><span>' + rec.date + '</span><span>' + fields.name(rec) + '</span><span>' + (fields.cost(rec) || '') + '</span></div>';
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
            var visible = body.style.display === 'block';
            body.style.display = visible ? 'none' : 'block';
            var arrow = header.querySelector('.accordion-arrow');
            if (arrow) arrow.style.transform = visible ? 'rotate(0deg)' : 'rotate(180deg)';
        });
    });

    // 8. Прогноз
    document.getElementById('calc-prediction-btn-mobile').addEventListener('click', function() {
        var target = parseFloat(document.getElementById('prediction-target-mobile')?.value);
        if (isNaN(target)) return;
        var result = App.logic.predictMileageDate(target);
        var resultEl = document.getElementById('prediction-result-mobile');
        if (resultEl) {
            if (result) resultEl.textContent = 'Ожидаемая дата: ' + result.toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' });
            else resultEl.textContent = 'Недостаточно данных или некорректный пробег.';
        }
    });

    // Кнопка обновления пробега (мобильная)
    var updateBtn = document.getElementById('dash-update-mileage-btn');
    if (updateBtn) {
        updateBtn.removeEventListener('click', App.events.updateMileageAndAverages);
        updateBtn.addEventListener('click', function() {
            var newMileage = parseFloat(document.getElementById('dash-new-mileage').value);
            var newMotohours = parseFloat(document.getElementById('dash-new-motohours').value);
            if (isNaN(newMileage) || isNaN(newMotohours)) {
                App.toast('Введите пробег и моточасы', 'warning');
                return;
            }
            App.store.settings.currentMileage = newMileage;
            App.store.settings.currentMotohours = newMotohours;
            App.events.updateMileageAndAverages();
        });
    }
};
