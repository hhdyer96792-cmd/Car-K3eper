// src/ui/pages/history.js
window.App = window.App || {};
App.ui = App.ui || {};
App.ui.pages = App.ui.pages || {};

// Инициализация фильтров (заполнение селектов)
App.ui.pages.initHistoryFilters = function() {
    App.ui.pages.populateHistoryOperationFilter();
    App.ui.pages.populateHistoryCategoryFilter();
    App.ui.pages.populateHistoryExecutorFilter();
    App.ui.pages.bindHistoryFilterEvents();
};

// Заполнение селекта операций
App.ui.pages.populateHistoryOperationFilter = function() {
    var select = document.getElementById('history-operation-filter');
    if (!select) return;
    var current = select.value;
    select.innerHTML = '<option value="">Все операции</option>';
    var seen = {};
    App.store.operations.forEach(function(op) {
        if (!seen[op.name]) {
            seen[op.name] = true;
            select.innerHTML += '<option value="' + op.name + '">' + App.utils.escapeHtml(op.name) + '</option>';
        }
    });
    if (current) select.value = current;
};

// Заполнение селекта категорий
App.ui.pages.populateHistoryCategoryFilter = function() {
    var select = document.getElementById('history-category-filter');
    if (!select) return;
    var current = select.value;
    select.innerHTML = '<option value="">Все категории</option>';
    var cats = {};
    App.store.operations.forEach(function(op) {
        if (op.category && !cats[op.category]) {
            cats[op.category] = true;
            select.innerHTML += '<option value="' + op.category + '">' + App.utils.escapeHtml(op.category) + '</option>';
        }
    });
    if (current) select.value = current;
};

// Заполнение селекта исполнителей
App.ui.pages.populateHistoryExecutorFilter = function() {
    var select = document.getElementById('history-executor-filter');
    if (!select) return;
    var current = select.value;
    select.innerHTML = '<option value="">Все исполнители</option>';
    var users = {};
    App.store.serviceRecords.forEach(function(r) {
        if (r.user_id && !users[r.user_id]) {
            users[r.user_id] = true;
            select.innerHTML += '<option value="' + r.user_id + '">' + r.user_id.substring(0,8) + '</option>';
        }
    });
    if (current) select.value = current;
};

// Привязка событий фильтров
App.ui.pages.bindHistoryFilterEvents = function() {
    var filters = [
        'history-period-select', 'history-operation-filter', 'history-category-filter', 'history-executor-filter',
        'history-sort-order', 'history-diy-only'
    ];
    filters.forEach(function(id) {
        var el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', function() {
                App.ui.pages.renderHistoryCards();
                App.ui.pages.updateMobilePills();
            });
        }
    });
    ['history-search', 'history-cost-min', 'history-cost-max', 'history-mileage-min', 'history-mileage-max'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', function() {
                App.ui.pages.renderHistoryCards();
                App.ui.pages.updateMobilePills();
            });
        }
    });
    var resetBtn = document.getElementById('history-reset-filters');
    if (resetBtn) {
        resetBtn.addEventListener('click', function() {
            ['history-period-select','history-operation-filter','history-category-filter','history-executor-filter',
             'history-search','history-diy-only','history-cost-min','history-cost-max','history-mileage-min','history-mileage-max','history-sort-order'
            ].forEach(function(id) {
                var el = document.getElementById(id);
                if (el) {
                    if (el.type === 'checkbox') el.checked = false;
                    else el.value = '';
                }
            });
            document.getElementById('history-sort-order').value = 'date-desc';
            App.ui.pages.renderHistoryCards();
            App.ui.pages.updateMobilePills();
        });
    }
};

