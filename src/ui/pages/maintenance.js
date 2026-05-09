// src/ui/pages/maintenance.js
window.App = window.App || {};
App.ui = App.ui || {};
App.ui.pages = App.ui.pages || {};

App.ui.pages.renderTOTable = function() {
    var tbody = document.getElementById('table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    var grouped = {};
    App.store.operations.forEach(function(op) {
        if (!grouped[op.category]) grouped[op.category] = [];
        grouped[op.category].push(op);
    });

    var categories = Object.keys(grouped).sort(function(a, b) {
        if (a === 'Прочее') return 1;
        if (b === 'Прочее') return -1;
        return a.localeCompare(b);
    });

    categories.forEach(function(cat) {
        var headerRow = document.createElement('tr');
        headerRow.className = 'category-row';
        headerRow.innerHTML = '<td colspan="7">' + App.utils.escapeHtml(cat) + '</td>';
        tbody.appendChild(headerRow);

        var opsInCat = grouped[cat].sort(function(a, b) {
            return App.logic.calculatePlan(a).daysLeft - App.logic.calculatePlan(b).daysLeft;
        });

        opsInCat.forEach(function(op) {
            var plan = App.logic.calculatePlan(op);
            var statusClass = '';
            var statusText = '';
            if (plan.daysLeft < 0) {
                statusClass = 'overdue';
                statusText = '<i data-lucide="alert-triangle"></i> ' + Math.abs(plan.daysLeft) + ' дн.';
            } else if (plan.daysLeft <= 10) {
                statusClass = 'critical';
                statusText = plan.daysLeft + ' дн.';
            } else if (plan.daysLeft <= 20) {
                statusClass = 'warning';
                statusText = plan.daysLeft + ' дн.';
            } else if (plan.daysLeft <= 30) {
                statusClass = 'attention';
                statusText = plan.daysLeft + ' дн.';
            } else {
                statusText = plan.daysLeft + ' дн.';
            }

            var tr = document.createElement('tr');
            tr.dataset.rowIndex = op.rowIndex;
            tr.dataset.operationId = op.id;
            tr.innerHTML =
                '<td><strong>' + App.utils.escapeHtml(op.name) + '</strong></td>' +
                '<td>' + (op.lastDate ? App.utils.isoToDDMMYYYY(op.lastDate) : '—') + '</td>' +
                '<td>' + (op.lastMileage || '—') + '</td>' +
                '<td>' + (op.lastMotohours || '—') + '</td>' +
                '<td><strong>' + App.utils.isoToDDMMYYYY(plan.planDate) + '</strong><br><small>' + plan.planMileage + ' км</small></td>' +
                '<td><span class="status-badge ' + statusClass + '">' + statusText + '</span></td>' +
                '<td>' +
                    '<button class="icon-btn" data-action="add-record" data-op-id="' + op.id + '" data-op-name="' + App.utils.escapeHtml(op.name) + '"><i data-lucide="plus"></i></button>' +
                    '<button class="icon-btn" data-action="edit-op" data-op-id="' + op.id + '"><i data-lucide="pencil"></i></button>' +
                    '<button class="icon-btn" data-action="shopping-list" data-op-id="' + op.id + '"><i data-lucide="shopping-cart"></i></button>' +
                    '<button class="icon-btn" data-action="delete-op" data-op-id="' + op.id + '"><i data-lucide="trash-2"></i></button>' +
                '</td>';
            tbody.appendChild(tr);
        });
    });

    App.initIcons();
};

// ================== НОВЫЙ КАЛЕНДАРЬ ПЛАНИРОВЩИКА ==================
App.ui.pages.renderMaintenancePlan = function() {
    var container = document.getElementById('plan-container');
    if (!container) return;

    var period = document.getElementById('plan-period-select')?.value || 'month';
    var plan = App.logic.generateMaintenancePlan(period);
    var interval = App.logic.getPlanPeriodDates(period);
    var currentDate = new Date(interval.start);
    var displayMonth = currentDate.getMonth();
    var displayYear = currentDate.getFullYear();

    var eventMap = {};
    plan.forEach(function(op) {
        var planData = App.logic.calculatePlan(op);
        if (!planData.planDate) return;
        var dateKey = planData.planDate;
        if (!eventMap[dateKey]) eventMap[dateKey] = [];
        eventMap[dateKey].push({ op: op, plan: planData });
    });

    function renderCalendar(year, month) {
        var firstDay = new Date(year, month, 1).getDay();
        var daysInMonth = new Date(year, month + 1, 0).getDate();

        var html = '<div class="plan-calendar">';
        html += '<div class="cal-nav">';
        html += '<button class="cal-nav-btn" id="cal-prev"><i data-lucide="chevron-left"></i></button>';
        html += '<span class="cal-month">' + new Date(year, month).toLocaleString('ru', { month: 'long', year: 'numeric' }) + '</span>';
        html += '<button class="cal-nav-btn" id="cal-next"><i data-lucide="chevron-right"></i></button>';
        html += '</div>';
        html += '<div class="cal-weekdays">';
        ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'].forEach(function(d) {
            html += '<div class="cal-weekday">' + d + '</div>';
        });
        html += '</div>';
        html += '<div class="cal-grid">';

        for (var i = 0; i < firstDay; i++) {
            html += '<div class="cal-day empty"></div>';
        }

        for (var d = 1; d <= daysInMonth; d++) {
            var dateISO = year + '-' + String(month+1).padStart(2,'0') + '-' + String(d).padStart(2,'0');
            var events = eventMap[dateISO] || [];
            var hasEvents = events.length > 0;
            var todayClass = (dateISO === new Date().toISOString().split('T')[0]) ? ' today' : '';

            html += '<div class="cal-day' + todayClass + '" data-date="' + dateISO + '">';
            html += '<span class="cal-day-num">' + d + '</span>';
            if (hasEvents) {
                html += '<div class="cal-events">';
                events.forEach(function(ev) {
                    html += '<span class="cal-event-dot" title="' + App.utils.escapeHtml(ev.op.name) + '"></span>';
                });
                html += '</div>';
            }
            html += '</div>';
        }
        html += '</div>';
        html += '</div>';

        return html;
    }

    container.innerHTML = renderCalendar(displayYear, displayMonth);

    var currentYear = displayYear;
    var currentMonth = displayMonth;

    function updateCalendar() {
        container.innerHTML = renderCalendar(currentYear, currentMonth);
        bindListeners();
        App.initIcons();
    }

    function bindListeners() {
        var prevBtn = document.getElementById('cal-prev');
        var nextBtn = document.getElementById('cal-next');
        if (prevBtn) {
            prevBtn.addEventListener('click', function() {
                if (currentMonth === 0) {
                    currentMonth = 11;
                    currentYear--;
                } else {
                    currentMonth--;
                }
                updateCalendar();
            });
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', function() {
                if (currentMonth === 11) {
                    currentMonth = 0;
                    currentYear++;
                } else {
                    currentMonth++;
                }
                updateCalendar();
            });
        }

        var days = container.querySelectorAll('.cal-day:not(.empty)');
        days.forEach(function(dayEl) {
            dayEl.addEventListener('click', function() {
                var date = dayEl.dataset.date;
                var events = eventMap[date] || [];
                if (events.length === 0) return;

                var listHtml = '<ul style="margin-top:12px;">';
                events.forEach(function(ev) {
                    var op = ev.op;
                    var planData = ev.plan;
                    listHtml += '<li style="margin-bottom:8px;">';
                    listHtml += '<strong>' + App.utils.escapeHtml(op.name) + '</strong> (' + App.utils.escapeHtml(op.category) + ')<br>';
                    listHtml += 'План: ' + App.utils.isoToDDMMYYYY(planData.planDate) + ', ' + planData.planMileage + ' км';
                    listHtml += ' <button class="icon-btn" data-action="execute-plan" data-op-id="' + op.id + '" data-op-name="' + App.utils.escapeHtml(op.name) + '"><i data-lucide="check-circle"></i></button>';
                    listHtml += '</li>';
                });
                listHtml += '</ul>';
                App.ui.createModal('События на ' + App.utils.isoToDDMMYYYY(date), listHtml);
            });
        });
    }

    bindListeners();
    App.initIcons();

    var downloadContainer = document.createElement('div');
    downloadContainer.style.marginTop = '16px';
    downloadContainer.innerHTML = '<button id="download-ics-btn" class="primary-btn"><i data-lucide="calendar-download"></i> Скачать .ics</button>';
    container.appendChild(downloadContainer);
    document.getElementById('download-ics-btn').addEventListener('click', function() {
        var icsContent = generateICS(plan);
        var blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        var link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'vesta_plan_' + new Date().toISOString().slice(0,10) + '.ics';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        App.toast('Файл .ics скачан. Откройте его для импорта в календарь.', 'success');
    });
};

