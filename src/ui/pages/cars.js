// src/ui/pages/cars.js
window.App = window.App || {};
App.ui.pages = App.ui.pages || {};

App.ui.pages.renderCarSelector = function() {
    var container = document.getElementById('car-selector-container');
    if (!container) return;
    var html = '<select id="car-select"><option value="">-- Выберите авто --</option>';
    App.store.cars.forEach(function(car) {
        var selected = car.id == App.store.activeCarId ? ' selected' : '';
        html += '<option value="' + car.id + '"' + selected + '>' + App.utils.escapeHtml(car.name) + '</option>';
    });
    html += '</select>';
    container.innerHTML = html;

    document.getElementById('car-select').addEventListener('change', function() {
        var carId = this.value;
        if (carId) {
            App.store.setActiveCar(carId);
            if (App.realtime && App.realtime.subscribeToCar) {
                App.realtime.subscribeToCar(carId);
            }
            App.storage.loadAllData().then(function() {
                if (typeof App.renderAll === 'function') App.renderAll();
            });
            var sidebarSelect = document.getElementById('sidebar-car-select');
            if (sidebarSelect) sidebarSelect.value = carId;
            var car = App.store.cars.find(function(c) { return c.id == carId; });
            var currentCarNameEl = document.getElementById('current-car-name');
            if (currentCarNameEl && car) {
                currentCarNameEl.textContent = car.name;
            }
        }
    });

    // Обработчики для кнопок в мобильном хедере (если они ещё есть)
    var addCarBtn = document.getElementById('add-car-btn');
    if (addCarBtn) addCarBtn.addEventListener('click', App.ui.pages.addCar);

    var renameCarBtn = document.getElementById('rename-car-btn');
    if (renameCarBtn) renameCarBtn.addEventListener('click', App.ui.pages.renameCar);

    var deleteCarBtn = document.getElementById('delete-car-btn');
    if (deleteCarBtn) deleteCarBtn.addEventListener('click', App.ui.pages.deleteCar);

    var inviteBtn = document.getElementById('invite-btn');
    if (inviteBtn) inviteBtn.addEventListener('click', App.ui.pages.inviteUser);

    var calendarSubscribeBtn = document.getElementById('calendar-subscribe-btn');
    if (calendarSubscribeBtn) calendarSubscribeBtn.addEventListener('click', App.ui.pages.subscribeToCalendar);

    // Дублируем селектор в сайдбар
    var sidebarContainer = document.getElementById('sidebar-car-selector');
    if (sidebarContainer) {
        var sidebarHtml = '<select id="sidebar-car-select">' +
            '<option value="">-- Выберите авто --</option>';
        App.store.cars.forEach(function(car) {
            var selected = car.id == App.store.activeCarId ? ' selected' : '';
            sidebarHtml += '<option value="' + car.id + '"' + selected + '>' + App.utils.escapeHtml(car.name) + '</option>';
        });
        sidebarHtml += '</select>';
        sidebarContainer.innerHTML = sidebarHtml;

        document.getElementById('sidebar-car-select').addEventListener('change', function() {
            var carId = this.value;
            if (carId) {
                App.store.setActiveCar(carId);
                if (App.realtime && App.realtime.subscribeToCar) {
                    App.realtime.subscribeToCar(carId);
                }
                App.storage.loadAllData().then(function() {
                    if (typeof App.renderAll === 'function') App.renderAll();
                });
                var mainSelect = document.getElementById('car-select');
                if (mainSelect) mainSelect.value = carId;
            }
        });
    }

    App.initIcons();
};

// Функции действий с автомобилем (используются и из мобильных кнопок, и из вкладки «Автомобиль»)
App.ui.pages.addCar = function() {
    var name = prompt('Название автомобиля:', 'Мой автомобиль');
    if (!name) return;
    App.supa.createCar(name).then(function(res) {
        var car = res.data;
        if (!car) {
            console.warn('createCar вернул пустой ответ, перезагружаем список');
            return App.store.loadCars().then(function() {
                App.ui.pages.renderCarSelector();
            });
        }
        App.store.cars.push(car);
        App.store.setActiveCar(car.id);
        App.ui.pages.renderCarSelector();
        if (App.realtime && App.realtime.subscribeToCar) {
            App.realtime.subscribeToCar(car.id);
        }
        App.storage.loadAllData().then(function() {
            if (typeof App.renderAll === 'function') App.renderAll();
            if (typeof App.ui.pages.renderCarTab === 'function') App.ui.pages.renderCarTab();
        });
        App.toast('Автомобиль добавлен', 'success');
    }).catch(function(err) {
        console.error(err);
        App.toast('Ошибка создания авто', 'error');
    });
};

