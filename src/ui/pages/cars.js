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
            // Обновляем название авто в шапке
            var car = App.store.cars.find(function(c) { return c.id == carId; });
            var currentCarNameEl = document.getElementById('current-car-name');
            if (currentCarNameEl && car) {
                currentCarNameEl.textContent = car.name;
            }
        }
    });

    // Обработчики для кнопок в основном контейнере (только на мобильных)
    document.getElementById('add-car-btn')?.addEventListener('click', function() {
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
            });
            App.toast('Автомобиль добавлен', 'success');
        }).catch(function(err) {
            console.error(err);
            App.toast('Ошибка создания авто', 'error');
        });
    });

    document.getElementById('rename-car-btn')?.addEventListener('click', async function() {
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
            App.toast('Название обновлено', 'success');
        } catch (err) {
            console.error(err);
            App.toast('Ошибка переименования', 'error');
        }
    });

    document.getElementById('delete-car-btn')?.addEventListener('click', async function() {
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
            App.toast('Автомобиль удалён', 'success');
        } catch (err) {
            console.error(err);
            App.toast('Ошибка удаления', 'error');
        }
    });

    document.getElementById('invite-btn')?.addEventListener('click', function() {
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
    });

    document.getElementById('calendar-subscribe-btn')?.addEventListener('click', async function() {
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
    });

    // ========== Обработчики для кнопок в сайдбаре (десктоп) ==========
    var sidebarAddBtn = document.getElementById('sidebar-add-car-btn');
    if (sidebarAddBtn) sidebarAddBtn.addEventListener('click', function() {
        var name = prompt('Название автомобиля:', 'Мой автомобиль');
        if (!name) return;
        App.supa.createCar(name).then(function(res) {
            var car = res.data;
            if (!car) return;
            App.store.cars.push(car);
            App.store.setActiveCar(car.id);
            App.ui.pages.renderCarSelector();
            if (App.realtime && App.realtime.subscribeToCar) App.realtime.subscribeToCar(car.id);
            App.storage.loadAllData().then(function() { if (typeof App.renderAll === 'function') App.renderAll(); });
            App.toast('Автомобиль добавлен', 'success');
        }).catch(function(err) { console.error(err); App.toast('Ошибка создания авто', 'error'); });
    });

    var sidebarRenameBtn = document.getElementById('sidebar-rename-car-btn');
    if (sidebarRenameBtn) sidebarRenameBtn.addEventListener('click', async function() {
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
            App.toast('Название обновлено', 'success');
        } catch (err) { console.error(err); App.toast('Ошибка переименования', 'error'); }
    });

    var sidebarDeleteBtn = document.getElementById('sidebar-delete-car-btn');
    if (sidebarDeleteBtn) sidebarDeleteBtn.addEventListener('click', async function() {
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
            App.toast('Автомобиль удалён', 'success');
        } catch (err) { console.error(err); App.toast('Ошибка удаления', 'error'); }
    });

    var sidebarInviteBtn = document.getElementById('sidebar-invite-btn');
    if (sidebarInviteBtn) sidebarInviteBtn.addEventListener('click', function() {
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
            }).catch(function(err) { console.error(err); App.toast('Ошибка создания приглашения', 'error'); });
    });

    var sidebarCalendarBtn = document.getElementById('sidebar-calendar-subscribe-btn');
    if (sidebarCalendarBtn) sidebarCalendarBtn.addEventListener('click', async function() {
        var carId = App.store.activeCarId;
        if (!carId) { App.toast('Сначала выберите авто', 'warning'); return; }
        var { data: existing, error: selectError } = await App.supabase
            .from('calendar_tokens')
            .select('token')
            .eq('car_id', carId)
            .maybeSingle();
        if (selectError) { console.error(selectError); return; }
        var token = existing?.token || (await App.supabase.from('calendar_tokens').insert({ car_id: carId, token: crypto.randomUUID() }).select('token').single()).data.token;
        var feedUrl = `https://qbjlccdqaudyvedpysil.supabase.co/functions/v1/calendar-feed?token=${token}`;
        var copyHtml = '<div style="margin-top:12px;">' +
            '<p class="hint">Скопируйте ссылку и добавьте в свой календарь:</p>' +
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

// Обновление названия текущего авто в шапке (вызывается при входе)
App.ui.pages.updateCurrentCarName = function() {
    var car = App.store.cars.find(function(c) { return c.id == App.store.activeCarId; });
    var el = document.getElementById('current-car-name');
    if (el) {
        el.textContent = car ? car.name : '';
    }
};

// ========== Новая вкладка «Автомобиль» ==========
App.ui.pages.renderCarTab = function() {
    // Заполняем селектор на вкладке
    var selector = document.getElementById('car-page-selector');
    if (selector) {
        selector.innerHTML = '<option value="">-- Выберите авто --</option>';
        App.store.cars.forEach(function(car) {
            var selected = car.id == App.store.activeCarId ? ' selected' : '';
            selector.innerHTML += '<option value="' + car.id + '"' + selected + '>' + App.utils.escapeHtml(car.name) + '</option>';
        });
        selector.addEventListener('change', function() {
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
                });
            }
        });
    }

    // Загружаем детали текущего авто
    if (App.store.activeCarId) {
        App.ui.pages.loadCarDetails(App.store.activeCarId);
    }

    // Загружаем точки отсчёта и дату покупки из store
    var baseMileage = App.store.baseMileage || 0;
    var baseMotohours = App.store.baseMotohours || 0;
    var purchaseDate = App.store.purchaseDate || '';
    document.getElementById('set-base-mileage').value = baseMileage;
    document.getElementById('set-base-motohours').value = baseMotohours;
    document.getElementById('purchase-date').value = purchaseDate;
    document.getElementById('ownership-days').value = App.store.ownershipDays || 0;

    // Обработчики сохранения
    document.getElementById('save-car-details-btn').onclick = function() {
        var brand = document.getElementById('car-brand').value.trim();
        var model = document.getElementById('car-model').value.trim();
        var year = parseInt(document.getElementById('car-year').value) || null;
        var plate = document.getElementById('car-plate').value.trim();
        var vin = document.getElementById('car-vin').value.trim();

        // Сохраняем в store
        App.store.settings.carBrand = brand;
        App.store.settings.carModel = model;
        App.store.settings.carYear = year;
        App.store.settings.plateNumber = plate;
        App.store.settings.vin = vin;
        App.store.saveToLocalStorage();

        // Синхронизируем с Supabase
        App.storage.saveSettings(App.store.settings).then(function() {
            App.toast('Данные автомобиля сохранены', 'success');
        }).catch(function(err) {
            console.error(err);
            App.toast('Ошибка сохранения', 'error');
        });
    };

    document.getElementById('save-base-points-btn').onclick = function() {
        App.store.baseMileage = parseInt(document.getElementById('set-base-mileage').value) || 0;
        App.store.baseMotohours = parseInt(document.getElementById('set-base-motohours').value) || 0;
        App.store.saveToLocalStorage();
        App.toast('Точки отсчёта сохранены', 'success');
    };

    document.getElementById('save-ownership-btn').onclick = function() {
        var date = document.getElementById('purchase-date').value;
        App.store.purchaseDate = date;
        App.store.calculateOwnershipDays();
        document.getElementById('ownership-days').value = App.store.ownershipDays;
        App.store.saveToLocalStorage();
        App.toast('Дата покупки сохранена', 'success');
    };

    // Совместный доступ (рендерим из settings)
    if (typeof App.ui.pages.renderSharingList === 'function') {
        App.ui.pages.renderSharingList();
    }

    App.initIcons();
};