// Получение отфильтрованных записей с новыми фильтрами
App.ui.pages.getFilteredHistory = function() {
    var period = document.getElementById('history-period-select')?.value || 'all';
    var opFilter = document.getElementById('history-operation-filter')?.value || '';
    var catFilter = document.getElementById('history-category-filter')?.value || '';
    var executorFilter = document.getElementById('history-executor-filter')?.value || '';
    var searchText = (document.getElementById('history-search')?.value || '').toLowerCase();
    var diyOnly = document.getElementById('history-diy-only')?.checked || false;
    var costMin = parseFloat(document.getElementById('history-cost-min')?.value) || 0;
    var costMax = parseFloat(document.getElementById('history-cost-max')?.value) || Infinity;
    var mileageMin = parseFloat(document.getElementById('history-mileage-min')?.value) || 0;
    var mileageMax = parseFloat(document.getElementById('history-mileage-max')?.value) || Infinity;
    var sort = document.getElementById('history-sort-order')?.value || 'date-desc';

    var filtered = App.store.serviceRecords.slice();

    if (period !== 'all') {
        var start = App.logic.getStartDateForPeriod(period);
        if (start) {
            filtered = filtered.filter(function(r) {
                var d = r.date ? new Date(r.date) : null;
                return d && d >= start;
            });
        }
    }

    if (opFilter) {
        filtered = filtered.filter(function(r) {
            var op = App.store.operations.find(function(o) { return o.id == r.operation_id; });
            return op && op.name === opFilter;
        });
    }

    if (catFilter) {
        filtered = filtered.filter(function(r) {
            var op = App.store.operations.find(function(o) { return o.id == r.operation_id; });
            return op && op.category === catFilter;
        });
    }

    if (executorFilter) {
        filtered = filtered.filter(function(r) { return r.user_id === executorFilter; });
    }

    if (searchText) {
        filtered = filtered.filter(function(r) {
            var op = App.store.operations.find(function(o) { return o.id == r.operation_id; });
            var opName = op ? op.name.toLowerCase() : '';
            var notes = (r.notes || '').toLowerCase();
            return opName.indexOf(searchText) !== -1 || notes.indexOf(searchText) !== -1;
        });
    }

    if (diyOnly) {
        filtered = filtered.filter(function(r) { return r.is_diy === true || r.is_diy === 'TRUE'; });
    }

    filtered = filtered.filter(function(r) {
        var cost = (Number(r.parts_cost) || 0) + (Number(r.work_cost) || 0);
        return cost >= costMin && cost <= costMax;
    });

    filtered = filtered.filter(function(r) {
        var m = parseFloat(r.mileage) || 0;
        return m >= mileageMin && m <= mileageMax;
    });

    switch (sort) {
        case 'date-asc': filtered.sort(function(a,b) { return (a.date||'').localeCompare(b.date||''); }); break;
        case 'cost-desc': filtered.sort(function(a,b) { return ((Number(b.parts_cost)||0)+(Number(b.work_cost)||0)) - ((Number(a.parts_cost)||0)+(Number(a.work_cost)||0)); }); break;
        case 'cost-asc': filtered.sort(function(a,b) { return ((Number(a.parts_cost)||0)+(Number(a.work_cost)||0)) - ((Number(b.parts_cost)||0)+(Number(b.work_cost)||0)); }); break;
        default: filtered.sort(function(a,b) { return (b.date||'').localeCompare(a.date||''); }); break;
    }

    return filtered;
};