App.ui.pages.renameCar = async function() {
    var carId = App.store.activeCarId;
    if (!carId) { App.toast('Нет выбранного автомобиля', 'warning'); return; }
    var userId = await App.supa.getCurrentUserId();
    var car = App.store.cars.find(c => c.id == carId);
    if (!car || car.user_id !== userId) {
        App.toast('Только владелец может переименовывать автомобиль', 'warning');
        return;
    }
    var currentName = car.name || '';
    var newName = prompt('Новое название:', currentName);
    if (!newName || newName === currentName) return;
    try {
        await App.supa.renameCar(carId, newName);
        car.name = newName;
        App.ui.pages.renderCarSelector();
        if (typeof App.ui.pages.renderCarTab === 'function') App.ui.pages.renderCarTab();
        App.toast('Название обновлено', 'success');
    } catch (err) {
        console.error(err);
        App.toast('Ошибка переименования', 'error');
    }
};

App.ui.pages.deleteCar = async function() {
    var carId = App.store.activeCarId;
    if (!carId) { App.toast('Нет выбранного автомобиля', 'warning'); return; }
    var userId = await App.supa.getCurrentUserId();
    var car = App.store.cars.find(c => c.id == carId);
    if (!car || car.user_id !== userId) {
        App.toast('Только владелец может удалять автомобиль', 'warning');
        return;
    }
    if (!confirm('Удалить автомобиль и все его данные? Это действие необратимо.')) return;
    try {
        await App.supa.deleteCar(carId);
        App.store.cars = App.store.cars.filter(c => c.id != carId);
        App.store.activeCarId = null;
        App.ui.pages.renderCarSelector();
        App.store.operations = [];
        App.store.fuelLog = [];
        App.store.tireLog = [];
        App.store.parts = [];
        App.store.serviceRecords = [];
        App.store.mileageHistory = [];
        App.store.saveToLocalStorage();
        if (typeof App.renderAll === 'function') App.renderAll();
        if (typeof App.ui.pages.renderCarTab === 'function') App.ui.pages.renderCarTab();
        App.toast('Автомобиль удалён', 'success');
    } catch (err) {
        console.error(err);
        App.toast('Ошибка удаления', 'error');
    }
};

App.ui.pages.inviteUser = function() {
    var carId = App.store.activeCarId;
    if (!carId) { App.toast('Сначала выберите авто', 'warning'); return; }
    App.supabase.from('car_shares')
        .insert({ car_id: carId, invited_email: null })
        .select()
        .single()
        .then(function(res) {
            if (res.error) throw res.error;
            var inviteCode = res.data.invite_code;
            var inviteLink = window.location.origin + '/Car-K3eper/?invite=' + inviteCode;
            var copyHtml = '<div style="margin-top:12px;">' +
                '<p class="hint">Ссылка для приглашения:</p>' +
                '<input type="text" value="' + inviteLink + '" readonly style="width:100%;" id="invite-link-input">' +
                '<button id="copy-invite-link-btn" class="primary-btn" style="margin-top:8px;">Копировать</button>' +
                '</div>';
            var modal = App.ui.createModal('Пригласить пользователя', copyHtml);
            document.getElementById('copy-invite-link-btn').addEventListener('click', function() {
                var input = document.getElementById('invite-link-input');
                input.select();
                document.execCommand('copy');
                App.toast('Ссылка скопирована в буфер обмена', 'success');
            });
        }).catch(function(err) {
            console.error(err);
            App.toast('Ошибка создания приглашения', 'error');
        });
};