// Генерация ICS (только одно определение)
function generateICS(plan) {
    var now = new Date().toISOString().replace(/[-:]/g, '').slice(0,15) + 'Z';
    var ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Vesta Dashboard//RU\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\n';
    plan.forEach(function(op) {
        var planData = App.logic.calculatePlan(op);
        if (!planData.planDate) return;
        var dtStart = planData.planDate.replace(/-/g, '') + 'T090000';
        var dtEnd = planData.planDate.replace(/-/g, '') + 'T100000';
        var uid = op.id + '-vesta-' + planData.planDate;
        var summary = 'ТО: ' + op.name;

        var parts = App.store.parts.filter(function(p) {
            return p.operation === op.name || p.operation === op.category;
        });
        var partsList = '';
        if (parts.length > 0) {
            partsList = '\\n\\nСписок запчастей:\\n';
            parts.forEach(function(p) {
                var status = (p.inStock && p.inStock > 0) ? '✅' : '☐';
                partsList += status + ' ' + (p.oem || p.analog || p.operation) + (p.price ? ' (' + p.price + '₽)' : '') + '\\n';
            });
        }

        var description = 'Пробег: ' + planData.planMileage + ' км. Категория: ' + (op.category || '') + partsList;

        ics += 'BEGIN:VEVENT\r\n';
        ics += 'UID:' + uid + '\r\n';
        ics += 'DTSTART:' + dtStart + '\r\n';
        ics += 'DTEND:' + dtEnd + '\r\n';
        ics += 'SUMMARY:' + summary + '\r\n';
        ics += 'DESCRIPTION:' + description + '\r\n';
        ics += 'DTSTAMP:' + now + '\r\n';
        ics += 'END:VEVENT\r\n';
    });
    ics += 'END:VCALENDAR\r\n';
    return ics;
}