// Рендер карточек
App.ui.pages.renderHistoryCards = function() {
    var container = document.getElementById('history-cards-container');
    if (!container) return;

    var filtered = App.ui.pages.getFilteredHistory();
    if (filtered.length === 0) {
        container.innerHTML = '<p class="hint">Нет записей, соответствующих фильтрам.</p>';
        return;
    }

    var isMobile = window.innerWidth < 768;
    var html = '';

    filtered.forEach(function(record) {
        var op = App.store.operations.find(function(o) { return o.id == record.operation_id; }) || { name: 'Неизвестно' };
        var diyFlag = record.is_diy === 'TRUE' || record.is_diy === true;

        if (isMobile) {
            html += '<div class="history-card-mobile">';
            html += '<div class="header"><strong>' + App.utils.escapeHtml(record.date || '') + '</strong></div>';
            html += '<div class="operation">' + App.utils.escapeHtml(op.name) + '</div>';
            html += '<div class="details">';
            html += 'Пробег: ' + (record.mileage || '—') + ' км · Моточасы: ' + (record.motohours || '—') + '<br>';
            html += 'Запчасти: ' + (record.parts_cost || '0') + ' ₽ · Работа: ' + (record.work_cost || '0') + ' ₽ · ';
            html += 'DIY: ' + (diyFlag ? '<i data-lucide="check"></i>' : '<i data-lucide="x"></i>') + '<br>';
            html += 'Исполнитель: ' + (record.user_id ? record.user_id.substring(0,8) : '—') + '<br>';
            if (record.notes) html += 'Прим.: ' + App.utils.escapeHtml(record.notes);
            html += '</div>';
            html += '<button class="icon-btn mobile-toggle-btn"><i data-lucide="more-vertical"></i></button>';
            html += '<div class="actions">';
            html += '<button class="icon-btn" data-action="edit-history" data-row="' + record.rowIndex + '"><i data-lucide="pencil"></i></button>';
            html += '<button class="icon-btn" data-action="delete-history" data-row="' + record.rowIndex + '"><i data-lucide="trash-2"></i></button>';
            html += '</div>';
            html += '</div>';
        } else {
            html += '<div class="history-card">';
            html += '<div class="history-card-header"><span class="date">' + App.utils.escapeHtml(record.date || '') + '</span><span class="operation">' + App.utils.escapeHtml(op.name) + '</span></div>';
            html += '<div class="history-card-grid">';
            html += '<div><strong>Пробег</strong><br>' + (record.mileage || '—') + ' км</div>';
            html += '<div><strong>Моточасы</strong><br>' + (record.motohours || '—') + '</div>';
            html += '<div><strong>Запчасти</strong><br>' + (record.parts_cost || '0') + ' ₽</div>';
            html += '<div><strong>Работа</strong><br>' + (record.work_cost || '0') + ' ₽</div>';
            html += '<div><strong>DIY</strong><br>' + (diyFlag ? '<i data-lucide="check"></i> Да' : '<i data-lucide="x"></i> Нет') + '</div>';
            html += '</div>';
            html += '<div class="history-card-footer">';
            html += '<span>Исполнитель: ' + (record.user_id ? record.user_id.substring(0,8) : '—') + (record.notes ? ' | Прим.: ' + App.utils.escapeHtml(record.notes) : '') + '</span>';
            html += '<div class="history-card-actions">';
            html += '<button class="icon-btn" data-action="edit-history" data-row="' + record.rowIndex + '"><i data-lucide="pencil"></i></button>';
            html += '<button class="icon-btn" data-action="delete-history" data-row="' + record.rowIndex + '"><i data-lucide="trash-2"></i></button>';
            html += '</div>';
            html += '</div>';
            html += '</div>';
        }
    });

    container.innerHTML = html;

    if (isMobile) {
        container.querySelectorAll('.mobile-toggle-btn').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                var card = btn.closest('.history-card-mobile');
                if (card) {
                    card.classList.toggle('expanded');
                    var icon = btn.querySelector('i');
                    if (icon) {
                        icon.setAttribute('data-lucide', card.classList.contains('expanded') ? 'more-horizontal' : 'more-vertical');
                        App.initIcons();
                    }
                }
            });
        });
    }

    App.initIcons();
    if (isMobile) App.ui.pages.updateMobilePills();
};