App.ui.pages.subscribeToCalendar = async function() {
    var carId = App.store.activeCarId;
    if (!carId) { App.toast('Сначала выберите авто', 'warning'); return; }
    var { data: existing, error: selectError } = await App.supabase
        .from('calendar_tokens')
        .select('token')
        .eq('car_id', carId)
        .maybeSingle();
    if (selectError) {
        console.error('Ошибка проверки токена:', selectError);
        App.toast('Ошибка получения токена', 'error');
        return;
    }
    var token;
    if (existing && existing.token) {
        token = existing.token;
    } else {
        var newToken = crypto.randomUUID();
        var { data: inserted, error: insertError } = await App.supabase
            .from('calendar_tokens')
            .insert({ car_id: carId, token: newToken })
            .select('token')
            .single();
        if (insertError) {
            console.error('Ошибка создания токена:', insertError);
            App.toast('Ошибка создания токена', 'error');
            return;
        }
        token = inserted.token;
    }
    var feedUrl = `https://qbjlccdqaudyvedpysil.supabase.co/functions/v1/calendar-feed?token=${token}`;
    var copyHtml = '<div style="margin-top:12px;">' +
        '<p class="hint">Скопируйте ссылку и добавьте в свой календарь как интернет-календарь:</p>' +
        '<input type="text" value="' + feedUrl + '" readonly style="width:100%;" id="calendar-feed-url">' +
        '<button id="copy-feed-url-btn" class="primary-btn" style="margin-top:8px;">Копировать</button>' +
        '</div>';
    var modal = App.ui.createModal('Подписка на календарь', copyHtml);
    document.getElementById('copy-feed-url-btn').addEventListener('click', function() {
        var input = document.getElementById('calendar-feed-url');
        input.select();
        document.execCommand('copy');
        App.toast('Ссылка скопирована', 'success');
    });
};

// Обновление названия текущего авто в шапке
App.ui.pages.updateCurrentCarName = function() {
    var car = App.store.cars.find(function(c) { return c.id == App.store.activeCarId; });
    var el = document.getElementById('current-car-name');
    if (el) {
        el.textContent = car ? car.name : '';
    }
};

// ========== Новая вкладка «Автомобиль» ==========

// ---------- Вспомогательные функции для работы с документами (localStorage) ----------
function getCarDocuments() {
    try {
        return JSON.parse(localStorage.getItem('car_documents') || '[]');
    } catch (e) {
        return [];
    }
}

function saveCarDocuments(docs) {
    localStorage.setItem('car_documents', JSON.stringify(docs));
}

// ---------- Рендер селектора автомобиля (без изменений) ----------
App.ui.pages.renderCarSelector = function() {
    var container = document.getElementById('car-selector-container');
    if (!container) return;
    var html = '<select id="car-select"><option value="">-- Выберите авто --</option>';
    App.store.cars.forEach(function(car) {
        var selected = car.id == App.store.activeCarId ? ' selected' : '';
        html += '<option value="' + car.id + '"' + selected + '>' + App.utils.escapeHtml(car.name) + '</option>';
    });
    html += '</select>';
    container.innerHTML = html;

    document.getElementById('car-select').addEventListener('change', function() {
        var carId = this.value;
        if (carId) {
            App.store.setActiveCar(carId);
            if (App.realtime && App.realtime.subscribeToCar) {
                App.realtime.subscribeToCar(carId);
            }
            App.storage.loadAllData().then(function() {
                if (typeof App.renderAll === 'function') App.renderAll();
            });
            var sidebarSelect = document.getElementById('sidebar-car-select');
            if (sidebarSelect) sidebarSelect.value = carId;
            var car = App.store.cars.find(function(c) { return c.id == carId; });
            var currentCarNameEl = document.getElementById('current-car-name');
            if (currentCarNameEl && car) {
                currentCarNameEl.textContent = car.name;
            }
        }
    });

    // Дублируем селектор в сайдбар
    var sidebarContainer = document.getElementById('sidebar-car-selector');
    if (sidebarContainer) {
        var sidebarHtml = '<select id="sidebar-car-select">' +
            '<option value="">-- Выберите авто --</option>';
        App.store.cars.forEach(function(car) {
            var selected = car.id == App.store.activeCarId ? ' selected' : '';
            sidebarHtml += '<option value="' + car.id + '"' + selected + '>' + App.utils.escapeHtml(car.name) + '</option>';
        });
        sidebarHtml += '</select>';
        sidebarContainer.innerHTML = sidebarHtml;

        document.getElementById('sidebar-car-select').addEventListener('change', function() {
            var carId = this.value;
            if (carId) {
                App.store.setActiveCar(carId);
                if (App.realtime && App.realtime.subscribeToCar) {
                    App.realtime.subscribeToCar(carId);
                }
                App.storage.loadAllData().then(function() {
                    if (typeof App.renderAll === 'function') App.renderAll();
                });
                var mainSelect = document.getElementById('car-select');
                if (mainSelect) mainSelect.value = carId;
            }
        });
    }

    App.initIcons();
};