App.ui.pages.openServiceModal = function(opId, opName) {
    var op = App.store.operations.find(function(o) { return o.id == opId; });
    if (!op) return;
    var isOsago = (op.category === 'Документы' && op.name.indexOf('ОСАГО') !== -1);
    var today = App.utils.isoToDDMMYYYY(new Date().toISOString().split('T')[0]);

    var content = '<form id="service-form" enctype="multipart/form-data">' +
        '<input type="hidden" name="opId" value="' + opId + '"><p><strong>' + App.utils.escapeHtml(opName) + '</strong></p>' +
        '<label>Дата (ДД-ММ-ГГГГ)</label>' +
        '<input type="text" name="date" placeholder="ДД-ММ-ГГГГ" pattern="\\d{2}-\\d{2}-\\d{4}" required oninput="App.utils.applyDateMaskDDMMYYYY(event)" value="' + today + '">' +
        '<label>Пробег, км</label><input type="number" name="mileage" value="' + App.store.settings.currentMileage + '">' +
        '<label>Моточасы</label><input type="text" inputmode="decimal" name="motohours" value="' + App.store.settings.currentMotohours + '">';

    if (isOsago) {
        content += '<label>Стоимость полиса, ₽</label><input type="number" name="cost" step="0.01">' +
            '<label>Ссылка на файл (Google Drive)</label><input type="url" name="fileLink" placeholder="https://drive.google.com/...">' +
            '<label>Срок действия (мес.)</label><input type="number" name="osagoMonths" value="12" min="1" max="12">';
    } else {
        content += '<h4><i data-lucide="wrench"></i> Запчасти</h4><label>Стоимость, ₽</label><input type="number" name="cost" step="0.01">' +
            '<h4><i data-lucide="wrench"></i> Работы</h4><label>Стоимость, ₽</label><input type="number" name="workCost" step="0.01">' +
            '<label><input type="checkbox" name="isDIY" value="true"> Сделал сам</label>';
    }

    content += '<h4><i data-lucide="camera"></i> Фото</h4>' +
        '<div id="drop-area" class="drop-area"><i data-lucide="upload-cloud"></i> <span class="drop-text">Перетащите фото сюда или кликните для выбора</span><input type="file" id="photo-input" name="photo" accept="image/*" multiple style="display:none;"></div>' +
        '<div id="photo-preview" class="photo-preview"></div>' +
        '<label>Примечание</label><input type="text" name="notes">' +
        '<div class="modal-actions"><button type="submit" class="primary-btn">Сохранить</button><button type="button" class="cancel-btn secondary-btn">Отмена</button></div>' +
        '</form>';

    var modal = App.ui.createModal('➕ Выполнить ТО', content);
    var dropArea = modal.querySelector('#drop-area');
    var fileInput = modal.querySelector('#photo-input');
    var previewContainer = modal.querySelector('#photo-preview');
    var selectedFiles = [];

    function updatePreview(files, container) {
        container.innerHTML = '';
        files.forEach(function(file, idx) {
            var reader = new FileReader();
            reader.onload = function(ev) {
                var img = document.createElement('img');
                img.src = ev.target.result;
                img.title = file.name;
                container.appendChild(img);
            };
            reader.readAsDataURL(file);
        });
    }

    dropArea.addEventListener('click', function() { fileInput.click(); });
    dropArea.addEventListener('dragover', function(e) { e.preventDefault(); dropArea.classList.add('drag-over'); });
    dropArea.addEventListener('dragleave', function() { dropArea.classList.remove('drag-over'); });
    dropArea.addEventListener('drop', function(e) {
        e.preventDefault();
        dropArea.classList.remove('drag-over');
        var files = Array.from(e.dataTransfer.files).filter(function(f) { return f.type.startsWith('image/'); });
        if (files.length) {
            selectedFiles = files;
            updatePreview(selectedFiles, previewContainer);
        }
    });
    fileInput.addEventListener('change', function(e) {
        if (e.target.files.length) {
            selectedFiles = Array.from(e.target.files);
            updatePreview(selectedFiles, previewContainer);
        }
    });

    var form = modal.querySelector('#service-form');
    form.onsubmit = function(e) {
        e.preventDefault();
        var formEl = e.target;
        var mileage = App.utils.validateNumberInput(formEl.querySelector('[name="mileage"]'), false);
        var motohours = App.utils.validateNumberInput(formEl.querySelector('[name="motohours"]'), true, true);
        var cost = App.utils.validateNumberInput(formEl.querySelector('[name="cost"]'), true, true);
        var workCost = App.utils.validateNumberInput(formEl.querySelector('[name="workCost"]'), true, true);
        if (mileage === null) return;

        var formattedDate = App.utils.ddmmYYYYtoISO(formEl.querySelector('[name="date"]').value);
        if (!formattedDate) {
            App.toast('Неверный формат даты', 'error');
            return;
        }

        var refPoint = {
            purchaseDate: App.store.purchaseDate,
            baseMileage: App.store.baseMileage || 0,
            baseMotohours: App.store.baseMotohours || 0
        };
        var validationError = App.logic.validateMaintenanceRecord(
    formattedDate, mileage, motohours, refPoint, App.store.serviceRecords,
    opName, op.category
);
        if (validationError) {
            App.toast(validationError, 'error');
            return;
        }

        var data = new FormData(formEl);
        modal.remove();

        var notes = data.get('notes') || '';
        var isDIY = data.get('isDIY') === 'true';

        var uploadPromises = [];
        if (selectedFiles.length > 0) {
            for (var i = 0; i < selectedFiles.length; i++) {
                uploadPromises.push(App.supa.uploadPhoto(selectedFiles[i]).catch(function(err) {
                    console.error('Photo upload error:', err);
                    return '';
                }));
            }
        }

        // === Офлайн-логика ===
        if (!navigator.onLine) {
            var offlineRecord = {
                operation_id: op.id,
                date: formattedDate,
                mileage: mileage,
                motohours: motohours || 0,
                parts_cost: cost || 0,
                work_cost: workCost || 0,
                is_diy: isDIY,
                notes: notes,
                photo_url: ''
            };
            App.store.serviceRecords.unshift(offlineRecord);
            App.store.addPendingAction({
                type: 'service',
                opId: op.id,
                date: formattedDate,
                mileage: mileage,
                motohours: motohours || 0,
                partsCost: cost || 0,
                workCost: workCost || 0,
                isDIY: isDIY,
                notes: notes,
                photoUrl: ''
            });
            op.lastDate = formattedDate;
            op.lastMileage = mileage;
            op.lastMotohours = motohours || 0;
            App.store.saveToLocalStorage();
            App.toast('Запись сохранена локально. Синхронизируется при подключении к сети.', 'warning');
            // Обновляем все представления
            if (typeof App.ui.pages.renderTOTable === 'function') App.ui.pages.renderTOTable();
            if (typeof App.ui.pages.renderMaintenancePlan === 'function') App.ui.pages.renderMaintenancePlan();
            if (typeof App.ui.pages.renderTop5Widget === 'function') App.ui.pages.renderTop5Widget();
            return;
        }

        // Онлайн-сохранение
        Promise.all(uploadPromises).then(function(photoUrls) {
            var photoUrl = photoUrls.filter(function(url) { return url !== ''; })[0] || '';
            var fullNotes = notes;
            if (isOsago) fullNotes = 'ОСАГО. Стоимость: ' + cost + ' ₽. Срок: ' + (data.get('osagoMonths') || '12') + ' мес. Ссылка: ' + (data.get('fileLink') || '') + '. ' + notes;
            if (photoUrls.length) fullNotes += '\nФото: ' + photoUrls.join(', ');

            if (App.config.USE_SUPABASE) {
                var record = {
                    operation_id: op.id,
                    date: formattedDate,
                    mileage: mileage,
                    motohours: motohours || 0,
                    parts_cost: cost || 0,
                    work_cost: workCost || 0,
                    is_diy: isDIY,
                    notes: fullNotes,
                    photo_url: photoUrl
                };
                App.storage.addHistoryRecord(record)
                    .then(function() {
                        op.lastDate = formattedDate;
                        op.lastMileage = mileage;
                        op.lastMotohours = motohours || 0;
                        return App.storage.saveOperation(op);
                    })
                    .then(function() {
                        App.toast('ТО успешно выполнено', 'success');
                        App.storage.loadAllData();
                        if (typeof App.ui.pages.renderMaintenancePlan === 'function') App.ui.pages.renderMaintenancePlan();
                        if (typeof App.ui.pages.renderTop5Widget === 'function') App.ui.pages.renderTop5Widget();
                    }).catch(function(err) {
                        console.error(err);
                        App.toast('Ошибка сохранения ТО', 'error');
                    });
            } else {
                App.logic.addServiceRecord(opId, formattedDate, mileage, motohours, cost, workCost, isDIY, fullNotes, photoUrl)
                    .then(function() {
                        var normalizedMainName = App.utils.normalizeOperationName(opName, App.store.operations);
                        var partsForOp = App.store.parts.filter(function(p) {
                            var normPartOp = App.utils.normalizeOperationName(p.operation, App.store.operations);
                            return normPartOp === normalizedMainName || p.operation === op.category;
                        });
                        partsForOp.forEach(function(part) {
                            var stock = part.inStock || 0;
                            if (stock > 0) {
                                part.inStock = stock - 1;
                                App.storage.savePart(part);
                            }
                        });
                        App.logic.addDependentOperations(opName, opId, formattedDate, mileage, motohours, 'Автоматически');
                        App.toast('ТО успешно выполнено', 'success');
                        if (typeof App.ui.pages.renderMaintenancePlan === 'function') App.ui.pages.renderMaintenancePlan();
                        if (typeof App.ui.pages.renderTop5Widget === 'function') App.ui.pages.renderTop5Widget();
                    })
                    .catch(function(error) {
                        console.error(error);
                        App.toast('Ошибка сохранения', 'error');
                    });
            }
        });
    };

    modal.querySelector('.cancel-btn').onclick = function() { modal.remove(); };
};