// Мобильные пилюли с кнопками сброса
App.ui.pages.updateMobilePills = function() {
    var pillsContainer = document.getElementById('history-pills');
    if (!pillsContainer) return;

    var period = document.getElementById('history-period-select')?.value;
    var op = document.getElementById('history-operation-filter')?.value;
    var cat = document.getElementById('history-category-filter')?.value;
    var exec = document.getElementById('history-executor-filter')?.value;
    var search = document.getElementById('history-search')?.value;
    var diy = document.getElementById('history-diy-only')?.checked;
    var costMin = document.getElementById('history-cost-min')?.value;
    var costMax = document.getElementById('history-cost-max')?.value;
    var mileageMin = document.getElementById('history-mileage-min')?.value;
    var mileageMax = document.getElementById('history-mileage-max')?.value;
    var sort = document.getElementById('history-sort-order')?.value;

    // Объект фильтров: { id: значение, label: 'Название', resetValue: 'значение по умолчанию' }
    var pills = [];
    if (period && period !== 'all') pills.push({ id: 'history-period-select', value: period, label: 'Период: ' + period, reset: 'all' });
    if (op) pills.push({ id: 'history-operation-filter', value: op, label: 'Операция: ' + op, reset: '' });
    if (cat) pills.push({ id: 'history-category-filter', value: cat, label: 'Категория: ' + cat, reset: '' });
    if (exec) pills.push({ id: 'history-executor-filter', value: exec, label: 'Исполнитель: ' + exec.substring(0,8), reset: '' });
    if (search) pills.push({ id: 'history-search', value: search, label: 'Поиск: ' + search, reset: '' });
    if (diy) pills.push({ id: 'history-diy-only', value: true, label: 'Только DIY', reset: false });
    if (costMin || costMax) pills.push({ id: ['history-cost-min','history-cost-max'], value: [costMin, costMax], label: 'Цена: ' + (costMin||'0') + '-' + (costMax||'∞'), reset: ['',''] });
    if (mileageMin || mileageMax) pills.push({ id: ['history-mileage-min','history-mileage-max'], value: [mileageMin, mileageMax], label: 'Пробег: ' + (mileageMin||'0') + '-' + (mileageMax||'∞'), reset: ['',''] });
    if (sort && sort !== 'date-desc') pills.push({ id: 'history-sort-order', value: sort, label: 'Сорт: ' + sort, reset: 'date-desc' });

    var html = '';
    pills.forEach(function(p) {
        html += '<span class="pill">' + App.utils.escapeHtml(p.label) +
                '<button class="pill-remove" data-filter-id=\'' + JSON.stringify(p.id) + '\' data-reset=\'' + JSON.stringify(p.reset) + '\'><i data-lucide="x"></i></button></span>';
    });
    pillsContainer.innerHTML = html;

    // Обработчики удаления пилюль
    pillsContainer.querySelectorAll('.pill-remove').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            var filterId = JSON.parse(this.dataset.filterId);
            var resetValue = JSON.parse(this.dataset.reset);
            if (Array.isArray(filterId)) {
                filterId.forEach(function(id, idx) {
                    var el = document.getElementById(id);
                    if (el) {
                        if (el.type === 'checkbox') el.checked = resetValue[idx];
                        else el.value = resetValue[idx];
                    }
                });
            } else {
                var el = document.getElementById(filterId);
                if (el) {
                    if (el.type === 'checkbox') el.checked = resetValue;
                    else el.value = resetValue;
                }
            }
            App.ui.pages.renderHistoryCards();
            App.ui.pages.updateMobilePills();
        });
    });
};