// ---------- CRUD автомобилей (без изменений) ----------
App.ui.pages.addCar = function() { /* ... существующий код ... */ };
App.ui.pages.renameCar = async function() { /* ... существующий код ... */ };
App.ui.pages.deleteCar = async function() { /* ... существующий код ... */ };
App.ui.pages.inviteUser = function() { /* ... существующий код ... */ };
App.ui.pages.subscribeToCalendar = async function() { /* ... существующий код ... */ };
App.ui.pages.updateCurrentCarName = function() { /* ... существующий код ... */ };
App.ui.pages.checkPendingInvites = function() { /* ... существующий код ... */ };

// ========== НОВАЯ ВКЛАДКА «АВТОМОБИЛЬ» ==========

App.ui.pages.renderCarTab = function() {
    // Заполняем селектор
    var selector = document.getElementById('car-page-selector');
    if (selector) {
        selector.innerHTML = '<option value="">-- Выберите авто --</option>';
        App.store.cars.forEach(function(car) {
            var selected = car.id == App.store.activeCarId ? ' selected' : '';
            selector.innerHTML += '<option value="' + car.id + '"' + selected + '>' + App.utils.escapeHtml(car.name) + '</option>';
        });
        selector.onchange = function() {
            var carId = this.value;
            if (carId) {
                App.store.setActiveCar(carId);
                if (App.realtime && App.realtime.subscribeToCar) {
                    App.realtime.subscribeToCar(carId);
                }
                App.storage.loadAllData().then(function() {
                    App.ui.pages.loadCarDetails(carId);
                    App.ui.pages.renderCarSelector();
                    App.ui.pages.updateCurrentCarName();
                    App.ui.pages.renderSharingListForCarTab();
                    App.ui.pages.renderBasicParams();
                    App.ui.pages.renderDocuments();
                });
            }
        };
    }

    // Привязываем кнопки
    document.getElementById('add-car-btn').onclick = App.ui.pages.addCar;
    document.getElementById('rename-car-btn').onclick = App.ui.pages.renameCar;
    document.getElementById('delete-car-btn').onclick = App.ui.pages.deleteCar;
    document.getElementById('save-car-details-btn').onclick = function() {
        var brand = document.getElementById('car-brand').value.trim();
        var model = document.getElementById('car-model').value.trim();
        var year = parseInt(document.getElementById('car-year').value) || null;
        var plate = document.getElementById('car-plate').value.trim();
        var vin = document.getElementById('car-vin').value.trim();
        App.store.settings.carBrand = brand;
        App.store.settings.carModel = model;
        App.store.settings.carYear = year;
        App.store.settings.plateNumber = plate;
        App.store.settings.vin = vin;
        App.store.saveToLocalStorage();
        App.storage.saveSettings(App.store.settings).then(function() {
            App.toast('Данные автомобиля сохранены', 'success');
        });
    };

    // Загружаем детали текущего авто
    if (App.store.activeCarId) {
        App.ui.pages.loadCarDetails(App.store.activeCarId);
    } else {
        document.getElementById('car-brand').value = '';
        document.getElementById('car-model').value = '';
        document.getElementById('car-year').value = '';
        document.getElementById('car-plate').value = '';
        document.getElementById('car-vin').value = '';
    }

    App.ui.pages.renderBasicParams();
    App.ui.pages.renderSharingListForCarTab();
    App.ui.pages.renderExportBlock();
    App.ui.pages.renderDocuments();
    App.initIcons();
};

App.ui.pages.loadCarDetails = function(carId) {
    var s = App.store.settings;
    document.getElementById('car-brand').value = s.carBrand || '';
    document.getElementById('car-model').value = s.carModel || '';
    document.getElementById('car-year').value = s.carYear || '';
    document.getElementById('car-plate').value = s.plateNumber || '';
    document.getElementById('car-vin').value = s.vin || '';
};