App.ui.pages.openOperationForm = function(op) {
    var isEdit = !!op;
    var categoryOptions = ['ДВС', 'Вариатор', 'Тормозная система', 'Подвеска', 'Зажигание', 'Охлаждение', 'ГРМ', 'Навесное', 'Трансмиссия', 'Топливная система', 'Сезонное', 'Документы', 'Прочее'];
    var optionsHtml = '';
    categoryOptions.forEach(function(cat) {
        var selected = (op && op.category === cat) ? ' selected' : '';
        optionsHtml += '<option value="' + cat + '"' + selected + '>' + cat + '</option>';
    });

    var content = '<form id="op-form"><input type="hidden" name="id" value="' + (op ? op.id : '') + '"><input type="hidden" name="rowIndex" value="' + (op ? op.rowIndex : '') + '">' +
        '<label>Категория</label><select name="category" required>' + optionsHtml + '</select>' +
        '<label>Название</label><input type="text" name="name" value="' + App.utils.escapeHtml(op ? op.name : '') + '" required>' +
        '<label>Интервал, км</label><input type="number" name="km" value="' + (op ? op.intervalKm : '') + '">' +
        '<label>Интервал, мес</label><input type="number" name="months" value="' + (op ? op.intervalMonths : '') + '">' +
        '<label>Интервал, моточасов</label><input type="number" name="moto" value="' + (op ? op.intervalMotohours : '') + '">' +
        '<div class="modal-actions"><button type="submit" class="primary-btn">Сохранить</button><button type="button" class="cancel-btn secondary-btn">Отмена</button></div>' +
        '</form>';

    var modal = App.ui.createModal(isEdit ? '✏️ Редактировать' : '➕ Новая операция', content);
    var form = modal.querySelector('#op-form');
    form.onsubmit = function(e) {
        e.preventDefault();
        var d = Object.fromEntries(new FormData(form));
        modal.remove();
        App.logic.saveOperation(d).catch(function(err) { console.warn(err); });
    };
    modal.querySelector('.cancel-btn').onclick = function() { modal.remove(); };
};

App.ui.pages.generateShoppingList = function(opId) {
    var op = App.store.operations.find(function(o) { return o.id == opId; });
    if (!op) return;
    var items = App.store.parts.filter(function(p) { return p.operation === op.name || p.operation === op.category; });
    if (!items.length) { alert('Нет запчастей для этой операции'); return; }
    var list = '🛒 ' + op.name + ':\n';
    items.forEach(function(p) {
        var stock = p.inStock || 0;
        var location = p.location ? ' (' + p.location + ')' : '';
        if (stock > 0) {
            list += '- ' + (p.oem || p.analog) + ' ' + (p.price ? p.price + '₽' : '') + ' — ✅ есть на складе: ' + stock + ' шт.' + location + '\n';
        } else {
            list += '- ' + (p.oem || p.analog) + ' ' + (p.price ? p.price + '₽' : '') + ' — ❌ нужно купить\n';
        }
    });
    alert(list);
};