// Модальное окно фильтров (для мобильных)
App.ui.pages.openHistoryFiltersModal = function() {
    var content =
        '<div class="filters-modal">' +
            '<div class="filter-row"><label>Период <select id="modal-history-period-select">' +
                '<option value="all">Весь период</option><option value="year">Последний год</option><option value="6months">Последние 6 месяцев</option><option value="quarter">Последний квартал</option><option value="month">Последний месяц</option><option value="week">Последняя неделя</option>' +
            '</select></label></div>' +
            '<div class="filter-row"><label>Операция <select id="modal-history-operation-filter"><option value="">Все операции</option></select></label></div>' +
            '<div class="filter-row"><label>Категория <select id="modal-history-category-filter"><option value="">Все категории</option></select></label></div>' +
            '<div class="filter-row"><label>Исполнитель <select id="modal-history-executor-filter"><option value="">Все исполнители</option></select></label></div>' +
            '<div class="filter-row"><input type="text" id="modal-history-search" placeholder="Поиск..."></div>' +
            '<div class="filter-row"><label><input type="checkbox" id="modal-history-diy-only"> Только DIY</label></div>' +
            '<div class="filter-row"><input type="number" id="modal-history-cost-min" placeholder="Цена от"><input type="number" id="modal-history-cost-max" placeholder="Цена до"></div>' +
            '<div class="filter-row"><input type="number" id="modal-history-mileage-min" placeholder="Пробег от"><input type="number" id="modal-history-mileage-max" placeholder="Пробег до"></div>' +
            '<div class="filter-row"><select id="modal-history-sort-order"><option value="date-desc">По дате (новые)</option><option value="date-asc">По дате (старые)</option><option value="cost-desc">По стоимости (дороже)</option><option value="cost-asc">По стоимости (дешевле)</option></select></div>' +
            '<div class="modal-actions"><button id="apply-mobile-filters" class="primary-btn">Применить</button><button id="reset-mobile-filters" class="secondary-btn">Сбросить</button></div>' +
        '</div>';

    var modal = App.ui.createModal('Фильтры', content);

    // Скопировать текущие значения
    var current = {
        period: document.getElementById('history-period-select')?.value,
        op: document.getElementById('history-operation-filter')?.value,
        cat: document.getElementById('history-category-filter')?.value,
        exec: document.getElementById('history-executor-filter')?.value,
        search: document.getElementById('history-search')?.value,
        diy: document.getElementById('history-diy-only')?.checked,
        costMin: document.getElementById('history-cost-min')?.value,
        costMax: document.getElementById('history-cost-max')?.value,
        mileageMin: document.getElementById('history-mileage-min')?.value,
        mileageMax: document.getElementById('history-mileage-max')?.value,
        sort: document.getElementById('history-sort-order')?.value
    };

    document.getElementById('modal-history-period-select').value = current.period || 'all';
    document.getElementById('modal-history-operation-filter').value = current.op || '';
    document.getElementById('modal-history-category-filter').value = current.cat || '';
    document.getElementById('modal-history-executor-filter').value = current.exec || '';
    document.getElementById('modal-history-search').value = current.search || '';
    document.getElementById('modal-history-diy-only').checked = current.diy;
    document.getElementById('modal-history-cost-min').value = current.costMin || '';
    document.getElementById('modal-history-cost-max').value = current.costMax || '';
    document.getElementById('modal-history-mileage-min').value = current.mileageMin || '';
    document.getElementById('modal-history-mileage-max').value = current.mileageMax || '';
    document.getElementById('modal-history-sort-order').value = current.sort || 'date-desc';

    App.ui.pages.populateModalHistorySelects(modal);

    document.getElementById('apply-mobile-filters').addEventListener('click', function() {
        document.getElementById('history-period-select').value = document.getElementById('modal-history-period-select').value;
        document.getElementById('history-operation-filter').value = document.getElementById('modal-history-operation-filter').value;
        document.getElementById('history-category-filter').value = document.getElementById('modal-history-category-filter').value;
        document.getElementById('history-executor-filter').value = document.getElementById('modal-history-executor-filter').value;
        document.getElementById('history-search').value = document.getElementById('modal-history-search').value;
        document.getElementById('history-diy-only').checked = document.getElementById('modal-history-diy-only').checked;
        document.getElementById('history-cost-min').value = document.getElementById('modal-history-cost-min').value;
        document.getElementById('history-cost-max').value = document.getElementById('modal-history-cost-max').value;
        document.getElementById('history-mileage-min').value = document.getElementById('modal-history-mileage-min').value;
        document.getElementById('history-mileage-max').value = document.getElementById('modal-history-mileage-max').value;
        document.getElementById('history-sort-order').value = document.getElementById('modal-history-sort-order').value;
        modal.remove();
        App.ui.pages.renderHistoryCards();
        App.ui.pages.updateMobilePills();
    });

    document.getElementById('reset-mobile-filters').addEventListener('click', function() {
        document.getElementById('modal-history-period-select').value = 'all';
        document.getElementById('modal-history-operation-filter').value = '';
        document.getElementById('modal-history-category-filter').value = '';
        document.getElementById('modal-history-executor-filter').value = '';
        document.getElementById('modal-history-search').value = '';
        document.getElementById('modal-history-diy-only').checked = false;
        document.getElementById('modal-history-cost-min').value = '';
        document.getElementById('modal-history-cost-max').value = '';
        document.getElementById('modal-history-mileage-min').value = '';
        document.getElementById('modal-history-mileage-max').value = '';
        document.getElementById('modal-history-sort-order').value = 'date-desc';
    });
};

App.ui.pages.populateModalHistorySelects = function(modal) {
    var opSelect = modal.querySelector('#modal-history-operation-filter');
    if (opSelect) {
        opSelect.innerHTML = '<option value="">Все операции</option>';
        var seen = {};
        App.store.operations.forEach(function(op) {
            if (!seen[op.name]) {
                seen[op.name] = true;
                opSelect.innerHTML += '<option value="' + op.name + '">' + App.utils.escapeHtml(op.name) + '</option>';
            }
        });
    }
    var catSelect = modal.querySelector('#modal-history-category-filter');
    if (catSelect) {
        catSelect.innerHTML = '<option value="">Все категории</option>';
        var cats = {};
        App.store.operations.forEach(function(op) {
            if (op.category && !cats[op.category]) {
                cats[op.category] = true;
                catSelect.innerHTML += '<option value="' + op.category + '">' + App.utils.escapeHtml(op.category) + '</option>';
            }
        });
    }
    var execSelect = modal.querySelector('#modal-history-executor-filter');
    if (execSelect) {
        execSelect.innerHTML = '<option value="">Все исполнители</option>';
        var users = {};
        App.store.serviceRecords.forEach(function(r) {
            if (r.user_id && !users[r.user_id]) {
                users[r.user_id] = true;
                execSelect.innerHTML += '<option value="' + r.user_id + '">' + r.user_id.substring(0,8) + '</option>';
            }
        });
    }
};