// Загрузка деталей авто из App.store.settings
App.ui.pages.loadCarDetails = function(carId) {
    var s = App.store.settings;
    document.getElementById('car-brand').value = s.carBrand || '';
    document.getElementById('car-model').value = s.carModel || '';
    document.getElementById('car-year').value = s.carYear || '';
    document.getElementById('car-plate').value = s.plateNumber || '';
    document.getElementById('car-vin').value = s.vin || '';
};

// Проверка приглашений (без изменений)
App.ui.pages.checkPendingInvites = function() {
    var urlParams = new URLSearchParams(window.location.search);
    var inviteCode = urlParams.get('invite');

    if (inviteCode && !App.supabase.auth.getUser()) {
        sessionStorage.setItem('pendingInvite', inviteCode);
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
    }

    if (inviteCode) {
        window.history.replaceState({}, document.title, window.location.pathname);
        App.supa.getInviteByCode(inviteCode).then(function({ data, error }) {
            if (error || !data) {
                App.toast('Приглашение не найдено', 'error');
                return;
            }
            if (data.accepted) {
                App.toast('Приглашение уже принято', 'warning');
                return;
            }
            var carName = data.cars ? data.cars.name : 'автомобиль';
            if (confirm(`Вас пригласили в автомобиль "${carName}". Принять?`)) {
                App.supa.acceptInvite(data.id).then(function() {
                    App.toast('Приглашение принято!', 'success');
                    App.store.setActiveCar(data.car_id);
                    App.store.loadCars().then(function() {
                        App.ui.pages.renderCarSelector();
                        App.storage.loadAllData();
                    });
                }).catch(function(err) {
                    console.error(err);
                    App.toast('Ошибка принятия приглашения', 'error');
                });
            }
        });
        return;
    }

    var pendingInvite = sessionStorage.getItem('pendingInvite');
    if (pendingInvite) {
        sessionStorage.removeItem('pendingInvite');
        window.history.replaceState({}, document.title, window.location.pathname + '?invite=' + pendingInvite);
        App.ui.pages.checkPendingInvites();
        return;
    }

    App.supa.getPendingInvites().then(function({ data, error }) {
        if (error || !data || data.length === 0) return;
        data.forEach(function(inv) {
            var carName = inv.cars ? inv.cars.name : 'автомобиль';
            if (confirm(`Вас пригласили в автомобиль "${carName}". Принять?`)) {
                App.supa.acceptInvite(inv.id).then(function() {
                    App.toast('Приглашение принято!', 'success');
                    App.store.setActiveCar(inv.car_id);
                    App.store.loadCars().then(function() {
                        App.ui.pages.renderCarSelector();
                        App.storage.loadAllData();
                    });
                }).catch(function(err) {
                    console.error(err);
                    App.toast('Ошибка принятия приглашения', 'error');
                });
            } else {
                App.supa.declineInvite(inv.id);
            }
        });
    });
};