// ---------- Основные параметры ----------
App.ui.pages.renderBasicParams = function() {
    document.getElementById('set-base-mileage').value = App.store.baseMileage || 0;
    document.getElementById('set-base-motohours').value = App.store.baseMotohours || 0;
    document.getElementById('purchase-date').value = App.store.purchaseDate
        ? App.utils.isoToDDMMYYYY(App.store.purchaseDate) : '';
    document.getElementById('purchase-cost').value = App.store.purchaseCost || 0;
    document.getElementById('ownership-days').value = App.store.ownershipDays;

    App.ui.pages.updateOwnershipCost();

    document.getElementById('save-params-btn').onclick = function() {
        App.store.baseMileage = parseInt(document.getElementById('set-base-mileage').value) || 0;
        App.store.baseMotohours = parseInt(document.getElementById('set-base-motohours').value) || 0;
        var dateStr = document.getElementById('purchase-date').value;
        if (dateStr) {
            App.store.purchaseDate = App.utils.ddmmYYYYtoISO(dateStr);
        }
        App.store.purchaseCost = parseFloat(document.getElementById('purchase-cost').value) || 0;
        App.store.calculateOwnershipDays();
        document.getElementById('ownership-days').value = App.store.ownershipDays;
        App.store.saveToLocalStorage();
        App.ui.pages.updateOwnershipCost();
        App.toast('Параметры сохранены', 'success');
    };

    var toggleUnitBtn = document.getElementById('toggle-ownership-unit');
    if (toggleUnitBtn) {
        toggleUnitBtn.onclick = function() {
            var modes = ['days', 'months', 'years'];
            var current = App.store.ownershipDisplayMode || 'days';
            var next = modes[(modes.indexOf(current) + 1) % modes.length];
            App.store.ownershipDisplayMode = next;
            var days = App.store.ownershipDays;
            var display = days;
            if (next === 'months') display = (days / 30).toFixed(1);
            else if (next === 'years') display = (days / 365).toFixed(1);
            document.getElementById('ownership-days').value = display;
        };
    }

    var toggleCostBtn = document.getElementById('toggle-cost-unit');
    if (toggleCostBtn) {
        toggleCostBtn.onclick = function() {
            var mode = App.store._costDisplayMode || 'total';
            App.store._costDisplayMode = (mode === 'total') ? 'perKm' : 'total';
            App.ui.pages.updateOwnershipCost();
        };
    }
};

App.ui.pages.updateOwnershipCost = function() {
    var totalCost = (App.store.purchaseCost || 0)
        + (App.store.parts || []).reduce(function(s, p) { return s + (parseFloat(p.price) || 0); }, 0)
        + (App.store.serviceRecords || []).reduce(function(s, r) {
            return s + (parseFloat(r.parts_cost) || 0) + (parseFloat(r.work_cost) || 0);
          }, 0)
        + (App.store.fuelLog || []).reduce(function(s, f) {
            return s + (parseFloat(f.liters) || 0) * (parseFloat(f.pricePerLiter) || 0);
          }, 0)
        + (App.store.tireLog || []).reduce(function(s, t) {
            return s + (parseFloat(t.purchaseCost) || 0) + (parseFloat(t.mountCost) || 0) + (parseFloat(t.diskCost) || 0);
          }, 0);

    var mileage = App.store.settings.currentMileage;
    var perKm = mileage > 0 ? (totalCost / mileage).toFixed(2) : '0';
    var displayMode = App.store._costDisplayMode || 'total';
    var displayValue = (displayMode === 'perKm') ? perKm + ' ₽/км' : totalCost.toLocaleString() + ' ₽';
    document.getElementById('ownership-cost').value = displayValue;
};

// ---------- Блок экспорта (перенесён из Настроек) ----------
App.ui.pages.renderExportBlock = function() {
    document.getElementById('export-data-btn-car').onclick = function() {
        var type = document.getElementById('export-type-select-car').value;
        var format = document.getElementById('export-format-select-car').value;
        if (format === 'csv') {
            var exportData = App.ui.pages.getExportData(type); // используется функция из settings.js
            if (exportData && exportData.data) {
                App.ui.pages.exportToCSV(exportData.data, exportData.filename, exportData.headers);
            }
        } else if (format === 'xlsx') {
            if (type === 'all') App.ui.pages.exportToExcelAll();
            else App.ui.pages.exportToExcelForType(type);
        }
    };
};

