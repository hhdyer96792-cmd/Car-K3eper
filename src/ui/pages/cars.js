// src/ui/pages/cars.js
window.App = window.App || {};
App.ui.pages = App.ui.pages || {};

// ---------- Локальный кэш документов ----------
App.ui.pages._carDocuments = [];

// ---------- Функции работы с документами через Supabase ----------
App.ui.pages.loadCarDocuments = async function() {
    if (!App.store.activeCarId) return [];
    const { data, error } = await App.supabase
        .from('car_documents')
        .select('*')
        .eq('car_id', App.store.activeCarId)
        .order('created_at', { ascending: false });
    if (error) {
        console.error('Ошибка загрузки документов:', error);
        return [];
    }
    App.ui.pages._carDocuments = (data || []).map(d => ({
        id: d.id,
        type: d.type,
        date: d.date,
        photoUrl: d.photo_url,
        amount: d.amount,
        notes: d.notes || ''
    }));
    return App.ui.pages._carDocuments;
};

App.ui.pages.addCarDocument = async function(doc) {
    if (!App.store.activeCarId) return null;
    const user = await App.supa.getCurrentUserId();
    const { data, error } = await App.supabase
        .from('car_documents')
        .insert({
            car_id: App.store.activeCarId,
            user_id: user,
            type: doc.type,
            date: doc.date,
            photo_url: doc.photoUrl,
            amount: doc.amount,
            notes: doc.notes
        })
        .select()
        .single();
    if (error) {
        console.error('Ошибка добавления документа:', error);
        return null;
    }
    App.ui.pages._carDocuments.unshift({
        id: data.id,
        type: data.type,
        date: data.date,
        photoUrl: data.photo_url,
        amount: data.amount,
        notes: data.notes || ''
    });
    return data;
};

App.ui.pages.updateCarDocument = async function(docId, updates) {
    const { error } = await App.supabase
        .from('car_documents')
        .update({
            type: updates.type,
            date: updates.date,
            amount: updates.amount,
            notes: updates.notes
        })
        .eq('id', docId);
    if (error) {
        console.error('Ошибка обновления документа:', error);
        return false;
    }
    const idx = App.ui.pages._carDocuments.findIndex(d => d.id === docId);
    if (idx !== -1) Object.assign(App.ui.pages._carDocuments[idx], updates);
    return true;
};

App.ui.pages.deleteCarDocument = async function(docId) {
    const { error } = await App.supabase
        .from('car_documents')
        .delete()
        .eq('id', docId);
    if (error) {
        console.error('Ошибка удаления документа:', error);
        return false;
    }
    App.ui.pages._carDocuments = App.ui.pages._carDocuments.filter(d => d.id !== docId);
    return true;
};

// ---------- Рендер селектора автомобиля ----------
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
            if (currentCarNameEl && car) currentCarNameEl.textContent = car.name;
        }
    });

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

// ---------- CRUD автомобилей ----------
App.ui.pages.addCar = function() { /* ... существующий код ... */ };
App.ui.pages.renameCar = async function() { /* ... существующий код ... */ };
App.ui.pages.deleteCar = async function() { /* ... существующий код ... */ };
App.ui.pages.inviteUser = function() { /* ... существующий код ... */ };
App.ui.pages.subscribeToCalendar = async function() { /* ... существующий код ... */ };
App.ui.pages.updateCurrentCarName = function() { /* ... существующий код ... */ };
App.ui.pages.checkPendingInvites = function() { /* ... существующий код ... */ };

// ========== НОВАЯ ВКЛАДКА «АВТОМОБИЛЬ» ==========

App.ui.pages.renderCarTab = function() {
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
                    App.ui.pages.loadCarDocuments().then(function() {
                        App.ui.pages.renderDocuments();
                    });
                });
            }
        };
    }

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
    App.ui.pages.loadCarDocuments().then(function() {
        App.ui.pages.renderDocuments();
    });
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
        if (dateStr) App.store.purchaseDate = App.utils.ddmmYYYYtoISO(dateStr);
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

// ---------- Экспорт данных ----------
App.ui.pages.renderExportBlock = function() {
    document.getElementById('export-data-btn-car').onclick = function() {
        var type = document.getElementById('export-type-select-car').value;
        var format = document.getElementById('export-format-select-car').value;
        if (format === 'csv') {
            var exportData = App.ui.pages.getExportData(type);
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

    var docs = App.ui.pages._carDocuments || [];
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

    document.getElementById('add-document-btn').onclick = function() {
        document.getElementById('doc-file-input').click();
    };
    document.getElementById('doc-file-input').onchange = function(e) {
        var file = e.target.files[0];
        if (!file) return;
        App.supa.uploadPhoto(file).then(function(url) {
            fetch('https://qbjlccdqaudyvedpysil.supabase.co/functions/v1/ocr-recognize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + (App.supabase?.auth?.session()?.access_token || '')
                },
                body: JSON.stringify({ imageUrl: url })
            })
            .then(res => res.json())
            .then(async ocrData => {
                if (ocrData.error) throw new Error(ocrData.error);
                var newDoc = {
                    type: ocrData.type || 'Чек',
                    date: ocrData.date || new Date().toISOString().split('T')[0],
                    photoUrl: url,
                    amount: ocrData.amount || 0,
                    notes: ocrData.rawText || ''
                };
                await App.ui.pages.addCarDocument(newDoc);
                App.ui.pages.renderDocuments();
                App.toast('Документ распознан и добавлен', 'success');
            })
            .catch(async function(err) {
                console.warn('OCR failed:', err);
                var newDoc = {
                    type: 'Чек',
                    date: new Date().toISOString().split('T')[0],
                    photoUrl: url,
                    amount: 0,
                    notes: ''
                };
                await App.ui.pages.addCarDocument(newDoc);
                App.ui.pages.renderDocuments();
                App.toast('Документ добавлен (без распознавания)', 'warning');
            });
        }).catch(function(err) {
            console.error('Upload failed:', err);
            App.toast('Ошибка загрузки фото', 'error');
        });
        e.target.value = '';
    };

    container.addEventListener('click', async function(e) {
        var target = e.target.closest('.edit-doc-btn');
        if (target) {
            var idx = parseInt(target.dataset.idx);
            var doc = App.ui.pages._carDocuments[idx];
            if (!doc) return;
            var newType = prompt('Тип (ОСАГО, Чек, Заказ-наряд, Прочее):', doc.type);
            if (newType) doc.type = newType;
            var newAmount = prompt('Сумма:', doc.amount);
            if (newAmount !== null) doc.amount = parseFloat(newAmount) || 0;
            var newNotes = prompt('Примечание:', doc.notes);
            if (newNotes !== null) doc.notes = newNotes;
            await App.ui.pages.updateCarDocument(doc.id, {
                type: doc.type,
                date: doc.date,
                amount: doc.amount,
                notes: doc.notes
            });
            App.ui.pages.renderDocuments();
            return;
        }
        target = e.target.closest('.delete-doc-btn');
        if (target) {
            var idx = parseInt(target.dataset.idx);
            var doc = App.ui.pages._carDocuments[idx];
            if (!doc) return;
            if (confirm('Удалить документ?')) {
                await App.ui.pages.deleteCarDocument(doc.id);
                App.ui.pages.renderDocuments();
            }
        }
    });
};

// ---------- Совместный доступ ----------
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