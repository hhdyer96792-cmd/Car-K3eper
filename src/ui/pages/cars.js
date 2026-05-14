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
// Главный рендер вкладки
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

// Загрузка деталей авто
App.ui.pages.loadCarDetails = function(carId) {
    var s = App.store.settings;
    document.getElementById('car-brand').value = s.carBrand || '';
    