// ---------- Документы (фото + OCR + аккордеоны) ----------
App.ui.pages.renderDocuments = function() {
    var container = document.getElementById('documents-accordions');
    if (!container) return;

    var docs = getCarDocuments();
    var grouped = {};
    docs.forEach(function(doc) {
        var type = doc.type || 'Прочее';
        if (!grouped[type]) grouped[type] = [];
        grouped[type].push(doc);
    });

    var html = '';
    var types = ['ОСАГО', 'Чек', 'Заказ-наряд', 'Прочее'];
    types.forEach(function(type) {
        var items = grouped[type] || [];
        html += '<div class="accordion-group">';
        html += '<div class="accordion-header">';
        html += '<i data-lucide="file-text"></i> ' + type + ' (' + items.length + ')';
        html += '<i data-lucide="chevron-down" class="accordion-arrow" style="margin-left:auto;"></i>';
        html += '</div>';
        html += '<div class="accordion-body">';
        if (items.length === 0) {
            html += '<p class="hint">Нет документов</p>';
        } else {
            items.forEach(function(doc, idx) {
                html += '<div class="card-item">';
                html += '<div class="card-header">';
                html += '<span>' + (doc.date || '') + '</span>';
                html += '<div class="card-actions">';
                html += '<button class="icon-btn edit-doc-btn" data-idx="' + idx + '"><i data-lucide="pencil"></i></button>';
                html += '<button class="icon-btn delete-doc-btn" data-idx="' + idx + '"><i data-lucide="trash-2"></i></button>';
                html += '</div>';
                html += '</div>';
                if (doc.photoUrl) {
                    html += '<img src="' + doc.photoUrl + '" class="doc-preview" />';
                }
                if (doc.amount) html += '<div class="card-meta">Сумма: ' + doc.amount + ' ₽</div>';
                if (doc.notes) html += '<div class="card-meta">' + App.utils.escapeHtml(doc.notes) + '</div>';
                html += '</div>';
            });
        }
        html += '</div></div>';
    });
    container.innerHTML = html;
    App.initIcons();

    // Обработчики аккордеонов
    container.querySelectorAll('.accordion-header').forEach(function(header) {
        header.addEventListener('click', function() {
            var body = header.nextElementSibling;
            if (body && body.classList.contains('accordion-body')) {
                body.classList.toggle('open');
                var arrow = header.querySelector('.accordion-arrow');
                if (arrow) arrow.style.transform = body.classList.contains('open') ? 'rotate(180deg)' : 'rotate(0deg)';
            }
        });
    });

    // Добавление документа
    document.getElementById('add-document-btn').onclick = function() {
        document.getElementById('doc-file-input').click();
    };
    document.getElementById('doc-file-input').onchange = function(e) {
        var file = e.target.files[0];
        if (!file) return;

        App.supa.uploadPhoto(file).then(function(url) {
            // OCR-распознавание через Edge Function
            fetch('https://qbjlccdqaudyvedpysil.supabase.co/functions/v1/ocr-recognize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + (App.supabase?.auth?.session()?.access_token || '')
                },
                body: JSON.stringify({ imageUrl: url })
            })
            .then(function(res) { return res.json(); })
            .then(function(ocrData) {
                if (ocrData.error) throw new Error(ocrData.error);
                var docs = getCarDocuments();
                docs.push({
                    type: ocrData.type || 'Чек',
                    date: ocrData.date || new Date().toISOString().split('T')[0],
                    photoUrl: url,
                    amount: ocrData.amount || 0,
                    notes: ocrData.rawText || ''
                });
                saveCarDocuments(docs);
                App.ui.pages.renderDocuments();
                App.toast('Документ распознан и добавлен', 'success');
            })
            .catch(function(err) {
                console.warn('OCR failed:', err);
                var docs = getCarDocuments();
                docs.push({
                    type: 'Чек',
                    date: new Date().toISOString().split('T')[0],
                    photoUrl: url,
                    amount: 0,
                    notes: ''
                });
                saveCarDocuments(docs);
                App.ui.pages.renderDocuments();
                App.toast('Документ добавлен (без распознавания)', 'warning');
            });
        }).catch(function(err) {
            console.error('Upload failed:', err);
            App.toast('Ошибка загрузки фото', 'error');
        });
        e.target.value = '';
    };

    // Редактирование и удаление документов
    container.addEventListener('click', function(e) {
        var target = e.target.closest('.edit-doc-btn');
        if (target) {
            var idx = parseInt(target.dataset.idx);
            var docs = getCarDocuments();
            if (idx >= 0 && idx < docs.length) {
                var doc = docs[idx];
                var newType = prompt('Тип (ОСАГО, Чек, Заказ-наряд, Прочее):', doc.type);
                if (newType) doc.type = newType;
                var newAmount = prompt('Сумма:', doc.amount);
                if (newAmount !== null) doc.amount = parseFloat(newAmount) || 0;
                var newNotes = prompt('Примечание:', doc.notes);
                if (newNotes !== null) doc.notes = newNotes;
                saveCarDocuments(docs);
                App.ui.pages.renderDocuments();
            }
            return;
        }
        target = e.target.closest('.delete-doc-btn');
        if (target) {
            var idx = parseInt(target.dataset.idx);
            if (confirm('Удалить документ?')) {
                var docs = getCarDocuments();
                docs.splice(idx, 1);
                saveCarDocuments(docs);
                App.ui.pages.renderDocuments();
            }
        }
    });
};