// Существующие функции
App.ui.pages.openHistoryEdit = function(rowIndex) {
    var record = App.store.serviceRecords.find(function(r) { return r.rowIndex == rowIndex; });
    if (!record) return;

    var content =
        '<form id="history-edit-form">' +
            '<input type="hidden" name="rowIndex" value="' + rowIndex + '">' +
            '<label>Дата (ГГГГ-ММ-ДД)</label>' +
            '<input type="text" name="date" value="' + (record.date || '') + '" placeholder="ГГГГ-ММ-ДД" pattern="\\d{4}-\\d{2}-\\d{2}" required oninput="App.utils.applyDateMaskISO(event)">' +
            '<label>Пробег, км</label><input type="number" name="mileage" value="' + (record.mileage || '') + '">' +
            '<label>Моточасы</label><input type="text" name="motohours" value="' + (record.motohours || '') + '">' +
            '<label>Запчасти, ₽</label><input type="number" name="partsCost" value="' + (record.parts_cost || '') + '" step="0.01">' +
            '<label>Работа, ₽</label><input type="number" name="workCost" value="' + (record.work_cost || '') + '" step="0.01">' +
            '<label><input type="checkbox" name="isDIY" value="true" ' + (record.is_diy === true || record.is_diy === 'TRUE' ? 'checked' : '') + '> Сделал сам</label>' +
            '<label>Примечание</label><input type="text" name="notes" value="' + App.utils.escapeHtml(record.notes || '') + '">' +
            '<div class="modal-actions"><button type="submit" class="primary-btn">Сохранить</button><button type="button" class="cancel-btn secondary-btn">Отмена</button></div>' +
        '</form>';

    var modal = App.ui.createModal('<i data-lucide="pencil"></i> Редактировать запись истории', content);
    var form = modal.querySelector('#history-edit-form');
    form.onsubmit = function(ev) {
        ev.preventDefault();
        var formEl = ev.target;
        var mileage = App.utils.validateNumberInput(formEl.querySelector('[name="mileage"]'), false);
        var partsCost = App.utils.validateNumberInput(formEl.querySelector('[name="partsCost"]'), true, true);
        var workCost = App.utils.validateNumberInput(formEl.querySelector('[name="workCost"]'), true, true);
        if (mileage === null) return;

        var data = new FormData(formEl);
        var newValues = {
            id: record.id,
            uuid: record.uuid,
            operation_id: record.operation_id,
            date: data.get('date'),
            mileage: mileage,
            motohours: data.get('motohours'),
            parts_cost: partsCost,
            work_cost: workCost,
            is_diy: data.get('isDIY') === 'true',
            notes: data.get('notes'),
            photo_url: record.photo_url,
            timestamp: new Date().toISOString()
        };
        modal.remove();
        App.storage.updateHistoryRecord(rowIndex, newValues).then(function() {
            return App.storage.loadAllData();
        }).then(function() {
            App.toast('Запись истории обновлена', 'success');
        }).catch(function(e) {
            console.error('Ошибка сохранения:', e);
            App.toast('Не удалось сохранить', 'error');
        });
    };
    modal.querySelector('.cancel-btn').onclick = function() { modal.remove(); };
};

App.ui.pages.deleteHistoryEntry = function(rowIndex) {
    App.storage.deleteHistoryRecord(rowIndex).then(function() {
        App.storage.loadAllData().then(function() {
            App.ui.pages.renderHistoryCards();
        });
        App.toast('Запись удалена', 'success');
    }).catch(function(err) {
        console.error(err);
        App.toast('Не удалось удалить запись (недостаточно прав)', 'error');
    });
};