// Совместный доступ (оставлен без изменений, но вызывается из renderCarTab)
App.ui.pages.renderSharingListForCarTab = function() {
    var container = document.getElementById('sharing-container');
    if (!container) return;
    var carId = App.store.activeCarId;
    if (!carId) {
        container.innerHTML = '<p class="hint">Выберите автомобиль</p>';
        return;
    }
    App.supa.getCurrentUserId().then(function(userId) {
        if (!userId) {
            container.innerHTML = '<p class="hint">Не удалось определить пользователя</p>';
            return;
        }
        App.supa.getCarShares(carId).then(function({ data, error }) {
            if (error) {
                container.innerHTML = '<p class="hint">Ошибка загрузки</p>';
                return;
            }
            var car = App.store.cars.find(c => c.id == carId);
            var isOwner = car && car.user_id === userId;
            var shares = data || [];
            if (!isOwner) {
                shares = shares.filter(share => share.invited_user_id === userId);
            }
            if (shares.length === 0) {
                container.innerHTML = '<p class="hint">Нет приглашённых пользователей</p>';
                App.initIcons();
                return;
            }
            var html = '<ul style="list-style:none; padding:0;">';
            shares.forEach(function(share) {
                var statusIcon = share.accepted ? '✅' : '⏳';
                var statusText = share.accepted ? 'Принято' : 'Ожидает';
                var emailOrId = share.invited_email || (share.invited_user_id ? 'ID: ' + share.invited_user_id.substring(0,8) : '—');
                html += '<li style="display:flex; align-items:center; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--border);">';
                html += '<span>' + statusIcon + ' <strong>' + App.utils.escapeHtml(emailOrId) + '</strong> (' + statusText + ')</span>';
                if (isOwner) {
                    html += '<button class="icon-btn remove-share-btn" data-id="' + share.id + '" title="Удалить доступ"><i data-lucide="trash-2"></i></button>';
                }
                html += '</li>';
            });
            html += '</ul>';
            container.innerHTML = html;

            if (isOwner) {
                container.querySelectorAll('.remove-share-btn').forEach(function(btn) {
                    btn.addEventListener('click', function() {
                        var shareId = btn.dataset.id;
                        if (!confirm('Удалить доступ для этого пользователя?')) return;
                        App.supa.deleteCarShare(shareId).then(function() {
                            App.toast('Доступ удалён', 'success');
                            App.ui.pages.renderSharingListForCarTab();
                        }).catch(function(err) {
                            console.error(err);
                            App.toast('Ошибка удаления доступа', 'error');
                        });
                    });
                });
            }
            App.initIcons();
        });
    }).catch(function(err) {
        console.error(err);
        container.innerHTML = '<p class="hint">Ошибка загрузки</p>';
    });
};